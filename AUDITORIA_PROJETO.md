# Auditoria do projeto

Atualizada em 27/11/2026 · branch `migracao/independencia-lovable` (inclui as correções de `fix/seguranca-roteamento-meli`).

Legenda de status: **FUNCIONANDO E TESTADO** · **IMPLEMENTADO, AGUARDANDO API** · **IMPLEMENTADO, AGUARDANDO TESTE REAL** · **PENDENTE** · **BLOQUEADO**

## 0. Aviso principal

O site publicado (`mercadoecommerce02.shop`) tem conteúdo que **não existe neste repositório**: vídeo, imagens hospedadas em `r2.dev` e o texto "12x de R$ 31,00". O projeto na Lovable foi editado depois do último envio ao GitHub (21/09/2026). Este repositório é a base de trabalho por decisão do dono. **Antes de publicar este código no domínio, essas diferenças precisam ser trazidas para cá ou descartadas conscientemente.**

## 1. Tecnologias

React 19, TanStack Start/Router, Vite 8, Tailwind 4, shadcn/ui, TanStack Query, Recharts, Zod, Supabase JS; build nitro → Cloudflare Worker; Supabase (Lovable Cloud) com Postgres + RLS + Edge Functions (Deno). Detalhes e pastas: `CLAUDE.md`.

## 2. Arquitetura

```
Navegador ──(SSR + RPC)──> Cloudflare Worker (TanStack Start)
                               ├─ server functions: meli.functions.ts, config.functions.ts
                               ├─ rota /api/meli/callback (OAuth)
                               └─> Supabase (service role) ── tokens, catálogo, cotas
Navegador ──(supabase-js + JWT, RLS)──> Supabase (dados do próprio usuário)
Admin ──> Edge Function create-admin-user (exige JWT de admin)
```

## 3–5. Funcionalidades

| Módulo | Status | Observação |
|---|---|---|
| Landing / página de vendas | FUNCIONANDO E TESTADO (build) | Links "Começar agora" corrigidos. Divergente do site publicado (§0) |
| Cadastro, login, logout, recuperação de senha | IMPLEMENTADO, AGUARDANDO TESTE REAL | Supabase Auth; não testado ponta a ponta nesta sessão |
| Login com Google | IMPLEMENTADO, AGUARDANDO TESTE REAL | Via Lovable Cloud; opção pronta para Supabase próprio |
| Controle de acesso por assinatura | FUNCIONANDO E TESTADO (RLS) | Guard de rota + RLS; conta desativada bloqueada |
| Planos / checkout | IMPLEMENTADO, AGUARDANDO API | Botões levam ao checkout (`VITE_CHECKOUT_URL_*`); ativação manual pelo admin |
| Webhook de pagamento (Applyfy) | BLOQUEADO | Sem documentação oficial do webhook |
| Painel admin: usuários, planos, ativar/desativar | FUNCIONANDO E TESTADO (RLS) | Expiração calculada no banco; auditoria automática |
| Admin: responder chamados | IMPLEMENTADO, AGUARDANDO TESTE REAL | Novo nesta etapa |
| Admin: status das integrações | IMPLEMENTADO, AGUARDANDO TESTE REAL | Só nomes de variáveis, nunca valores |
| Chamados (usuário) | IMPLEMENTADO, AGUARDANDO TESTE REAL | Sem envio de imagens (PENDENTE) |
| Mercado Livre: OAuth, renovação, desconexão | IMPLEMENTADO, AGUARDANDO API | Precisa de `MELI_*` e do redirect no app do ML |
| Mercado Livre: busca e "salvar produto" | IMPLEMENTADO, AGUARDANDO API | A busca pública pode ser negada (403) pelo ML |
| Mercado Livre: publicar, editar, preço/estoque, pedidos, visitas | PENDENTE | Não existe código |
| "Links de afiliado" | FUNCIONANDO (parcial) | Guarda o link público do anúncio; **sem comissão rastreada** |
| Gerador de anúncios | FUNCIONANDO | Modelos de texto fixos, sem IA e sem custo |
| Dashboard | FUNCIONANDO (dados reais ou vazios) | Pedidos/comissões ficam vazios: nada popula essas tabelas |
| Pedidos / Financeiro | PENDENTE (só interface) | Mostram "Integração não configurada" (correto, sem dado fictício) |
| Catálogo de fornecedores (CJ, nacionais) | PENDENTE (estrutura pronta) | Tabelas + interface `SupplierAdapter`; nenhum adaptador |
| Limites por plano (publicações, IA, contas) | IMPLEMENTADO, AGUARDANDO TESTE REAL | `consume_quota` testado; nenhum limite definido (decisão comercial) |
| Shopee Afiliados | PENDENTE | Não existe |
| IA paga (vídeo/imagem) | Não existe | Nada a preservar |

