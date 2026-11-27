# CLAUDE.md: memória técnica do projeto

Leia este arquivo inteiro antes de mexer no código. Depois veja `PENDENCIAS.md`.

## O que é

**Mercado Ecommerce** (domínio `mercadoecommerce02.shop`): SaaS para vendedores do Mercado Livre encontrarem produtos, conectarem a conta do ML e (objetivo) publicarem produtos de fornecedores sem estoque próprio.

**Estado real hoje:** é um painel de produtos e links do Mercado Livre. Ainda **não há** catálogo de fornecedores (CJ, nacionais), publicação de anúncios, pedidos, webhook de pagamento nem Shopee. A estrutura de banco para fornecedores e limites já existe (ver abaixo). A especificação original da Lovable está em `docs/ESPECIFICACAO_ORIGINAL_LOVABLE.md`.

> ⚠️ O site publicado tem conteúdo (vídeo, imagens em `r2.dev`, parcelamento "12x") que **não está neste repositório**. O projeto na Lovable divergiu do GitHub. Antes de publicar este código no domínio, confirme com o dono o que deve ser mantido.

## Stack

| Camada | Tecnologia |
|---|---|
| Front/SSR | React 19 + TanStack Start/Router 1.16x–1.17x, Vite 8, Tailwind 4, shadcn/ui (Radix) |
| Server functions | `createServerFn` (TanStack Start), executam no Worker |
| Build/saída | `@lovable.dev/vite-tanstack-config` → nitro → **Cloudflare Worker** (`.output/`) |
| Banco/Auth | Supabase (hoje: **Lovable Cloud**), Postgres + RLS |
| Edge Functions | `supabase/functions/*` (Deno) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

Gerenciador de pacotes: **bun** (`bun.lock`). `bunfig.toml` bloqueia versões com menos de 24 h (proteção da cadeia de suprimentos); não remova.

## Pastas

```
src/routes/            páginas (file-based). _authenticated/* exige login + assinatura
src/routes/api/        rotas só de servidor (ex.: api/meli/callback.ts = OAuth ML)
src/lib/*.functions.ts server functions (o browser recebe só o stub RPC)
src/lib/*.server.ts    SÓ servidor (tokens, service role). Nunca importar no topo
                       de arquivo usado pelo browser: use `await import()` dentro
                       do handler. O build reprova import de .server no cliente.
src/lib/suppliers/     interface padrão de fornecedor + registro (vazio)
src/integrations/      clientes Supabase e Lovable (gerados; editar com cuidado)
supabase/migrations/   migrations versionadas (só aditivas, nunca destrutivas)
supabase/functions/    Edge Functions
tests/db/              testes de RLS e cotas (Postgres + stub do Supabase)
```

## Comandos

```bash
bun install
bun run dev            # desenvolvimento
bun run build          # build de produção (gera .output/ para Cloudflare)
bunx tsc --noEmit      # tipos (CI reprova se houver erro)
bun run lint           # eslint + prettier (CI reprova se houver erro)
bun run format         # formata tudo
# testes de banco: ver tests/db/README.md
```

Sem acesso ao npm no ambiente? Faça push numa branch: o **CI** roda install, tipos, lint, build e os testes de banco, e o log pode ser lido com `gh api repos/<dono>/<repo>/actions/jobs/<id>/logs`.

## Regras de desenvolvimento (não negociáveis)

1. Branch nova para cada trabalho. **Nunca** push direto na `main` sem o dono autorizar: a `main` sincroniza com a Lovable e pode ir para produção.
2. Nunca reescrever histórico publicado (sem force push, rebase ou amend de commits já enviados).
3. Migrations **só aditivas** (`CREATE … IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`). Toda migration nova precisa passar em `tests/db` e ser idempotente.
4. Nada de dados fictícios apresentados como reais (vendas, estoque, comissões, avaliações). Sem dado → "Indisponível" / "Integração ainda não configurada".
5. Segredos só no servidor (sem prefixo `VITE_`). `VITE_*` vai para o navegador.
6. Não mudar preços, planos, links de checkout ou DNS sem autorização.
7. Não executar chamadas pagas de API em testes. Não criar serviços pagos.
8. Toda nova regra de acesso precisa de um caso em `tests/db/rls_test.sh`.

