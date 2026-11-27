// Admin-only overview of which integrations are configured on the server.
// Returns only booleans and names — never secret values.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationState = {
  key: string;
  name: string;
  /** Code exists in the project. */
  implemented: boolean;
  /** All required environment variables are present. */
  configured: boolean;
  missing: string[];
  note: string;
};

export const integrationsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationState[] | null> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return null;

    const { listAdapters } = await import("@/lib/suppliers/registry.server");
    const env = (k: string) => Boolean(process.env[k]);
    const check = (keys: string[]) => keys.filter((k) => !env(k));

    const meli = check(["MELI_CLIENT_ID", "MELI_CLIENT_SECRET", "MELI_REDIRECT_URI"]);
    const db = check(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    const adapters = listAdapters();

    return [
      {
        key: "database",
        name: "Banco de dados (Supabase)",
        implemented: true,
        configured: db.length === 0,
        missing: db,
        note: "Necessário para tudo.",
      },
      {
        key: "mercadolivre",
        name: "Mercado Livre (OAuth, busca, salvar produto)",
        implemented: true,
        configured: meli.length === 0,
        missing: meli,
        note: "Publicação de anúncios ainda não implementada.",
      },
      {
        key: "checkout",
        name: "Links de checkout (página de planos)",
        implemented: true,
        configured: Boolean(
          import.meta.env["VITE_CHECKOUT_URL_MONTHLY"] &&
          import.meta.env["VITE_CHECKOUT_URL_LIFETIME"],
        ),
        missing: [
          !import.meta.env["VITE_CHECKOUT_URL_MONTHLY"] && "VITE_CHECKOUT_URL_MONTHLY",
          !import.meta.env["VITE_CHECKOUT_URL_LIFETIME"] && "VITE_CHECKOUT_URL_LIFETIME",
        ].filter((v): v is string => Boolean(v)),
        note: "Variáveis públicas, definidas no build.",
      },
      {
        key: "applyfy",
        name: "Webhook de pagamentos (Applyfy)",
        implemented: false,
        configured: false,
        missing: [],
        note: "Aguardando documentação oficial do webhook e do segredo de assinatura.",
      },
      {
        key: "suppliers",
        name: "Fornecedores (CJ, nacionais)",
        implemented: adapters.length > 0,
        configured: adapters.some((a) => a.configured),
        missing: [],
        note:
          adapters.length === 0
            ? "Estrutura pronta (banco + interface); nenhum fornecedor integrado ainda."
            : adapters
                .map((a) => `${a.name}: ${a.configured ? "ok" : "sem credenciais"}`)
                .join(" · "),
      },
      {
        key: "shopee",
        name: "Shopee Afiliados",
        implemented: false,
        configured: false,
        missing: [],
        note: "Não existe no projeto. Requer acesso oficial ao programa de afiliados.",
      },
    ];
  });
