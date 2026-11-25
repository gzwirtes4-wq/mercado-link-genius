# Auditoria técnica: mercado-link-genius (novembro de 2026)

Branch: `fix/seguranca-roteamento-meli`. Nada foi enviado para a `main`, que é a branch sincronizada com o Lovable.

Legenda: **[testado]** = executado e verificado aqui · **[revisado]** = código conferido, mas não executado (sem dependências instaladas) · **[pendente]** = depende de credencial, documentação ou decisão.

## 0. O que este repositório é (e o que não é)

É um painel de **produtos e links do Mercado Livre** (TanStack Start + React 19 + Lovable Cloud/Supabase). Ele **não contém** nenhuma integração com CJdropshipping, Dimona, Hubiss, Shopee, Applyfy, pedidos de fornecedor, publicação de anúncios ou ferramentas de IA. A seção "Fornecedores" de `produtos-divulgar` lista *vendedores do próprio Mercado Livre*, não fornecedores de dropshipping. Esses módulos precisam ser construídos; não havia nada para corrigir neles.

## 1–2. Bugs encontrados e corrigidos

| # | Severidade | Problema | Correção | Arquivos |
|---|---|---|---|---|
| 1 | **Crítica** | A Edge Function `create-admin-user` era pública e criava/atualizava um **admin com senha fixa conhecida**, com plano Lifetime, para qualquer pessoa que a chamasse | Agora exige JWT de um admin, usa os dados enviados, valida e-mail e senha (mínimo de 8 caracteres) e registra em auditoria | `supabase/functions/create-admin-user/index.ts` |
| 2 | **Crítica** | A Edge Function `create-demo-user` era pública: apagava e recriava uma conta com Lifetime e **devolvia uma sessão logada** | Desativada (responde 410). Mantida como stub para sobrescrever a versão publicada | `supabase/functions/create-demo-user/index.ts`, `src/routes/auth.tsx` |
| 3 | **Crítica** | Os botões "COMPRAR LIFETIME" e "ASSINAR AGORA" **ativavam o plano sem pagamento** (gravação direta em `subscriptions` pelo navegador, com data calculada no navegador) | Os botões levam ao checkout (`VITE_CHECKOUT_URL_*`). O RLS agora só deixa admin/servidor gravar assinaturas | `src/routes/auth.tsx`, migration |
| 4 | **Crítica** | RLS: o usuário podia inserir ou alterar a própria assinatura (`WITH CHECK (true)` permitia até trocar o `user_id`) | Escrita só para admin ou service role **[testado]** | migration |
| 5 | Alta | RLS: o usuário podia se reativar (`is_active`) depois de ser desativado por um admin | Trigger bloqueia campos administrativos para quem não é admin **[testado]** | migration |
| 6 | Alta | RLS: o usuário podia preencher `admin_response`/`status` do próprio chamado | Update só para admin **[testado]** | migration |
| 7 | Alta | RLS: o usuário podia gravar `integrations.status='connected'` sem OAuth | Escrita só pelo servidor **[testado]** | migration |
| 8 | Alta | `VITE_MELI_CLIENT_SECRET` e `VITE_MELI_ACCESS_TOKEN` iriam no **bundle público** do navegador | OAuth movido para o servidor; o token nunca chega ao navegador | `src/lib/meli.server.ts`, `src/lib/meli.functions.ts` |
| 9 | Alta | `router.tsx` foi reescrito por outra ferramenta com rotas **sem componentes**, o que deixava todas as páginas em branco | Restaurada a versão original do Lovable (usa `routeTree.gen.ts`) | `src/router.tsx` |
| 10 | Alta | OAuth do Mercado Livre incompleto: não havia callback, `state` não era validado e a URL de token estava errada (`api.mercadolivre.com`) | Fluxo completo no servidor: `state` aleatório de uso único (10 min), troca de código, `/users/me`, refresh automático (token de uso único), detecção de expiração e desconexão | `src/routes/api/meli/callback.ts` + libs |
| 11 | Alta | Todas as chamadas iam para `api.mercadolivre.com.br`, **host que não é a API oficial** (`api.mercadolibre.com`) | Corrigido; as chamadas passam pelo servidor com o token do próprio vendedor | catálogo, produtos-divulgar |
| 12 | Média | "Salvar produto" e "Adicionar à lista" sempre falhavam para não-admin (RLS de `products`) | O servidor busca o item na API oficial e grava no catálogo compartilhado (o usuário não injeta dados) | `meliSaveProduct` |
| 13 | Média | "Gerar link" gravava o ID `MLB…` numa coluna UUID: falhava sempre, sem aviso | Usa o UUID do produto salvo; erros aparecem para o usuário | `produtos-divulgar.tsx`, `queries.ts` |
| 14 | Média | "Publicar no ML" com conta conectada não fazia nada (clique ignorado) | Mensagem real: a publicação não está implementada (ver §4) | `catalogo.tsx` |
| 15 | Média | Admin: "Plano" dava **365 dias** ao plano mensal; botões mostravam sucesso mesmo com erro do banco | Função `admin_set_plan` no banco (30 dias pelo relógio do servidor; Lifetime sem expiração); erros propagados **[testado]** | migration, `admin.tsx` |
| 16 | Média | "Novo usuário" do admin ignorava o formulário e sempre recriava a conta fixa | Corrigido junto com o item 1 | |
| 17 | Média | "Desativar usuário" não bloqueava nada | O guard de rotas bloqueia contas desativadas | `_authenticated/route.tsx` |
| 18 | Baixa | Uma falha de rede na checagem de acesso liberava o painel ou mandava o pagante para a tela de planos | Estado de erro com "Tentar novamente" | `_authenticated/route.tsx` |
| 19 | Baixa | Integrações e Catálogo usavam a mesma chave de cache com formatos diferentes | Chaves separadas (`meli-status`) | `integracoes.tsx` |

