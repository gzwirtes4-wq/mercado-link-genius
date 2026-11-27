// OAuth redirect target for Mercado Livre.
// Register exactly this URL in the Mercado Livre app and in MELI_REDIRECT_URI:
//   https://<seu-dominio>/api/meli/callback
import { createFileRoute } from "@tanstack/react-router";

function back(request: Request, status: "ok" | "erro", reason?: string) {
  const url = new URL("/integracoes", request.url);
  url.searchParams.set("meli", status);
  if (reason) url.searchParams.set("motivo", reason.slice(0, 200));
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/meli/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const code = params.get("code");
        const state = params.get("state");
        const denied = params.get("error");

        if (denied) return back(request, "erro", "Autorização cancelada no Mercado Livre");
        if (!code || !state) return back(request, "erro", "Resposta incompleta do Mercado Livre");

        const { consumeOAuthState, completeAuthorization, MeliError } =
          await import("@/lib/meli.server");
        const userId = await consumeOAuthState(state);
        if (!userId)
          return back(request, "erro", "Sessão de conexão expirada. Tente conectar novamente.");

        try {
          await completeAuthorization(userId, code);
          return back(request, "ok");
        } catch (e) {
          const message = e instanceof MeliError ? e.message : "Erro interno ao concluir a conexão";
          if (!(e instanceof MeliError))
            console.error(
              JSON.stringify({ scope: "meli", msg: "callback failed", err: String(e) }),
            );
          return back(request, "erro", message);
        }
      },
    },
  },
});
