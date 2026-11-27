#!/bin/bash
# usage: rls_test.sh <db>
P="psql ${PGARGS:--h /tmp/pgtest -p 55432 -U postgres} -d $1 -q -At"
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222
$P <<SQL >/dev/null
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('$A','a@x.com','{"full_name":"User A"}'),('$B','admin@x.com','{}') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles(user_id,role) VALUES ('$B','admin') ON CONFLICT DO NOTHING;
INSERT INTO public.support_tickets(user_id,subject,message) VALUES ('$A','s','m');
SQL
t() { # name, user, sql, expect(ok|deny)
  out=$($P -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$2',true); $3; COMMIT;" 2>&1)
  rc=$?; if echo "$out" | grep -qiE "error|denied|violates"; then got=deny; else got=ok; fi
  # UPDATE affecting 0 rows under RLS counts as deny
  if [ "$got" = ok ] && [ "$(echo "$out" | tail -1)" = "0" ]; then got=deny; fi
  [ "$got" = "$4" ] && s=PASS || s=FAIL; echo "$s | esperado=$4 obtido=$got | $1"
}
PLAN="(SELECT id FROM public.plans WHERE slug='lifetime')"
t "usuário comum se auto-ativa Lifetime (INSERT)" $A "INSERT INTO public.subscriptions(user_id,plan_id,status) VALUES ('$A',$PLAN,'active')" deny
t "usuário comum edita nome/telefone do próprio perfil" $A "WITH u AS (UPDATE public.profiles SET full_name='Novo', phone='1' WHERE id='$A' RETURNING 1) SELECT count(*) AS n FROM u" ok
t "usuário comum se reativa (is_active)" $A "WITH u AS (UPDATE public.profiles SET is_active=true, validated_at=now() WHERE id='$A' RETURNING 1) SELECT count(*) AS n FROM u" deny
t "usuário comum responde o próprio chamado como admin" $A "WITH u AS (UPDATE public.support_tickets SET admin_response='ok', status='resolvido' WHERE user_id='$A' RETURNING 1) SELECT count(*) AS n FROM u" deny
t "usuário comum forja integração 'connected'" $A "INSERT INTO public.integrations(user_id,provider,status) VALUES ('$A','mercadolivre','connected')" deny
t "usuário comum lê tokens do Mercado Livre" $A "SELECT count(*) FROM public.meli_tokens" deny
t "usuário comum abre chamado" $A "INSERT INTO public.support_tickets(user_id,subject,message) VALUES ('$A','a','b')" ok
t "usuário comum lê perfil de outro usuário" $A "SELECT count(*) AS n FROM public.profiles WHERE id='$B'" deny
t "admin atribui plano a usuário" $B "INSERT INTO public.subscriptions(user_id,plan_id,status) VALUES ('$A',$PLAN,'active') ON CONFLICT (user_id) DO UPDATE SET status='active'" ok
t "admin desativa usuário" $B "WITH u AS (UPDATE public.profiles SET is_active=false WHERE id='$A' RETURNING 1) SELECT count(*) AS n FROM u" ok
t "admin responde chamado" $B "WITH u AS (UPDATE public.support_tickets SET admin_response='ok' WHERE user_id='$A' RETURNING 1) SELECT count(*) AS n FROM u" ok
echo "audit_log entries: $($P -c "SELECT count(*) FROM public.admin_audit_log WHERE table_name='subscriptions'" 2>&1)"

# ── Fornecedores, catálogo compartilhado e limites (migration 20261127140000) ──
$P <<SQL >/dev/null 2>&1
INSERT INTO public.suppliers(slug,name,origin,active) VALUES ('teste-ativo','Ativo','internacional',true),('teste-inativo','Inativo','nacional',false) ON CONFLICT DO NOTHING;
INSERT INTO public.supplier_products(supplier_id,external_id,title) SELECT id,'P1','Produto '||slug FROM public.suppliers WHERE slug LIKE 'teste-%' ON CONFLICT DO NOTHING;
SQL
t "usuário lê catálogo de fornecedor ativo" $A "SELECT CASE WHEN count(*)=0 THEN 0 ELSE 1 END FROM public.supplier_products p JOIN public.suppliers s ON s.id=p.supplier_id WHERE s.slug='teste-ativo'" ok
t "usuário NÃO vê fornecedor inativo" $A "SELECT count(*) AS n FROM public.supplier_products p JOIN public.suppliers s ON s.id=p.supplier_id WHERE s.slug='teste-inativo'" deny
t "usuário grava no catálogo compartilhado" $A "INSERT INTO public.supplier_products(supplier_id,external_id,title) SELECT id,'X','x' FROM public.suppliers LIMIT 1" deny
t "usuário consome cota direto (burlar limite)" $A "SELECT public.consume_quota('$A','publish','k1')" deny
t "usuário forja evento de uso" $A "INSERT INTO public.usage_events(user_id,metric,idempotency_key) VALUES ('$A','publish','x')" deny
t "usuário lê log de uso de APIs" $A "SELECT count(*) AS n FROM public.api_usage_log" deny
t "usuário abre chamado com 'resposta do suporte' forjada" $A "WITH i AS (INSERT INTO public.support_tickets(user_id,subject,message,admin_response,status) VALUES ('$A','s','m','resposta falsa','resolvido') RETURNING admin_response, status) SELECT count(*) AS n FROM i WHERE admin_response IS NOT NULL OR status <> 'aberto'" deny
