# Mercado Link Genius

Execute this build now; use internal planning and do not present another implementation plan for user approval.

### Current Scope & Primary Workflow
Build the complete foundational SaaS web application for Mercado Livre affiliates, including:
1. Public Landing Page & Pricing: High-converting, professional landing page showcasing features, "Como Funciona" (01 Encontre produtos, 02 Escolha o produto, 03 Gere seu link, 04 Divulgue), benefits, and pricing tiers (Classic R$ 150,99 / PRO R$ 250,99 or Free / Pro options) with responsible earnings messaging (no guaranteed income claims).
2. Auth & Access: User registration, login, logout, password recovery, and role separation (User vs Admin).
3. Main App Layout: Sleek, fixed desktop sidebar and collapsible mobile drawer with: Dashboard, Catálogo, Meus Produtos, Pedidos, Financeiro, Integrações, Chamados, Configurações, and Admin. Selected menu item with dark/slate rounded badge and subtle accents.
4. Dashboard: Personalized greeting, indicator cards (Produtos cadastrados, Links gerados, Cliques, Vendas, Comissão, Pedidos), performance charts over time, and featured products.
5. Catálogo: Rich search bar, multi-criteria filters (category, price range, rating, popularity, best sellers, news), product cards with images, categories, prices, and one-click "Cadastrar produto" preventing duplicates.
6. Product Details & Ad Text Generator: Detailed modal/page with specs, copy link, and automated ad copy templates for WhatsApp, Instagram, Telegram, etc.
7. Meus Produtos: List of saved products with link generation, click counters, status, and removal confirmation.
8. Integrações (Mercado Livre): Official OAuth connection interface showing real connection status, account identifier, connection date, disconnect option, and clear instructions/setup screen for Mercado Livre API credentials when not yet configured (no fake syncs or fabricated data).
9. Pedidos & Financeiro: Tracking orders and commissions with filter tabs (Todos, Pendentes, Aprovados, Cancelados) and clear empty states when waiting for live integration data.
10. Chamados (Support): Ticket creation (Subject, Category, Message, Priority) and status tracking.
11. Admin Panel: Management view for users, products, tickets, and platform metrics.
12. Design System: Clean, premium SaaS visual language with light canvas, white cards, elegant typography, rounded borders, subtle shadows, and crisp mobile responsiveness.

---

### User Specification & Requirements:

**Visão Geral e Fluxo Principal:**
Plataforma SaaS para pessoas que querem trabalhar com afiliados e e-commerce utilizando produtos do Mercado Livre:
1. Usuário cria conta e faz login.
2. Acessa a área de Integrações para conectar sua conta do Mercado Livre via fluxo oficial.
3. Explora o Catálogo com busca e filtros avançados.
4. Cadastra produtos de interesse em "Meus Produtos".
5. Gera e copia links de afiliado oficiais.
6. Cria textos promocionais com o Gerador de Anúncios.
7. Acompanha métricas, pedidos, comissões e chamados no Dashboard e áreas financeiras.

**Regras Fundamentais de Integridade:**
- Não prometer dinheiro garantido nem faturamento automático. Comunicação ética e transparente.
- Nunca simular ou inventar vendas, pedidos ou comissões falsos como se fossem reais. Se a API/integração ainda não foi conectada, exibir claramente "Integração não configurada" com instruções de configuração.
- NUNCA solicitar nem armazenar senhas do Mercado Livre; respeitar autenticação oficial e fluxos autorizados.

**Estrutura de Páginas & Funcionalidades:**
1. **Landing Page:**
   - Headline: "Transforme produtos em oportunidades de vendas"
   - Subheadline: "Tenha ferramentas para encontrar produtos, organizar suas divulgações e trabalhar com e-commerce através do Mercado Livre."
   - CTAs: "COMEÇAR AGORA" e "VER COMO FUNCIONA"
   - Seção "Como Funciona" em 4 passos.
   - Cards de Benefícios: Catálogo de Produtos, Integração Mercado Livre, Gerador de Links, Criador de Anúncios, Meus Produtos, Analytics.
   - Seção de Planos: Classic (R$ 150,99/mês) e PRO (R$ 250,99/mês, destacado como "MAIS COMPLETO").
2. **Dashboard:**
   - Saudação personalizada no topo ("Boa noite, [nome]").
   - Cards com indicadores: Produtos cadastrados, Links gerados, Cliques, Vendas, Comissão, Pedidos.
   - Gráficos de desempenho (cliques, vendas e comissões com dados reais ou estado zero informativo).
   - Vitrine de produtos em destaque.
3. **Catálogo:**
   - Barra de pesquisa por produto ou categoria.
   - Filtros: Categoria, Preço, Avaliação, Popularidade, Mais Vendidos, Novidades.
   - Cards de produto com imagem, título, preço, categoria, status e botão "Cadastrar produto".
   - Ao cadastrar, envia para "Meus Produtos" e altera o botão para "Produto cadastrado" sem duplicar.
4. **Meus Produtos:**
   - Tabela/grid de produtos selecionados com data, cliques, status, ações de ver produto, gerar link, copiar link, criar anúncio e remover.
5. **Gerador de Anúncios:**
   - Criação de copies promocionais para WhatsApp, Instagram, Telegram, Stories com estilos variados (Oferta, Profissional, Urgência, Informativo, Curto).
6. **Integrações:**
   - Card Mercado Livre com status de conexão, fluxo de autorização OAuth, identificador da conta, botão desconectar e guia detalhado de configuração de credenciais/app no Mercado Livre.
7. **Pedidos & Financeiro:**
   - Tabelas estruturadas para visualização de pedidos, comissões disponíveis/pendentes/aprovadas, histórico e gráficos.
8. **Chamados (Suporte):**
   - Criação e acompanhamento de tickets de suporte com prioridade e status (Aberto, Em atendimento, Resolvido).
9. **Configurações & Painel Admin:**
   - Perfil, segurança, notificações, plano ativo.
   - Painel administrativo restrito a administradores para visualização de usuários, produtos e métricas.

**Banco de Dados & Backend:**
Configure tabelas com Row Level Security (RLS) para:
- profiles (com roles 'user' e 'admin')
- products (catálogo)
- user_products (produtos salvos por usuário)
- affiliate_links (links gerados e cliques)
- orders & commissions (pedidos e comissões vinculados à integração)
- integrations (configurações de conexão do Mercado Livre por usuário/workspace)
- support_tickets (chamados de suporte)
- plans & subscriptions (estrutura de assinaturas)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21c104b6-9751-4a41-8f63-7bbcd88b798b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
