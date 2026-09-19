
-- Roles
CREATE TYPE public.app_role AS ENUM ('user','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlight boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.plans (slug, name, price_cents, description, features, highlight, sort_order) VALUES
('classic','Classic',15099,'Para quem está começando a organizar suas divulgações.',
 '["Catálogo de produtos","Até 50 produtos cadastrados","Gerador de links de afiliado","Gerador de anúncios básico","Suporte por chamados"]'::jsonb,false,1),
('pro','PRO',25099,'Para quem quer escalar a operação com mais ferramentas.',
 '["Tudo do Classic","Produtos cadastrados ilimitados","Gerador de anúncios completo","Analytics avançado de cliques","Pedidos e financeiro detalhados","Suporte prioritário"]'::jsonb,true,2);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subs_insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "subs_update" ON public.subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Catalog
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Geral',
  price numeric(12,2) NOT NULL DEFAULT 0,
  original_price numeric(12,2),
  image_url text,
  permalink text,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  sold_quantity integer NOT NULL DEFAULT 0,
  free_shipping boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'demo',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_products TO authenticated;
GRANT ALL ON public.user_products TO service_role;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_products_select" ON public.user_products FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_products_cud" ON public.user_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  short_code text UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_select" ON public.affiliate_links FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "links_cud" ON public.affiliate_links FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Integrations
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercado_livre',
  status text NOT NULL DEFAULT 'disconnected',
  account_identifier text,
  connected_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_select" ON public.integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "integrations_cud" ON public.integrations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Orders and commissions (populated only by real integration data)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_order_id text,
  product_title text,
  buyer_reference text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  ordered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  available_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions_select" ON public.commissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'Geral',
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'aberto',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tickets_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Demo catalog seed (clearly flagged as demo via source column)
INSERT INTO public.products (external_id,title,category,price,original_price,image_url,permalink,rating,reviews_count,sold_quantity,free_shipping,is_new,source,description) VALUES
('demo-1','Fone de Ouvido Bluetooth com Cancelamento de Ruído','Eletrônicos',349.90,499.90,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600','https://www.mercadolivre.com.br',4.7,1820,5400,true,true,'demo','Fone over-ear com bateria de longa duração e cancelamento ativo de ruído.'),
('demo-2','Smartwatch Fitness com GPS Integrado','Eletrônicos',599.00,799.00,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600','https://www.mercadolivre.com.br',4.5,940,2100,true,true,'demo','Relógio inteligente com monitor cardíaco, GPS e resistência à água.'),
('demo-3','Cafeteira Elétrica 30 Xícaras Inox','Casa e Cozinha',219.90,289.90,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600','https://www.mercadolivre.com.br',4.6,610,3300,false,false,'demo','Cafeteira com jarra de vidro, sistema corta-pingos e base aquecida.'),
('demo-4','Tênis Esportivo Masculino Corrida','Moda',259.90,329.90,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600','https://www.mercadolivre.com.br',4.4,2400,8900,true,false,'demo','Tênis leve com amortecimento em EVA e solado antiderrapante.'),
('demo-5','Mochila para Notebook 17" Resistente à Água','Acessórios',159.90,199.90,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600','https://www.mercadolivre.com.br',4.8,780,4100,true,false,'demo','Mochila com compartimento acolchoado, porta USB e tecido impermeável.'),
('demo-6','Teclado Mecânico Gamer RGB ABNT2','Informática',279.00,399.00,'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600','https://www.mercadolivre.com.br',4.6,1320,2700,true,true,'demo','Teclado mecânico com switches azuis, iluminação RGB e anti-ghosting.'),
('demo-7','Air Fryer Digital 5L Antiaderente','Casa e Cozinha',429.90,549.90,'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600','https://www.mercadolivre.com.br',4.7,3100,12000,true,false,'demo','Fritadeira sem óleo com painel digital e cesto antiaderente removível.'),
('demo-8','Kit Skincare Facial Hidratante','Beleza',129.90,169.90,'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600','https://www.mercadolivre.com.br',4.3,450,1600,false,true,'demo','Kit com sabonete facial, sérum e hidratante para todos os tipos de pele.'),
('demo-9','Cadeira de Escritório Ergonômica','Casa e Escritório',899.00,1199.00,'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600','https://www.mercadolivre.com.br',4.5,520,890,false,false,'demo','Cadeira com apoio lombar ajustável, braços 3D e encosto em tela.'),
('demo-10','Caixa de Som Bluetooth à Prova d''Água','Eletrônicos',189.90,249.90,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600','https://www.mercadolivre.com.br',4.6,2050,7400,true,false,'demo','Speaker portátil com 12h de bateria e certificação IPX7.'),
('demo-11','Conjunto de Panelas Antiaderente 5 Peças','Casa e Cozinha',299.90,389.90,'https://images.unsplash.com/photo-1584990347449-a2d4c2c9ed0b?w=600','https://www.mercadolivre.com.br',4.4,860,2300,true,false,'demo','Jogo de panelas com revestimento cerâmico e cabos anti-térmicos.'),
('demo-12','Monitor 24" Full HD 75Hz IPS','Informática',749.00,949.00,'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600','https://www.mercadolivre.com.br',4.7,1140,1900,true,true,'demo','Monitor IPS com bordas finas, 75Hz e entradas HDMI/VGA.');
