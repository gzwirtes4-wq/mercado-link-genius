import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plug, ExternalLink, ChevronRight, AlertCircle, Store } from "lucide-react";
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
      { name: "description", content: "Conecte marketplaces, fornecedores e ferramentas externas." },
      { property: "og:title", content: "Integrações | AfiliaHub" },
      { property: "og:description", content: "Conecte marketplaces, fornecedores e ferramentas externas." },
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
    onError: (e: Error) => toast.error("Erro ao desconectar", { description: e.message }),
  });

  const connectUrl = "https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_CLIENT_ID&redirect_uri=";

  return (
    <AppLayout title="Integrações" description="Conecte marketplaces, fornecedores e ferramentas externas.">
      <div className="max-w-4xl space-y-8">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status da Integração</h2>
          <div className="surface overflow-hidden">
            <div className="flex items-center gap-4 border-b border-border p-5">
              <div className="grid size-12 place-items-center rounded-xl bg-[#FFFE00]">
                <Store className="size-6 text-[#000]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Mercado Livre</h3>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Conectado" : "Não conectado"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {connected
                    ? `Conta: ${integration.data?.account_identifier}`
                    : "Programa de afiliados oficial do Mercado Livre"}
                </p>
              </div>
              <div>
                {connected ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={integration.data?.account_identifier ?? "#"} target="_blank" rel="noreferrer">
                        <ChevronRight className="size-4" /> Gerenciar
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <Button asChild>
                    <a href={connectUrl} target="_blank" rel="noreferrer">
                      <Plug className="size-4" /> Conectar Mercado Livre
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {connected && (
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Conta conectada</p>
                  <p className="mt-1 font-medium">{integration.data?.account_identifier}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Desde</p>
                  <p className="mt-1 font-medium">{shortDate(integration.data?.connected_at)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 flex items-center gap-1 font-medium text-success">
                    <CheckCircle2 className="size-4" /> Ativo
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lojas conectadas</h2>
          {connected ? (
            <div className="surface flex items-center gap-4 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-[#FFFE00]">
                <Store className="size-5 text-[#000]" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Mercado Livre</p>
                <p className="text-sm text-muted-foreground">{integration.data?.account_identifier}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="size-4" /> Conectado
                </p>
                <p className="text-xs text-muted-foreground">Conectado em {shortDate(integration.data?.connected_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Gerenciar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="surface flex flex-col items-center gap-4 p-10 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-muted">
                <AlertCircle className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Nenhuma conta conectada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conecte sua conta do Mercado Livre para começar a usar os recursos de afiliados.
                </p>
              </div>
              <Button asChild>
                <a href={connectUrl} target="_blank" rel="noreferrer">
                  <Plug className="size-4" /> Conectar Mercado Livre
                </a>
              </Button>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Integrações disponíveis</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="surface flex items-start gap-4 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-[#FFFE00]">
                <Store className="size-5 text-[#000]" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Mercado Livre</p>
                <Badge variant="default" className="mt-2">Disponível</Badge>
                <p className="mt-2 text-xs text-muted-foreground">Programa de afiliados oficial</p>
              </div>
            </div>
            <div className="surface flex items-start gap-4 p-5 opacity-60">
              <div className="grid size-10 place-items-center rounded-xl bg-muted">
                <Plug className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Amazon</p>
                <Badge variant="secondary" className="mt-2">Em breve</Badge>
                <p className="mt-2 text-xs text-muted-foreground">Programa de afiliados Amazon</p>
              </div>
            </div>
            <div className="surface flex items-start gap-4 p-5 opacity-60">
              <div className="grid size-10 place-items-center rounded-xl bg-muted">
                <Plug className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Shopee</p>
                <Badge variant="secondary" className="mt-2">Em breve</Badge>
                <p className="mt-2 text-xs text-muted-foreground">Programa de afiliados Shopee</p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <h3 className="font-semibold">Como funciona a integração</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
            <li>
              Clique em "Conectar Mercado Livre" para iniciar o processo de autorização OAuth.
            </li>
            <li>
              Você será direcionado para a página oficial do Mercado Livre, onde poderá fazer login e
              autorizar o acesso.
            </li>
            <li>
              Após a autorização, você será redirecionado de volta com um token de acesso válido.
            </li>
            <li>
              Com a conta conectada, você poderá buscar produtos reais do catálogo do Mercado Livre e
              gerar links de afiliado oficiais.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Nunca solicitamos sua senha do Mercado Livre. A conexão é feita exclusivamente pelo fluxo
            oficial OAuth.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <a href="https://developers.mercadolivre.com.br/" target="_blank" rel="noreferrer">
              Documentação do Mercado Livre <ExternalLink className="size-4" />
            </a>
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
