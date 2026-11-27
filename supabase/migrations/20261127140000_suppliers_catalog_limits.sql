-- ============================================================================
-- Suppliers, shared catalog cache, plan limits and API usage log.
-- Non-destructive: only new tables/columns. No existing row is changed.
--
-- * suppliers / supplier_products: one normalized catalog for every supplier
--   (CJ, national suppliers…). Readable by any logged-in user (it is a shared,
--   non-personal cache); written only by the server (service role).
-- * plans.*_limit: centralized limits. NULL = no limit configured. No value is
--   set here on purpose: commercial rules are decided by the owner.
-- * usage_events + consume_quota(): server-side, idempotent quota counter.
-- * api_usage_log: one row per external API call (cost / rate-limit tracking).
-- ============================================================================

-- ── Suppliers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_-]{2,40}$'),
  name text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('nacional', 'internacional')),
  website text,
  active boolean NOT NULL DEFAULT false,
  cache_ttl_minutes integer NOT NULL DEFAULT 360 CHECK (cache_ttl_minutes BETWEEN 5 AND 10080),
  max_requests_per_minute integer CHECK (max_requests_per_minute > 0),
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  sku text,
  title text NOT NULL,
  title_pt text,
  description text,
  description_pt text,
  category text,
  subcategory text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_price numeric(12, 2),
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  stock integer CHECK (stock >= 0),          -- NULL = supplier does not report stock
  weight_grams integer CHECK (weight_grams >= 0),
  dimensions_cm jsonb,                        -- {"l":..,"w":..,"h":..}
  ships_from text,
  ships_to_br boolean,                        -- NULL = unknown
  shipping_options jsonb,
  delivery_days_min integer,
  delivery_days_max integer,
  supplier_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unavailable', 'removed')),
  raw jsonb,                                  -- original payload, for re-normalization
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, external_id)
);

CREATE TABLE IF NOT EXISTS public.supplier_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  sku text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"cor":"azul","tamanho":"M"}
  cost_price numeric(12, 2),
  stock integer CHECK (stock >= 0),
  image text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, external_id)
);

CREATE INDEX IF NOT EXISTS supplier_products_supplier_status_idx
  ON public.supplier_products (supplier_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS supplier_products_category_idx
  ON public.supplier_products (category) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS supplier_products_title_search_idx
  ON public.supplier_products USING gin (to_tsvector('simple', coalesce(title_pt, title)));

GRANT SELECT ON public.suppliers, public.supplier_products, public.supplier_product_variants TO authenticated;
GRANT ALL ON public.suppliers, public.supplier_products, public.supplier_product_variants TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS supplier_products_read ON public.supplier_products;
CREATE POLICY supplier_products_read ON public.supplier_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND (s.active OR public.has_role(auth.uid(), 'admin'))));
DROP POLICY IF EXISTS supplier_variants_read ON public.supplier_product_variants;
CREATE POLICY supplier_variants_read ON public.supplier_product_variants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_products p JOIN public.suppliers s ON s.id = p.supplier_id
    WHERE p.id = product_id AND (s.active OR public.has_role(auth.uid(), 'admin'))
  ));

DROP TRIGGER IF EXISTS suppliers_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS supplier_products_updated_at ON public.supplier_products;
CREATE TRIGGER supplier_products_updated_at BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Centralized plan limits (NULL = no limit configured) ────────────────────
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS daily_publish_limit integer CHECK (daily_publish_limit >= 0);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_connected_accounts integer CHECK (max_connected_accounts >= 0);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_saved_products integer CHECK (max_saved_products >= 0);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS monthly_ai_credits integer CHECK (monthly_ai_credits >= 0);

-- ── Usage events + idempotent quota consumption ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('publish', 'ai_generation')),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric, idempotency_key)
);
CREATE INDEX IF NOT EXISTS usage_events_user_metric_day_idx
  ON public.usage_events (user_id, metric, created_at DESC);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
GRANT USAGE ON SEQUENCE public.usage_events_id_seq TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_events_own ON public.usage_events;
CREATE POLICY usage_events_own ON public.usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Consumes one unit of `_metric` for `_user` if the plan allows it.
-- Idempotent: the same `_key` (e.g. the publish attempt id) never counts twice,
-- so retries and double clicks do not burn quota. "Day" = America/Sao_Paulo.
-- Returns: {allowed, already_counted, used, limit}
-- Called only by the server (service role); not granted to browser roles.
CREATE OR REPLACE FUNCTION public.consume_quota(_user uuid, _metric text, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _limit integer;
  _used integer;
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF _metric NOT IN ('publish', 'ai_generation') THEN
    RAISE EXCEPTION 'Métrica desconhecida: %', _metric USING ERRCODE = '22023';
  END IF;

  -- serialize concurrent calls for the same user+metric
  PERFORM pg_advisory_xact_lock(hashtext(_user::text || ':' || _metric));

  IF EXISTS (SELECT 1 FROM public.usage_events
             WHERE user_id = _user AND metric = _metric AND idempotency_key = _key) THEN
    RETURN jsonb_build_object('allowed', true, 'already_counted', true);
  END IF;

  SELECT CASE _metric WHEN 'publish' THEN p.daily_publish_limit ELSE p.monthly_ai_credits END
    INTO _limit
  FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = _user AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'sem_assinatura_ativa');
  END IF;

  SELECT count(*) INTO _used FROM public.usage_events
  WHERE user_id = _user AND metric = _metric
    AND created_at >= CASE WHEN _metric = 'publish' THEN _day_start
                           ELSE date_trunc('month', now()) END;

  IF _limit IS NOT NULL AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limite_atingido', 'used', _used, 'limit', _limit);
  END IF;

  INSERT INTO public.usage_events (user_id, metric, idempotency_key) VALUES (_user, _metric, _key);
  RETURN jsonb_build_object('allowed', true, 'already_counted', false, 'used', _used + 1, 'limit', _limit);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_quota(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid, text, text) TO service_role;

-- ── External API usage log (no tokens, no personal data) ────────────────────
CREATE TABLE IF NOT EXISTS public.api_usage_log (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,          -- 'mercadolivre', 'cj', …
  operation text NOT NULL,         -- 'search', 'item', 'oauth_token', …
  status integer,                  -- HTTP status (NULL = network error)
  duration_ms integer,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cache_hit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_usage_log_provider_created_idx
  ON public.api_usage_log (provider, created_at DESC);
GRANT SELECT ON public.api_usage_log TO authenticated;
GRANT ALL ON public.api_usage_log TO service_role;
GRANT USAGE ON SEQUENCE public.api_usage_log_id_seq TO service_role;
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_usage_log_admin ON public.api_usage_log;
CREATE POLICY api_usage_log_admin ON public.api_usage_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