## 6. Bugs encontrados e corrigidos

Na etapa de segunda (23/11), branch `fix/seguranca-roteamento-meli`:

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| 1 | Crítica | Edge Function pública criava um admin com senha fixa conhecida | Exige JWT de admin |
| 2 | Crítica | Edge Function pública entregava sessão com plano Lifetime | Desativada (410) |
| 3 | Crítica | Botões de plano ativavam o plano **sem pagamento** | Levam ao checkout |
| 4 | Crítica | RLS permitia ao usuário gravar/alterar a própria assinatura | Só admin/servidor |
| 5 | Alta | Usuário se reativava depois de desativado pelo admin | Trigger protege campos |
| 6 | Alta | Usuário respondia o próprio chamado como "Suporte" | Update só admin |
| 7 | Alta | Usuário forjava "conta ML conectada" | Escrita só pelo servidor |
| 8 | Alta | Client secret e token do ML iriam para o navegador (`VITE_*`) | OAuth no servidor |
| 9 | Alta | `router.tsx` reescrito sem componentes: páginas em branco | Restaurado |
| 10 | Alta | OAuth ML sem callback, sem `state` e com URL de token errada | Fluxo completo no servidor |
| 11 | Alta | Host de API inexistente (`api.mercadolivre.com.br`) | `api.mercadolibre.com` |
| 12 | Média | Salvar/adicionar produto sempre falhava (RLS) | Servidor salva a partir da API oficial |
| 13 | Média | "Gerar link" gravava ID `MLB…` em coluna UUID | Corrigido |
| 14 | Média | "Publicar no ML" sem ação | Mensagem honesta |
| 15 | Média | Plano mensal pelo admin = 365 dias; erros mostrados como sucesso | `admin_set_plan` (30 dias), erros propagados |
| 16–19 | Baixa/média | "Novo usuário" ignorava o formulário; desativar não bloqueava; erro de rede liberava painel; colisão de cache | Corrigidos |

Nesta etapa (27/11), branch `migracao/independencia-lovable`:

| # | Problema | Correção |
|---|---|---|
| 20 | Links "Começar agora" (`<Link to="#planos">`) navegavam para uma rota inexistente | `<a href="#planos">` |
| 21 | 11 erros de TypeScript e 1 de lint reais; 964 problemas de formatação | 0 erros (CI reprova regressões) |
| 22 | Admin não tinha como responder chamados | Diálogo de resposta + status |
| 23 | Usuário podia abrir chamado já com "resposta do suporte" preenchida | Trigger limpa no insert |
| 24 | Vercel falhava em todo commit | Não é bug do código: a saída é para Cloudflare. Desconectar a Vercel |

## 7. Segurança

**Corrigido:** itens 1–8, 23. Isolamento entre usuários verificado em 24 testes automatizados (`tests/db`).

**Ações manuais necessárias:**
1. **Trocar a senha (ou remover o papel de admin) da conta criada pela função antiga.** A senha está no histórico público do Git.
2. Revisar assinaturas ativas no admin: qualquer pessoa pode ter ativado Lifetime de graça antes da correção (itens 2–4).
3. Tornar o repositório **privado** (hoje é público).
4. Se algum `VITE_MELI_*` com segredo já foi configurado, revogar e gerar outro no ML.

