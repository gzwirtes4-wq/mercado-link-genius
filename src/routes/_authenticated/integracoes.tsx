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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações | Mercado Ecommerce" },
      { name: "description", content: "Conecte suas contas de plataformas de e-commerce." },
    ],
  }),
  component: IntegrationsPage,
});

// ─── Mercado Livre OAuth Config ─────────────────────────────────────────────
// Para ativar, configure estas variáveis no ambiente:
// VITE_MELI_CLIENT_ID=seu_client_id
// VITE_MELI_REDIRECT_URI=https://sua-url.com/auth/callback/meli
//
// Docs: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
//
const MELI_CLIENT_ID = import.meta.env.VITE_MELI_CLIENT_ID as string | undefined;
const MELI_REDIRECT_URI = import.meta.env.VITE_MELI_REDIRECT_URI as string | undefined;
const MELI_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const MELI_TOKEN_URL = "https://api.mercadolivre.com/oauth/token";

function getMeliAuthUrl(): string {
  if (!MELI_CLIENT_ID || !MELI_REDIRECT_URI) return "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: MELI_CLIENT_ID,
    redirect_uri: MELI_REDIRECT_URI,
  });
  return `${MELI_AUTH_URL}?${params.toString()}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Integration = {
  id: string;
  provider: string;
  status: string;
  account_identifier: string | null;
  connected_at: string | null;
  last_error: string | null;
  updated_at: string;
  user_id: string;
};

// ─── Fetch Integration ───────────────────────────────────────────────────────
async function fetchIntegration(userId: string): Promise<Integration | null> {
  const { data } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "mercadolivre")
    .maybeSingle();
  return data as Integration | null;
}

// ─── Exchange code for token (server-side only in production) ───────────────
async function exchangeMeliCode(code: string): Promise<{ access_token: string; user_id: string } | null> {
  if (!MELI_CLIENT_ID || !MELI_REDIRECT_URI) return null;
  try {
    const res = await fetch(MELI_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: MELI_CLIENT_ID,
        client_secret: import.meta.env.VITE_MELI_CLIENT_SECRET ?? "",
        code,
        redirect_uri: MELI_REDIRECT_URI,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { access_token: json.access_token, user_id: json.user_id };
  } catch {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? "";

  const { data: integration, isLoading } = useQuery({
    queryKey: ["integration", uid],
    queryFn: () => fetchIntegration(uid),
    enabled: !!uid,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const authUrl = getMeliAuthUrl();
      if (!authUrl) throw new Error("CONFIG_MISSING");
      // Armazena state para verificar no callback
      const state = Math.random().toString(36).slice(2);
      sessionStorage.setItem("meli_oauth_state", state);
      window.location.href = `${authUrl}&state=${state}`;
    },
    onError: (err) => {
      if ((err as Error).message === "CONFIG_MISSING") {
        toast.error("Configuração incompleta", {
          description: "Adicione VITE_MELI_CLIENT_ID e VITE_MELI_REDIRECT_URI no ambiente.",
        });
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("integrations")
        .update({ status: "disconnected", account_identifier: null })
        .eq("user_id", uid)
        .eq("provider", "mercadolivre");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration", uid] });
      toast.success("Conta desconectada");
    },
  });

  const connected = integration?.status === "connected";
  const hasConfig = Boolean(MELI_CLIENT_ID && MELI_REDIRECT_URI);

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
                      ID da conta: {integration.account_identifier}
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
            ) : hasConfig ? (
              <>
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
                        Para ativar a conexão com o Mercado Livre, adicione as seguintes variáveis no ambiente:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-white/40 font-mono">
                        <li>• VITE_MELI_CLIENT_ID</li>
                        <li>• VITE_MELI_REDIRECT_URI</li>
                        <li>• VITE_MELI_CLIENT_SECRET (para troca de código)</li>
                      </ul>
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
