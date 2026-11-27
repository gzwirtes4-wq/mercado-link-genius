# Deploy independente (sem a Lovable)

**Status: preparado, não executado.** Nada foi publicado. O domínio `mercadoecommerce02.shop` continua apontando para a Lovable até você autorizar a troca.

## Hospedagem escolhida: Cloudflare Workers + Supabase

**Por quê:** o build deste projeto já gera um **Cloudflare Worker** (`bun run build` → `.output/server/wrangler.json`; confirmado no CI). Hospedar em outro lugar exigiria mudar a configuração de build. A Lovable também publica na Cloudflare, então o comportamento em produção fica igual. Banco: Supabase, que é o mesmo motor do Lovable Cloud (`MIGRACAO_BANCO.md`).

**Por que não a Vercel:** os 4 projetos da Vercel ligados ao repositório falham porque o build gera saída para Cloudflare, não para a Vercel. Recomendo desconectá-los para evitar confusão.

### Custo estimado (premissas: valores públicos de nov/2026)

| Fase | Cloudflare Workers | Supabase | Total/mês |
|---|---|---|---|
| Teste | Free: 100 mil requisições/dia, **10 ms de CPU por requisição** | Free: 500 MB, pausa após 7 dias sem uso, sem backup automático | US$ 0 |
| Produção com clientes | Paid: US$ 5 (10 milhões de requisições/mês, 30 s de CPU) | Pro: US$ 25 (sem pausa, backups diários) | ~US$ 30 |

Riscos de custo:
- **CPU no plano Free:** páginas renderizadas no servidor podem passar de 10 ms de CPU. Nesse caso a Cloudflare responde com o erro 1102 e a solução é o plano Paid (US$ 5).
- **Pausa do Supabase Free:** sem acesso por 7 dias, o banco pausa e o site para. Por isso o Free não serve para produção com clientes.

## Pré-requisitos

- Conta Cloudflare (gratuita) e o domínio na Cloudflare (o DNS só muda com sua autorização)
- Bun instalado (`curl -fsSL https://bun.sh/install | bash`)
- Supabase de destino pronto (`MIGRACAO_BANCO.md`)

## Comandos

```bash
bun install                 # instalar
bun run dev                 # desenvolvimento local
bun run build               # build de produção → .output/
bunx tsc --noEmit && bun run lint   # o mesmo que o CI exige
```

As variáveis `VITE_*` são embutidas **no build**. Crie `.env.production.local` (ignorado pelo git) antes do `bun run build`:

```bash
VITE_SUPABASE_URL=https://<novo>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_SUPABASE_PROJECT_ID=<id>
VITE_CHECKOUT_URL_MONTHLY=<link>
VITE_CHECKOUT_URL_LIFETIME=<link>
VITE_GOOGLE_AUTH_VIA_SUPABASE=true
```

## Primeira publicação (num endereço de teste `*.workers.dev`)

```bash
bunx wrangler login
bun run build
npx nitro deploy --prebuilt          # comando sugerido pelo próprio build

# secrets do servidor (uma vez; o nome do Worker aparece no build)
W=gzwirtes4-wq-mercado-link-genius
for k in SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY \
         MELI_CLIENT_ID MELI_CLIENT_SECRET MELI_REDIRECT_URI; do
  bunx wrangler secret put $k --name $W
done
```

⚠️ **Não testado aqui:** os comandos de deploy não foram executados (não há conta Cloudflare nesta sessão). O build em si foi validado no CI.

Teste no endereço `*.workers.dev`: landing, login, painel, admin, conexão com o Mercado Livre (o redirect URI de teste precisa estar cadastrado no app do ML).

## Domínio (só com autorização)

Cloudflare → Workers → seu Worker → **Settings → Domains & Routes → Add custom domain** → `mercadoecommerce02.shop`. Isso move o domínio da Lovable para o seu Worker. Antes disso:
- [ ] banco migrado e validado
- [ ] `MELI_REDIRECT_URI` e o app do ML com o domínio final
- [ ] links de retorno do checkout apontando para o domínio
- [ ] Site URL e Redirect URLs no Supabase Auth com o domínio

## Fluxo de atualização (com o Claude Code)

1. Claude Code trabalha numa branch e faz push.
2. O CI (`.github/workflows/ci.yml`) roda install, tipos, lint, build e os testes de banco. Precisa ficar verde.
3. Você revisa o PR e faz merge na `main`.
4. Publicação manual: `bun run build && npx nitro deploy --prebuilt`. Ou, se preferir, conecte o repositório em Cloudflare → Workers → **Builds** para publicar a cada merge na `main`.

Enquanto a Lovable continuar conectada ao repositório, um merge na `main` também atualiza o projeto na Lovable.

## Migrations em produção

```bash
bunx supabase link --project-ref <ref-produção>
bunx supabase db push --dry-run      # confira o que será aplicado
bunx supabase db push
```

Só migrations aditivas (regra do `CLAUDE.md`). Faça `pg_dump` antes.

## Rollback

- **Aplicação:** `bunx wrangler deployments list --name $W` e `bunx wrangler rollback <version-id> --name $W` (volta para a versão anterior do Worker), ou `git revert` + nova publicação.
- **Domínio:** remover o custom domain do Worker e voltar o DNS para a Lovable.
- **Banco:** o Lovable Cloud fica intacto até você decidir desligá-lo (`MIGRACAO_BANCO.md` §8).