**Pendências de segurança:** tokens do ML sem criptografia em repouso (protegidos por RLS; criptografar com Vault/pgsodium); sem rate limiting próprio nas server functions (depende da Cloudflare); cabeçalhos de segurança (CSP) não configurados; validação de upload inexistente porque não há upload.

## 8. Dependências da Lovable

Tabela completa em `CLAUDE.md`. Resumo: **essencial hoje** = Lovable Cloud (banco, auth, functions, secrets). **Precisa trocar ao migrar** = login Google via `@lovable.dev/cloud-auth-js` (opção pronta). **Mantida, funciona fora da Lovable** = `@lovable.dev/vite-tanstack-config` (pacote npm de build; o CI compila sem a Lovable). **Inofensivas** = arquivos que só agem dentro do editor.

## 9. Serviços externos

Supabase/Lovable Cloud (em uso) · Mercado Livre API (código pronto, sem credenciais) · Applyfy (só links de checkout) · GitHub Actions (CI, gratuito em repositório público) · Vercel (conectada, sem uso real).

## 10. Estratégia de migração

Cloudflare Workers (hospedagem) + Supabase próprio (banco). Justificativa e custos: `DEPLOY.md`. Banco: `MIGRACAO_BANCO.md`. A Lovable deixa de ser necessária para **desenvolver** a partir de agora (o código evolui pelo GitHub + CI). Ela só continua necessária para **hospedar** até a troca autorizada.

## 11. Riscos

1. **Divergência entre o site publicado e o repositório** (§0): publicar este código apagaria do site as mudanças que só existem na Lovable.
2. Senhas dos usuários: se a exportação do Lovable Cloud não incluir `auth.users`, todos precisarão redefinir a senha.
3. Limite de CPU de 10 ms no plano gratuito da Cloudflare (erro 1102): o plano de US$ 5 resolve.
4. Supabase Free pausa após 7 dias sem uso: inadequado para produção.
5. Editar ao mesmo tempo na Lovable e pelo GitHub gera conflitos. Escolha um caminho só.

## 12. Plano por etapas

| Etapa | Status |
|---|---|
| 1 Auditoria | Feita (este documento) |
| 2 Preservação: branches, checkpoint, rollback | Feita (branches separadas; nada na `main`; planos de volta em `DEPLOY.md`/`MIGRACAO_BANCO.md`) |
| 3 Estabilização: build, tipos, lint | Feita (CI verde) |
| 4 Independência | Feita no código; migração do banco/hospedagem preparada, aguardando autorização |
| 5 Banco | Estrutura de fornecedores/limites/uso criada e testada |
| 6 Autenticação | Regras testadas no banco; teste real de login pendente |
| 7 Catálogos | Estrutura pronta; aguardando CJ/fornecedores |
| 8 Mercado Livre | OAuth/busca prontos; publicação pendente |
| 9 Pagamentos | Bloqueado (webhook Applyfy) |
| 10 Dashboard/admin | Admin ampliado (chamados, integrações) |
| 11 Economia | `api_usage_log`, cache compartilhado (tabelas), cotas idempotentes |
| 12 Segurança | Itens críticos corrigidos; pendências no §7 |
| 13 Testes | CI: build, tipos, lint, 24 testes de banco |
| 14 Documentação | Feita |
| 15 Hospedagem | Preparada; deploy real pendente de conta Cloudflare + autorização |

## Testes executados (com evidência)

| Teste | Onde | Resultado |
|---|---|---|
| Install + build de produção | GitHub Actions | Aprovado |
| TypeScript (`tsc --noEmit`) | GitHub Actions | Aprovado (0 erros) |
| Lint (eslint + prettier) | GitHub Actions | Aprovado (0 erros, 8 avisos) |
| Migrations aplicadas do zero + reaplicação | GitHub Actions + Postgres local | Aprovado |
| 18 testes de permissão (RLS) | GitHub Actions + Postgres local | Aprovado |
| 6 testes de cota (limite diário, idempotência) | GitHub Actions + Postgres local | Aprovado |
| Login, OAuth ML, navegador, celular | Não executados | **Pendente:** exige ambiente publicado e credenciais |
