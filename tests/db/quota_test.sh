#!/bin/bash
# Testa consume_quota (como service role): limite diário e idempotência.
P="psql ${PGARGS:--h /tmp/pgtest -p 55432 -U postgres} -d $1 -q -At"
U=33333333-3333-3333-3333-333333333333
q() { $P -c "SET ROLE service_role; SELECT public.consume_quota('$U','publish','$1')->>'$2';" | tail -1; }
chk() { [ "$2" = "$3" ] && echo "PASS | $1" || echo "FAIL | $1 (esperado=$3 obtido=$2)"; }
$P >/dev/null <<SQL
INSERT INTO auth.users(id,email) VALUES ('$U','quota@x.com') ON CONFLICT DO NOTHING;
INSERT INTO public.plans(slug,name,price_cents,daily_publish_limit) VALUES ('teste-cota','Teste cota',0,2) ON CONFLICT (slug) DO UPDATE SET daily_publish_limit=2;
SQL
chk "sem assinatura ativa é recusado" "$(q a1 reason)" "sem_assinatura_ativa"
$P -c "INSERT INTO public.subscriptions(user_id,plan_id,status) SELECT '$U',id,'active' FROM public.plans WHERE slug='teste-cota' ON CONFLICT (user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',current_period_end=NULL" >/dev/null
chk "1ª publicação permitida" "$(q pub-1 allowed)" "true"
chk "mesma tentativa repetida não conta de novo" "$(q pub-1 already_counted)" "true"
chk "2ª publicação permitida" "$(q pub-2 used)" "2"
chk "3ª publicação bloqueada (limite 2/dia)" "$(q pub-3 reason)" "limite_atingido"
$P -c "UPDATE public.plans SET daily_publish_limit=NULL WHERE slug='teste-cota'" >/dev/null
chk "plano sem limite configurado (NULL) permite" "$(q pub-4 allowed)" "true"
