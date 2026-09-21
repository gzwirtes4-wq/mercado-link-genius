-- Create lifetime plan if not exists
INSERT INTO plans (id, name, slug, description, price_cents, features, highlight, sort_order)
VALUES (
  gen_random_uuid(),
  'Lifetime',
  'lifetime',
  'Acesso vitalício — pagamento único',
  25599,
  '["Catálogo completo de produtos", "Pesquisa e filtros avançados", "Produtos ilimitados", "Gerador de links de afiliado", "Criador de anúncios", "Dashboard com métricas", "Pedidos e financeiro", "Suporte prioritário"]'::jsonb,
  true,
  2
)
ON CONFLICT (slug) DO NOTHING;

-- Create admin role assignment for ryan123@gmail.com (user created by edge function)
-- This will be populated when the edge function creates the user