## Segurança e assinaturas (como funciona)

- **Planos**: `public.plans`. **Assinatura**: `public.subscriptions` (1 por usuário).
- O navegador **não grava** em `subscriptions` (RLS). Planos são ativados por admin (`rpc admin_set_plan(_target, _plan_slug)`: Lifetime = sem expiração, demais = 30 dias pelo relógio do banco) ou pelo servidor (service role).
- Acesso ao painel: `_authenticated/route.tsx` exige assinatura ativa e `profiles.is_active = true` (admins sempre entram).
- Campos administrativos de `profiles` (`is_active`, `validated_at`, `notes`, `email`) são protegidos por trigger.
- Toda mudança em `subscriptions` e `user_roles` vai para `admin_audit_log` (trigger).
- Admin = linha em `user_roles` com `role = 'admin'`; checagem no banco com `has_role()`.
- Edge Function `create-admin-user`: exige JWT de admin. `create-demo-user`: desativada (410).

## Limites de uso (centralizados)

- Colunas em `plans`: `daily_publish_limit`, `max_connected_accounts`, `max_saved_products`, `monthly_ai_credits`. **NULL = sem limite configurado.** Nenhum valor foi definido: é decisão comercial do dono (o prompt dele cita "5 publicações/dia" no plano mensal, mas isso não existe em lugar nenhum do código atual).
- Consumo: `consume_quota(user, metric, idempotency_key)`, **só service role**, idempotente (a mesma chave não conta duas vezes), com trava contra concorrência; "dia" = America/Sao_Paulo.

## Mercado Livre

- OAuth no servidor: `src/lib/meli.server.ts` (tokens em `meli_tokens`, sem acesso pelo cliente), `src/lib/meli.functions.ts` (status, iniciar, desconectar, busca, salvar produto), callback `/api/meli/callback` com `state` de uso único (tabela `meli_oauth_states`).
- API oficial: `https://api.mercadolibre.com`. Autorização BR: `https://auth.mercadolivre.com.br/authorization`.
- Busca `/sites/MLB/search` pode responder 403 para apps de terceiros: mostre o motivo, não contorne.
- **Publicação não existe ainda.** Ao implementar: validar atributos por categoria, confirmação do usuário, idempotência (chave por tentativa + `consume_quota`), registrar cada tentativa, só mostrar sucesso com a resposta do ML.

## Fornecedores e cache

- Tabelas: `suppliers` (origem `nacional`/`internacional`, `active`, `cache_ttl_minutes`, `max_requests_per_minute`), `supplier_products`, `supplier_product_variants`. Leitura para usuários logados (cache compartilhado e não pessoal); escrita só pelo servidor.
- Para integrar um fornecedor: implementar `SupplierAdapter` (`src/lib/suppliers/types.ts`) contra a **documentação oficial**, registrar em `registry.server.ts`, criar a linha em `suppliers` com `active = false` até testar. Não inventar endpoints.
- Registrar chamadas externas em `api_usage_log` (sem tokens nem dados pessoais).

## Dependências da Lovable que ainda existem

| Item | Necessário? | Observação |
|---|---|---|
| Lovable Cloud (banco, auth, edge functions, secrets) | **Sim, hoje** | Migração: `MIGRACAO_BANCO.md` |
| `@lovable.dev/vite-tanstack-config` | Sim (build) | Pacote npm; funciona fora da Lovable (CI comprova) |
| `@lovable.dev/cloud-auth-js` (login Google) | Enquanto estiver no Lovable Cloud | Com Supabase próprio: `VITE_GOOGLE_AUTH_VIA_SUPABASE=true` |
| `previewAuthStorage.ts`, `lovable-error-reporting.ts` | Não | Só agem dentro do editor da Lovable; inofensivos fora |
| `LOVABLE_CRON_SECRET` (`cron-auth.ts`) | Não usado hoje | Nenhuma rota usa cron |

## Documentos

`AUDITORIA_PROJETO.md` (estado, bugs, segurança, testes) · `CONFIGURACAO_APIS.md` · `MIGRACAO_BANCO.md` · `DEPLOY.md` · `PENDENCIAS.md` · `.env.example` · `tests/db/README.md`. Histórico de mudanças = `git log`.