Também foram adicionados: tabela `admin_audit_log` (log automático de mudanças em `subscriptions` e `user_roles`), índices nas consultas por usuário e a tabela `meli_oauth_states`.

## 3. Funcionalidades verificadas

- **[testado]** Todas as migrations aplicam em ordem num Postgres 16 limpo com stub do Supabase, e a nova é idempotente (roda duas vezes sem erro).
- **[testado]** 11 cenários de permissão (`tests/db/rls_test.sh`). **Antes:** 4 ataques funcionavam (auto-ativar Lifetime, se reativar, responder o próprio chamado, forjar conexão ML). **Depois:** 11/11 PASS.
- **[testado]** `admin_set_plan`: admin → mensal = 30 dias; Lifetime = sem expiração; usuário comum, anônimo e plano inexistente são recusados; tudo vai para o log de auditoria.
- **[revisado]** Sintaxe de todos os `.ts/.tsx` alterados (parser do TypeScript) e checagem de tipos comparando antes/depois: nenhum erro novo nos arquivos alterados.
- **Não executado:** build, lint, testes E2E e as Edge Functions (Deno). O ambiente desta auditoria não tinha acesso ao registro npm. **Rode `bun install && bun run build` antes de fazer merge.**

## 4. Mercado Livre

- **OAuth [revisado, não testado contra a API real]:** pronto no servidor; requer os secrets abaixo e o redirect cadastrado no app do ML.
- **Busca de produtos [pendente]:** a documentação oficial marca vários usos de `/sites/MLB/search` como substituídos, e há relatos de 403 para aplicativos de terceiros. O código agora mostra o **motivo real** retornado pelo ML. Se vier 403, a busca pública não está liberada para o seu app.
- **Publicação [não implementada]:** não existe código de publicação. Republicar anúncios de outros vendedores do ML não é permitido. Publicar exige um catálogo de fornecedor com fotos e dados próprios (CJ ou fornecedor nacional), validação de atributos por categoria (`/categories/{id}/attributes`) e controle de limite diário no backend. Nada disso existe no projeto.
- **Pedidos/sincronização [não implementada]:** as tabelas `orders`/`commissions` existem, mas nada as popula.
- **"Links de afiliado":** são o link público do anúncio, **sem comissão rastreada**. Não encontrei API pública do ML para gerar links de afiliado.
- Tokens ficam em `meli_tokens` (RLS sem policies = só service role). Não estão criptografados em repouso: considere usar Vault/pgsodium.

## 5–8. CJdropshipping, fornecedores nacionais, Shopee, Applyfy

**Nenhum deles existe no código.** Applyfy: não encontrei documentação pública do webhook (formato e assinatura). Para não criar uma verificação fictícia, o webhook **não foi implementado**. Para implementar com segurança, preciso da documentação oficial e do segredo de assinatura. O caminho já está preparado: o webhook chama `admin_set_plan` via service role.

**Até existir o webhook, novas compras precisam ser liberadas manualmente pelo admin** (Admin → Plano). Antes, o acesso era liberado sem pagamento algum.

## 9. Banco de dados

Migration nova: `supabase/migrations/20261123180000_security_hardening.sql`. Não apaga tabelas, linhas nem contas. Assinaturas existentes continuam valendo.

## 10. Segurança: ações manuais necessárias

1. **A conta admin criada pela função antiga usa uma senha que está no histórico do Git** (repositório **público**). Troque essa senha imediatamente ou remova o papel admin dessa conta, se não for sua.
2. Revise em Admin quem tem assinatura ativa: qualquer pessoa pode ter ativado Lifetime de graça pelos itens 2, 3 e 4. Use o `admin_audit_log` daqui para frente.
3. O repositório é público e contém `.env` com URL e publishable key (essas são públicas por natureza, sem risco). Mesmo assim, considere tornar o repositório privado.
4. Se algum `VITE_MELI_CLIENT_SECRET` ou `VITE_MELI_ACCESS_TOKEN` já foi configurado e publicado, **revogue e gere outro** no painel do ML.

## 11. Performance

Índices em `orders`, `commissions`, `support_tickets` e `user_products` por `(user_id, data)`. Busca do ML sem retentativa automática em erro (evita martelar a API).

## 12. Testes: comandos

Veja `tests/db/README.md`.

## 13. Pendências

Webhook Applyfy (documentação + segredo) · checkout URLs · secrets do ML · publicação de anúncios · catálogo CJ/nacional · Shopee · pedidos · preços divergentes: landing R$ 160,99/295,99 × tela de planos/banco R$ 150,99/255,99 (decisão comercial).

## 14. Deploy

1. Secrets do servidor (Lovable Cloud → Secrets): `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_REDIRECT_URI=https://<domínio>/api/meli/callback`.
2. Variáveis públicas: `VITE_CHECKOUT_URL_MONTHLY`, `VITE_CHECKOUT_URL_LIFETIME`. No checkout, use como URL de retorno `https://<domínio>/auth?mode=signup`.
3. No app do Mercado Livre, cadastre o mesmo redirect URI.
4. Localmente: `bun install && bun run build && bun run lint`.
5. Faça merge da branch na `main` (sincroniza com o Lovable). Depois **confirme no Lovable** que a migration `20261123180000_security_hardening.sql` foi aplicada e que as Edge Functions `create-admin-user`/`create-demo-user` foram republicadas. Enquanto a função antiga estiver publicada, o item 1 continua aberto.
6. Remova as variáveis antigas `VITE_MELI_*` do ambiente.
