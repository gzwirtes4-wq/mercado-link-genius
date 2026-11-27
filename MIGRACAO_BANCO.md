# Migração do banco: Lovable Cloud → Supabase próprio

**Status: preparado, não executado.** Nada aqui foi feito no banco de produção. A migração definitiva só acontece com a sua autorização, depois de validada num projeto de teste.

## Por que um Supabase próprio

O Lovable Cloud **é** um Supabase gerenciado pela Lovable: mesmo Postgres, mesma autenticação, mesmas Edge Functions. Migrar para um Supabase na sua conta mantém 100% do código e dá acesso direto ao banco (SQL, backups, service role) sem passar pela Lovable. Segundo a documentação da Lovable, não existe migração em um clique: exporte os dados, crie o projeto e recrie o esquema.

## Visão geral

```
1. Exportar dados do Lovable Cloud      (botão oficial; não apaga nada)
2. Criar projeto Supabase de TESTE       (região São Paulo)
3. Criar esquema pelas migrations do repo
4. Importar dados → validar
5. Repetir 2–4 no projeto definitivo, numa janela combinada
6. Trocar variáveis de ambiente e publicar (DEPLOY.md)
7. Manter o Lovable Cloud intacto como plano de volta
```

## 1. Exportar do Lovable Cloud

No projeto da Lovable: **More → Database → Manage → Settings → Export project data → Export data**, depois **Export** no cartão *Database* → **Start export**. A Lovable envia um e-mail quando terminar e salva o arquivo no armazenamento do projeto. Baixe-o.

⚠️ **Não clique em remover o banco/Cloud.** Segundo a Lovable, remover o banco apaga também a exportação e os arquivos.

Confira o conteúdo (é um dump do Postgres; o formato exato deve ser confirmado):

```bash
pg_restore --list export.backup | head -50                 # se for formato custom
pg_restore --list export.backup | grep -E "TABLE DATA (public|auth)"
```

**Ponto crítico, usuários e senhas:** verifique se aparecem `TABLE DATA auth users` e `auth identities`.
- **Se aparecem:** os usuários mantêm a senha atual (os hashes vão junto).
- **Se não aparecem:** os usuários precisarão usar "Esqueci minha senha" depois da troca. **Avise os clientes antes.** Não redefina senhas em massa.

## 2. Criar o projeto Supabase de teste

- https://supabase.com/dashboard → New project → região **South America (São Paulo)**.
- O plano Free permite 2 projetos ativos por organização. A sua organização já tem o projeto `astrix`.
- Guarde: Project URL, publishable (anon) key, service role key e senha do banco.

## 3. Esquema pelas migrations (fonte da verdade)

As migrations em `supabase/migrations/` recriam tabelas, RLS, funções e triggers. Elas são testadas no CI a cada push.

```bash
bunx supabase login
bunx supabase link --project-ref <ref-do-projeto-de-teste>
bunx supabase db push            # aplica supabase/migrations/* em ordem
```

## 4. Importar os dados

Esquema já criado, então importe **só dados**:

```bash
DB="postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres"

# usuários primeiro (se estiverem no dump), depois as tabelas do app
pg_restore --data-only --no-owner --disable-triggers -d "$DB" \
  --schema=auth --table=users --table=identities export.backup

pg_restore --data-only --no-owner --disable-triggers -d "$DB" \
  --schema=public export.backup
```

`--disable-triggers` impede que o trigger de cadastro (`handle_new_user`) duplique perfis e papéis durante a importação. Se o dump estiver em SQL puro (`.sql`), use `psql -d "$DB" -f` só com os blocos `COPY` desejados.

### Validar

```sql
-- compare com os mesmos números no Lovable Cloud (Cloud → Database)
select 'users' t, count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'subscriptions', count(*) from public.subscriptions
union all select 'subs ativas', count(*) from public.subscriptions where status = 'active'
union all select 'user_roles admin', count(*) from public.user_roles where role = 'admin'
union all select 'products', count(*) from public.products
union all select 'support_tickets', count(*) from public.support_tickets;
```

Checklist:
- [ ] contagens iguais às do Lovable Cloud
- [ ] login de um usuário de teste com a senha atual (ou reset, se os hashes não vieram)
- [ ] admin entra no painel; usuário comum não entra no admin
- [ ] assinatura ativa libera o painel; expirada manda para planos
- [ ] `tests/db` passando no CI

## 5. Autenticação no projeto novo

Supabase → Authentication:
- **URL Configuration:** Site URL `https://mercadoecommerce02.shop`; Redirect URLs `https://mercadoecommerce02.shop/**`
- **Providers → Google:** Client ID/Secret do Google Cloud Console; depois `VITE_GOOGLE_AUTH_VIA_SUPABASE=true`
- **E-mails:** revise os modelos (confirmação, recuperação de senha). O SMTP padrão do Supabase tem limite baixo de envio; para produção, configure um SMTP próprio.

## 6. Edge Functions e secrets

```bash
bunx supabase functions deploy create-admin-user
bunx supabase functions deploy create-demo-user     # stub desativado (410)
```

Secrets do servidor da aplicação (Worker): ver `DEPLOY.md`.

## 7. Troca de ambiente (cutover)

1. Combine uma janela curta. O que for gravado no Lovable Cloud depois da exportação **não** vai junto: faça a exportação final logo antes da troca.
2. Exportação final → importação no projeto definitivo → validação.
3. Publique a aplicação apontando para o Supabase novo (`DEPLOY.md`).
4. Teste login, painel e admin em produção.

## 8. Plano de volta (rollback)

O Lovable Cloud **continua intacto** durante e depois da troca. Para voltar: publique de novo com as variáveis antigas do Lovable Cloud (ou volte o domínio para a Lovable). Só desative o Lovable Cloud depois de algumas semanas estável, e só com um backup baixado.

## Backups depois da migração

- Supabase Free: **sem backups automáticos**. Faça `pg_dump` periódico: `pg_dump "$DB" -Fc -f backup-$(date +%F).dump`, ou use o plano Pro (backups diários).
