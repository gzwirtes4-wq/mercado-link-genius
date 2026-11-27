# Pendências

Ordenadas por prioridade. Marque [x] ao concluir e mova para o `git log`.

## Depende do dono (ações e decisões)

- [ ] **Trocar a senha da conta admin antiga** (está no histórico público do Git) e tornar o repositório privado
- [ ] Decidir o que fazer com o conteúdo que só existe no site publicado (vídeo, imagens `r2.dev`, "12x de R$ 31,00"): trazer para o repositório ou descartar
- [ ] Revisar e fazer merge do PR #1 e da branch `migracao/independencia-lovable`
- [ ] Preços divergentes: landing R$ 160,99/295,99 × banco e tela de planos R$ 150,99/255,99
- [ ] Plano Classic no banco diz "Até 50 produtos"; a landing diz "ilimitados"
- [ ] Definir os limites por plano (`daily_publish_limit` etc.). Hoje todos são NULL (sem limite)
- [ ] Desconectar os 4 projetos da Vercel (falham porque o build é para Cloudflare)
- [ ] Autorizar a migração do banco e a troca de hospedagem (`MIGRACAO_BANCO.md`, `DEPLOY.md`)

## Depende de credenciais ou documentação

- [ ] Mercado Livre: `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_REDIRECT_URI` e o redirect cadastrado no app → testar OAuth e busca
- [ ] Links de checkout: `VITE_CHECKOUT_URL_MONTHLY`, `VITE_CHECKOUT_URL_LIFETIME`
- [ ] Applyfy: documentação oficial do webhook + segredo → implementar ativação, reembolso, cancelamento, idempotência
- [ ] CJdropshipping: credenciais + termos de cache → adaptador `src/lib/suppliers/cj.server.ts`
- [ ] Fornecedores nacionais: confirmar API oficial de cada um antes de codificar
- [ ] Shopee Afiliados: acesso oficial à API

## Desenvolvimento (pode ser feito sem credenciais, com testes simulados)

- [ ] Publicação no ML: tela de configuração, validação de atributos por categoria (`/categories/{id}/attributes`), resumo de custos e margem, confirmação, `consume_quota` + registro de tentativas
- [ ] Catálogo de fornecedores na interface (Internacionais/Nacionais) lendo `supplier_products` com paginação e filtros
- [ ] Sincronização de pedidos do ML (tabela `orders`) e notificações de preço/estoque
- [ ] Envio de imagens nos chamados (Supabase Storage, validação de tipo e tamanho)
- [ ] Criptografar tokens do ML em repouso
- [ ] Cabeçalhos de segurança (CSP, HSTS) no Worker
- [ ] Testes E2E (Playwright) de login, painel e admin
- [ ] Registrar chamadas ao ML em `api_usage_log`
