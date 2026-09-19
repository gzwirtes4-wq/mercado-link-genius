import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plug, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shortDate } from "@/lib/format";
import { fetchIntegration } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações | AfiliaHub" },
      { name: "description", content: "Conecte sua conta do Mercado Livre pelo fluxo oficial." },
      { property: "og:title", content: "Integrações | AfiliaHub" },
      { property: "og:description", content: "Conecte sua conta do Mercado Livre pelo fluxo oficial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Integracoes,
});

function Integracoes() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const connected = integration.data?.status === "connected";

  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("integrations")
        .update({ status: "disconnected", account_identifier: null, connected_at: null })
        .eq("user_id", uid)
        .eq("provider", "mercado_livre");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta desconectada");
      void qc.invalidateQueries({ queryKey: ["integration", uid] });
    },
  });

  return (
    <AppLayout title="Integrações" description="Conexões oficiais da sua conta.">
      <div className="surface max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-brand/20">
              <Plug className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Mercado Livre</h2>
              <p className="text-xs text-muted-foreground">Autorização oficial via OAuth</p>
            </div>
          </div>
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Conectado" : "Integração não configurada"}
          </Badge>
        </div>

        {connected ? (
          <div className="mt-6 space-y-3 text-sm">
            <p className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" /> Conta conectada
            </p>
            <p className="text-muted-foreground">
              Identificador da conta: <span className="font-medium text-foreground">{integration.data?.account_identifier}</span>
            </p>
            <p className="text-muted-foreground">Conectado em {shortDate(integration.data?.connected_at)}</p>
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              Desconectar conta
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <p className="text-muted-foreground">
              A conexão ainda não está configurada, então não há pedidos, comissões nem produtos reais para
              exibir. Nada é simulado nesta área.
            </p>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">Como configurar</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>
                  Acesse o portal de desenvolvedores do Mercado Livre e crie uma aplicação para o programa de
                  afiliados.
                </li>
                <li>
                  Em Redirect URI, informe o endereço desta plataforma seguido de{" "}
                  <code className="rounded bg-background px-1">/integracoes</code>.
                </li>
                <li>Copie o Client ID (App ID) e o Client Secret gerados.</li>
                <li>
                  Envie essas credenciais para o administrador da plataforma cadastrá-las com segurança. Sua
                  senha do Mercado Livre nunca é solicitada nem armazenada.
                </li>
                <li>Depois de cadastradas, o botão de autorização abaixo fica ativo.</li>
              </ol>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <a href="https://developers.mercadolivre.com.br/" target="_blank" rel="noreferrer">
                  Portal de desenvolvedores <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <Button disabled className="w-full sm:w-auto">
              Conectar com Mercado Livre (aguardando credenciais)
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
