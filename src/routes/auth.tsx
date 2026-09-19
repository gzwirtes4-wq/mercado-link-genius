import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | Mercado Ecommerce" },
      {
        name: "description",
        content: "Acesse o painel Mercado Ecommerce para organizar produtos, links e divulgações.",
      },
      {
        property: "og:title",
        content: "Entrar ou criar conta | Mercado Ecommerce",
      },
      {
        property: "og:description",
        content: "Acesse o painel Mercado Ecommerce para organizar produtos, links e divulgações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

// Resolve plan slug → UUID using the plans table
const PLAN_MAP: Record<string, string> = {
  monthly: "classic",
  lifetime: "lifetime",
};

const PLANS_STEPS = [
  {
    name: "1 Mês",
    price: "R$ 150,99",
    description: "Acesso à plataforma durante 30 dias.",
    features: [
      "Catálogo completo de produtos",
      "Pesquisa e filtros avançados",
      "Meus Produtos — até 50 itens",
      "Gerador de links de afiliado",
      "Criador de anúncios",
      "Dashboard com métricas",
      "Suporte por chamados",
    ],
    highlight: false,
    slug: "monthly",
  },
  {
    name: "Lifetime",
    price: "R$ 255,99",
    description: "Acesso vitalício. Pagamento único, sem mensalidade.",
    features: [
      "Tudo do plano 1 Mês",
      "Acesso vitalício — sem expiração",
      "Produtos cadastrados ilimitados",
      "Gerador de anúncios completo",
      "Analytics avançado",
      "Pedidos e financeiro detalhados",
      "Suporte prioritário",
    ],
    highlight: true,
    badge: "Acesso vitalício",
    slug: "lifetime",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState("login");
  const [recovering, setRecovering] = React.useState(false);
  const [showPlans, setShowPlans] = React.useState(false);
  const [activating, setActivating] = React.useState<string | null>(null);

  const stepFromUrl = new URLSearchParams(window.location.search).get("step") === "plans";

  React.useEffect(() => {
    if (stepFromUrl && session) {
      setShowPlans(true);
    }
  }, [session, stepFromUrl]);

  React.useEffect(() => {
    if (!loading && session && !stepFromUrl) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, stepFromUrl, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(form.get("full_name")) },
      },
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível criar a conta", { description: error.message });
    if (!data.session) {
      toast.success("Conta criada!", { description: "Confirme seu e-mail para acessar o painel." });
      setMode("login");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const handleRecover = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível enviar o e-mail", { description: error.message });
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
    setRecovering(false);
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Falha ao entrar com Google");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const handleActivatePlan = async (slug: string) => {
    if (!session?.user) {
      setMode("login");
      setShowPlans(false);
      toast.error("Faça login primeiro");
      return;
    }
    setActivating(slug);

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("slug", PLAN_MAP[slug] ?? slug)
      .maybeSingle();

    if (planError || !plan) {
      toast.error("Plano não encontrado. Tente novamente.");
      setActivating(null);
      return;
    }

    const isLifetime = slug === "lifetime";
    const periodEnd = isLifetime ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: session.user.id,
          plan_id: plan.id,
          status: "active",
          current_period_end: periodEnd,
        },
        { onConflict: "user_id" },
      );

    setActivating(null);
    if (subError) {
      toast.error("Erro ao ativar plano", { description: subError.message });
      return;
    }
    toast.success("Plano ativado! Bem-vindo ao Mercado Ecommerce.");
    navigate({ to: "/dashboard" });
  };

  if (showPlans) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <header className="border-b border-white/10 bg-[#0A0A0A]/90 px-5 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <span className="font-display text-xl font-bold">
              <span className="text-[#FFD000]">Mercado</span> Ecommerce
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">{session?.user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-5 py-16">
          <div className="mb-12 text-center">
            <Badge className="mb-4 rounded-full border border-[#FFD000]/30 bg-[#FFD000]/10 px-4 py-1 text-xs font-medium text-[#FFD000]">
              Acesso restrito
            </Badge>
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Escolha seu plano para continuar
            </h1>
            <p className="mt-3 text-sm text-white/50">
              Sua conta foi criada. Selecione um plano para acessar o painel.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PLANS_STEPS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "relative rounded-2xl border-2 border-[#FFD000] bg-gradient-to-b from-[#FFD000]/10 to-[#0A0A0A] p-8 shadow-[0_0_60px_rgba(255,208,0,0.15)]"
                    : "relative rounded-2xl border border-white/10 bg-white/5 p-8"
                }
              >
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD000] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,208,0,0.4)]">
                    {p.badge}
                  </span>
                )}
                <div className="text-center">
                  <h3 className="font-display text-xl font-bold text-white">{p.name}</h3>
                  <p className="mt-2 text-sm text-white/50">{p.description}</p>
                  <div className="mt-6">
                    <span className="font-display text-4xl font-bold text-white">{p.price}</span>
                    <span className="text-sm text-white/40"> — pagamento único</span>
                  </div>
                </div>
                <ul className="mt-8 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-white/70">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#FFD000]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {p.highlight ? (
                    <Button
                      className="flex w-full items-center justify-center gap-2 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-bold text-base py-6 rounded-xl shadow-[0_0_30px_rgba(255,208,0,0.3)]"
                      onClick={() => handleActivatePlan("lifetime")}
                      disabled={activating !== null}
                    >
                      {activating === "lifetime" ? "Ativando..." : "COMPRAR LIFETIME"}
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex w-full items-center justify-center gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold py-6 rounded-xl"
                      onClick={() => handleActivatePlan("monthly")}
                      disabled={activating !== null}
                    >
                      {activating === "monthly" ? "Ativando..." : "ASSINAR AGORA"}
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-white/30">
            Sistema em modo demonstração — a ativação é instantânea para testes.
            Em produção, conecte um gateway de pagamento real.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#0A0A0A] p-12 text-white lg:flex">
        <Link to="/" className="text-white">
          <span className="font-display text-xl font-semibold">
            <span className="text-[#FFD000]">Mercado</span> Ecommerce
          </span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Transforme produtos em oportunidades de vendas
          </h2>
          <p className="mt-4 text-sm text-white/60">
            Organize seu catálogo, gere links oficiais de afiliado e acompanhe suas divulgações em um painel
            só. Resultados dependem do seu trabalho e da sua audiência — aqui você tem as ferramentas.
          </p>
        </div>
        <p className="flex items-start gap-2 text-xs text-white/40">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#FFD000]/60" />
          Nunca pedimos a senha da sua conta do Mercado Livre. A conexão é feita pelo fluxo oficial.
        </p>
      </div>

      <div className="flex items-center justify-center bg-[#0A0A0A] px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-display text-xl font-semibold text-white">
              <span className="text-[#FFD000]">Mercado</span> Ecommerce
            </span>
          </div>

          {recovering ? (
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-white">Recuperar senha</h1>
                <p className="mt-1 text-sm text-white/50">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-email" className="text-white/70">E-mail</Label>
                <Input id="rec-email" name="email" type="email" required placeholder="voce@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Button className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold" disabled={busy}>
                Enviar link de recuperação
              </Button>
              <Button type="button" variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/10" onClick={() => setRecovering(false)}>
                Voltar ao login
              </Button>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={setMode} className="mt-8">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                <TabsTrigger value="login" className="data-[state=active]:bg-[#FFD000] data-[state=active]:text-black text-white/60">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-[#FFD000] data-[state=active]:text-black text-white/60">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <h1 className="font-display text-2xl font-semibold text-white">Acesse sua conta</h1>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/70">E-mail</Label>
                    <Input id="login-email" name="email" type="email" required placeholder="voce@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/70">Senha</Label>
                    <Input id="login-password" name="password" type="password" required minLength={6} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecovering(true)}
                    className="text-xs font-medium text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                  <Button className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold" disabled={busy}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6 space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <h1 className="font-display text-2xl font-semibold text-white">Crie sua conta</h1>
                  <div className="space-y-2">
                    <Label htmlFor="su-name" className="text-white/70">Nome completo</Label>
                    <Input id="su-name" name="full_name" required placeholder="Seu nome" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email" className="text-white/70">E-mail</Label>
                    <Input id="su-email" name="email" type="email" required placeholder="voce@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password" className="text-white/70">Senha</Label>
                    <Input id="su-password" name="password" type="password" required minLength={6} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <Button className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold" disabled={busy}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!recovering && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-white/30">
                <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={handleGoogle}
              >
                Continuar com Google
              </Button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-white/30">
            <Link to="/" className="underline-offset-4 hover:underline">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
