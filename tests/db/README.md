# Testes de permissão do banco (RLS)

Simulam o Supabase num Postgres local (schema `auth`, papéis `anon`,
`authenticated`, `service_role` e `auth.uid()`) e verificam quem pode ler e
escrever cada tabela. **Nunca rode contra o banco de produção.**

```bash
createdb rls_check
psql -d rls_check -f tests/db/supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -d rls_check -v ON_ERROR_STOP=1 -f "$f"; done
PGARGS="-h localhost -U postgres" ./tests/db/rls_test.sh rls_check
PGARGS="-h localhost -U postgres" ./tests/db/quota_test.sh rls_check
```

Resultado esperado: todas as linhas `PASS`.
