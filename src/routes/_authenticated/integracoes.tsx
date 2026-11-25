import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Plug, PlugZap, RefreshCw, Trash2, AlertCircle, CheckCircle2, Loader2, ShoppingBag, ShieldCheck, ExternalLinkIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { meliStatus, meliStartAuth, meliDisconnect } from "@/lib/meli.functions";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações | Mercado Ecommerce" },
      { name: "description", content: "Conecte suas contas de plataformas de e-commerce." },
    ],
  }),
  component: IntegrationsPage,
});

// ─── Mercado Livre OAuth ─────────────────────────────────────────────────────
// The whole OAuth flow runs on the server (src/lib/meli.server.ts). Configure
// these SERVER secrets (never VITE_*): MELI_CLIENT_ID, MELI_CLIENT_SECRET,
// MELI_REDIRECT_URI = https://<seu-dominio>/api/meli/callback
// Docs: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao

// ─── Component ───────────────────────────────────────────────────────────────
function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? "";
  const getStatus = useServerFn(meliStatus);
  const startAuth = useServerFn(meliStartAuth);
  const doDisconnect = useServerFn(meliDisconnect);

  const { data: status, isLoading, isError, refetch } = useQuery({
    queryKey: ["meli-status", uid],
    queryFn: () => getStatus(),
    enabled: !!uid,
  });
  const integration = status?.integration ?? null;

  // Result of the OAuth callback (?meli=ok|erro&motivo=...)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("meli");
    if (!result) return;
    if (result === "ok") toast.success("Conta do Mercado Livre conectada");
    else toast.error("Não foi possível conectar", { description: params.get("motivo") ?? undefined });
    window.history.replaceState(null, "", window.location.pathname);
    void queryClient.invalidateQueries({ queryKey: ["meli-status"] });
    void queryClient.invalidateQueries({ queryKey: ["integration"] });
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const r = await startAuth();
      if (!r.ok) throw new Error(r.message);
      window.location.href = r.url;
    },
    onError: (err: Error) => toast.error("Não foi possível iniciar a conexão", { description: err.message }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const r = await doDisconnect();
      if (!r.ok) throw new Error(r.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meli-status"] });
      queryClient.invalidateQueries({ queryKey: ["integration"] });
      toast.success("Conta desconectada");
    },
    onError: (err: Error) => toast.error("Falha ao desconectar", { description: err.message }),
  });

  const connected = integration?.status === "connected";
  const expired = integration?.status === "expired";
  const hasConfig = Boolean(status?.configured);

  return (
    <AppLayout
      title="Integrações"
      description="Conecte suas contas de plataformas para receber pedidos e comissões reais."
    >
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Mercado Livre ── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-[#FFD000]/10">
                  <ShoppingBag className="size-5 text-[#FFD000]" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Mercado Livre</CardTitle>
                  <CardDescription className="text-sm">
                    Fluxo oficial OAuth — nunca pedimos sua senha
                  </CardDescription>
                </div>
              </div>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : connected ? (
                <Badge className="bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="mr-1 size-3" />
                  Conectado
                </Badge>
              ) : expired ? (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                  <AlertCircle className="mr-1 size-3" />
                  Autorização expirada
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  Não conectado
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {connected ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" />
                    <span className="text-sm font-medium">Conta conectada com sucesso</span>
                  </div>
                  {integration?.account_identifier && (
                    <p className="text-xs text-muted-foreground pl-6">
                      Conta: {integration.nickname ?? integration.account_identifier}
                      {integration.ml_user_id ? ` (ID ${integration.ml_user_id})` : ""}
                    </p>
                  )}
                  {integration?.connected_at && (
                    <p className="text-xs text-muted-foreground pl-6">
                      Desde: {new Date(integration.connected_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => connectMutation.mutate()}
                  >
                    <RefreshCw className="size-4 mr-2" /> Reconectar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-muted-foreground hover:border-destructive/30 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    <Trash2 className="size-4 mr-2" /> Desconectar
                  </Button>
                </div>
              </>
            ) : isError ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm text-white/60">Não foi possível carregar o status da integração.</p>
                <Button size="sm" variant="outline" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : hasConfig ? (
              <>
                {expired && integration?.last_error && (
                  <p className="text-xs text-destructive">{integration.last_error}</p>
                )}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="size-4 text-[#FFD000] mt-0.5" />
                    <p className="text-sm text-white/60">
                      Ao clicar em "Conectar", você será direcionado ao site oficial do Mercado Livre para
                      autorizar o acesso. Nenhuma senha é digitada aqui.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <PlugZap className="size-4 mr-2" />
                  )}
                  Conectar conta do Mercado Livre
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-4 text-[#FFD000] mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#FFD000]">Configuração necessária</p>
                      <p className="text-xs text-white/50">
                        Para ativar a conexão com o Mercado Livre, adicione os seguintes secrets no servidor:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-white/40 font-mono">
                        <li>• MELI_CLIENT_ID</li>
                        <li>• MELI_CLIENT_SECRET</li>
                        <li>• MELI_REDIRECT_URI (…/api/meli/callback)</li>
                      </ul>
                      <p className="text-xs text-white/40">
                        Configure como secrets do servidor (Lovable Cloud), nunca com prefixo VITE_.
                      </p>
                      <a
                        href="https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#FFD000] underline underline-offset-2 hover:text-[#FFD000]/80"
                      >
                        Ver documentação OAuth do Mercado Livre <ExternalLinkIcon className="size-3" />
                      </a>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold"
                  disabled
                >
                  <Plug className="size-4 mr-2" /> Conectar conta do Mercado Livre
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Status e Info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como funciona a integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: "1", text: "Clique em 'Conectar' e autorize no site oficial do Mercado Livre." },
              { step: "2", text: "O Mercado Livre redireciona de volta com um código de autorização." },
              { step: "3", text: "Seu código é trocado por tokens seguros — senha nunca é armazenada." },
              { step: "4", text: "Pedidos e comissões aparecem automaticamente no seu painel." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 text-sm">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-[#FFD000]/10 text-xs font-bold text-[#FFD000]">
                  {item.step}
                </div>
                <span className="text-white/60">{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
