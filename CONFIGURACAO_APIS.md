# Configuração das APIs

Nomes de variáveis: `.env.example`. Onde configurar:
- **Hoje (Lovable Cloud):** Lovable → projeto → Cloud → Secrets (servidor) e variáveis do projeto (`VITE_*`).
- **Depois da migração (Cloudflare + Supabase próprio):** `DEPLOY.md` (secrets do Worker com `wrangler secret put` e variáveis `VITE_*` no build).

O painel **Admin → Integrações** mostra o que está configurado (só nomes, nunca valores).

Legenda: ✅ implementado · 🟡 implementado, aguardando credencial/teste real · ⛔ não implementado

---

## 1. Supabase (banco + autenticação) ✅

| | |
|---|---|
| Finalidade | Banco Postgres, login, RLS, Edge Functions |
| Variáveis | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Onde obter | Lovable Cloud: já configurado. Supabase próprio: Dashboard → Project Settings → API |
| Segurança | `SUPABASE_SERVICE_ROLE_KEY` ignora RLS: **só servidor**, nunca em `VITE_*` nem no Git |
| Custo | Supabase Free: 500 MB de banco por projeto; projetos pausam após 1 semana sem atividade. Para produção com clientes pagantes, considere o Pro (sem pausa, com backups) |
| Teste | Login/cadastro na aplicação; `tests/db` (permissões) roda no CI |

## 2. Mercado Livre 🟡

| | |
|---|---|
| Finalidade | Conectar conta do vendedor (OAuth), buscar anúncios, salvar produto no catálogo |
| Variáveis (servidor) | `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_REDIRECT_URI` |
| Onde obter | https://developers.mercadolivre.com.br → Minhas aplicações → criar app |
| Redirect URI | `https://mercadoecommerce02.shop/api/meli/callback` (precisa ser **idêntica** no app do ML e em `MELI_REDIRECT_URI`) |
| Escopos | leitura e escrita (`read`, `write`; `offline_access` para o refresh token) |
| Docs | https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao |
| Teste | Integrações → Conectar → autorizar → voltar com "Conta conectada". Depois Catálogo → buscar. Se a busca vier com 403, o ML não liberou esse recurso para o app |
| Custo | Gratuito |
| Segurança | Tokens ficam em `meli_tokens` (sem acesso pelo navegador). Refresh token é de uso único: o código já substitui a cada renovação |
| Falta | Publicação/edição de anúncios, pedidos, preço/estoque, visitas |

## 3. Checkout (links de pagamento) 🟡

| | |
|---|---|
| Variáveis (públicas) | `VITE_CHECKOUT_URL_MONTHLY`, `VITE_CHECKOUT_URL_LIFETIME` |
| Onde obter | Na plataforma de pagamento (Applyfy), link de cada produto |
| Retorno pós-compra | Configure na plataforma: `https://mercadoecommerce02.shop/auth?mode=signup` |
| Sem configurar | Botões mostram "Pagamento ainda não configurado" |

## 4. Applyfy: webhook de pagamento ⛔

Não implementado: não encontrei documentação pública do formato do evento nem de como validar a assinatura. **Para implementar, envie:** a documentação oficial do webhook (eventos de aprovado, pendente, recusado, reembolso, cancelamento, chargeback), o método de assinatura (cabeçalho/HMAC) e um exemplo de payload de teste (sandbox).

Já preparado: `admin_set_plan` (ativação com expiração pelo servidor), `admin_audit_log`. Variável reservada: `APPLYFY_WEBHOOK_SECRET`.

## 5. CJdropshipping ⛔

Não existe no código. Já preparado: tabelas `suppliers`, `supplier_products`, `supplier_product_variants` e a interface `SupplierAdapter`. **Para implementar, envie:** as credenciais da conta CJ (API) e confirme o plano/termos de uso do catálogo (se permitem cache compartilhado). Docs: https://developers.cjdropshipping.com (verificar a versão atual antes de codificar).

## 6. Fornecedores nacionais (Dropify, DSLite, Hubiss, Dimona, Laquila, Vavi…) ⛔

Nenhum integrado. Para cada um, antes de codificar: confirmar se há **API oficial**, documentação, autorização comercial e se aceita etiquetas do Mercado Envios. Sem API oficial, não há integração automática (não usamos scraping).

## 7. Shopee Afiliados ⛔

Não existe no código. Requer aprovação no programa de afiliados com acesso à API oficial. Não pedir nem guardar senha da conta Shopee.

## 8. Login com Google ✅

Hoje funciona via Lovable Cloud (`@lovable.dev/cloud-auth-js`). Depois da migração: ative o provedor Google no Supabase (Authentication → Providers → Google, com Client ID/Secret do Google Cloud Console e o redirect do Supabase) e defina `VITE_GOOGLE_AUTH_VIA_SUPABASE=true`.

## 9. IA (vídeos, imagens, textos) ⛔

O projeto **não tem** integração com IA paga. O "Gerador de anúncios" usa modelos de texto fixos, sem API. Nenhuma chave necessária.
