-- ============================================================================
-- Security hardening (non-destructive: no tables, rows or accounts are dropped)
--
-- 1. Subscriptions can only be written by admins or the service role.
--    Before: any logged-in user could INSERT/UPDATE their own subscription
--    (and, via WITH CHECK (true), reassign it), activating Lifetime for free.
-- 2. Profiles: users keep editing name/phone/avatar, but cannot change
--    is_active / validated_at / notes / email (admin-only fields).
-- 3. Support tickets: only admins can update (status, admin_response).
-- 4. Integrations: rows are written only by the server (OAuth callback);
--    users can read their own row. Prevents faking "connected" status.
-- 5. OAuth state table for the server-side Mercado Livre flow.
-- 6. Admin audit log for subscription and role changes.
-- ============================================================================

-- ── 1. Subscriptions ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS subs_insert ON public.subscriptions;
DROP POLICY IF EXISTS subs_update ON public.subscriptions;

DROP POLICY IF EXISTS subs_insert_admin ON public.subscriptions;
CREATE POLICY subs_insert_admin ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS subs_update_admin ON public.subscriptions;
CREATE POLICY subs_update_admin ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 2. Profiles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- service_role / migrations run without auth.uid(); admins may change anything
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.validated_at IS DISTINCT FROM OLD.validated_at
     OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'Somente administradores podem alterar estes campos do perfil'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_admin_fields ON public.profiles;
CREATE TRIGGER profiles_protect_admin_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

-- ── 3. Support tickets ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS tickets_update ON public.support_tickets;
DROP POLICY IF EXISTS tickets_update_admin ON public.support_tickets;
CREATE POLICY tickets_update_admin ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 4. Integrations ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS integrations_cud ON public.integrations;
REVOKE INSERT, UPDATE, DELETE ON public.integrations FROM authenticated;

-- ── 5. OAuth state (server only, no policies = no client access) ────────────
CREATE TABLE IF NOT EXISTS public.meli_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.meli_oauth_states TO service_role;
ALTER TABLE public.meli_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS meli_oauth_states_created_idx ON public.meli_oauth_states (created_at);

-- ── 6. Admin audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  target_user_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin_read ON public.admin_audit_log;
CREATE POLICY audit_admin_read ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(
    (CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END) ->> 'user_id',
    (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END) ->> 'user_id'
  )::uuid;
  INSERT INTO public.admin_audit_log (actor_id, action, table_name, target_user_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    target,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL; -- AFTER trigger: return value is ignored
END;
$$;
REVOKE ALL ON FUNCTION public.log_admin_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subscriptions_audit ON public.subscriptions;
CREATE TRIGGER subscriptions_audit AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

DROP TRIGGER IF EXISTS user_roles_audit ON public.user_roles;
CREATE TRIGGER user_roles_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

-- ── Indexes for frequent lookups ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_user_ordered_idx ON public.orders (user_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS commissions_user_created_idx ON public.commissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_created_idx ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_products_user_created_idx ON public.user_products (user_id, created_at DESC);

-- ── 7. Plan assignment with server-side expiry ──────────────────────────────
-- Expiry is computed by the database clock (never by the browser).
-- lifetime → no expiry; any other plan → 30 days from now.
CREATE OR REPLACE FUNCTION public.admin_set_plan(_target uuid, _plan_slug text)
RETURNS public.subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan public.plans;
  _sub public.subscriptions;
BEGIN
  -- auth.uid() is NULL only for the service role (anon has no EXECUTE grant)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar planos' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _plan FROM public.plans WHERE slug = _plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano % não existe', _plan_slug USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end)
  VALUES (
    _target, _plan.id, 'active',
    CASE WHEN _plan.slug = 'lifetime' THEN NULL ELSE now() + interval '30 days' END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now()
  RETURNING * INTO _sub;

  RETURN _sub;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_plan(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, text) TO authenticated, service_role;
