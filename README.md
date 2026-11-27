# Mercado Ecommerce

Painel para vendedores do Mercado Livre: catálogo, conexão oficial com a conta do ML, links e anúncios, chamados e administração de assinaturas.

```bash
bun install
bun run dev        # servidor local de desenvolvimento
bun run build      # produção → .output/ (Cloudflare Worker)
```

| Documento | Para quê |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Arquitetura, regras de desenvolvimento, segurança (comece por aqui) |
| [`AUDITORIA_PROJETO.md`](AUDITORIA_PROJETO.md) | Estado de cada módulo, bugs, testes |
| [`PENDENCIAS.md`](PENDENCIAS.md) | O que falta, por prioridade |
| [`CONFIGURACAO_APIS.md`](CONFIGURACAO_APIS.md) | Credenciais de cada integração |
| [`MIGRACAO_BANCO.md`](MIGRACAO_BANCO.md) | Lovable Cloud → Supabase próprio |
| [`DEPLOY.md`](DEPLOY.md) | Publicar na Cloudflare, rollback |
| [`.env.example`](.env.example) | Variáveis de ambiente |
| [`tests/db/README.md`](tests/db/README.md) | Testes de permissão do banco |

Especificação original gerada na Lovable: `docs/ESPECIFICACAO_ORIGINAL_LOVABLE.md`.
