INSERT INTO public.plans (slug, name, price_cents, description, features, highlight, sort_order) VALUES
  ('lifetime', 'Lifetime', 25599, 'Acesso vitalício. Pagamento único, sem mensalidade.',
   '["Tudo do plano Classic","Acesso vitalício — sem expiração","Produtos cadastrados ilimitados","Gerador de anúncios completo","Analytics avançado","Pedidos e financeiro detalhados","Suporte prioritário"]'::jsonb,
   true, 3)
ON CONFLICT (slug) DO NOTHING;