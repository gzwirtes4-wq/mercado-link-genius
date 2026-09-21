ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS ml_user_id text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope text;

CREATE TABLE IF NOT EXISTS public.meli_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.meli_tokens TO service_role;
ALTER TABLE public.meli_tokens ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER meli_tokens_updated_at BEFORE UPDATE ON public.meli_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS subs_insert ON public.subscriptions;
CREATE POLICY subs_insert ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS subs_update ON public.subscriptions;
CREATE POLICY subs_update ON public.subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (true);

CREATE POLICY user_roles_admin_write ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));