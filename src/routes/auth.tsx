import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | AfiliaHub" },
      {
        name: "description",
        content: "Acesse o painel AfiliaHub para organizar produtos, links e divulgações do Mercado Livre.",
      },
      { property: "og:title", content: "Entrar ou criar conta | AfiliaHub" },
      {
        property: "og:description",
        content: "Acesse o painel AfiliaHub para organizar produtos, links e divulgações do Mercado Livre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState("login");
  const [recovering, setRecovering] = React.useState(false);

  React.useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="text-primary-foreground">
          <span className="font-display text-xl font-semibold">AfiliaHub</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Transforme produtos em oportunidades de vendas
          </h2>
          <p className="mt-4 text-sm text-primary-foreground/75">
            Organize seu catálogo, gere links oficiais de afiliado e acompanhe suas divulgações em um painel
            só. Resultados dependem do seu trabalho e da sua audiência — aqui você tem as ferramentas.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Nunca pedimos a senha da sua conta do Mercado Livre. A conexão é feita pelo fluxo oficial.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          {recovering ? (
            <form onSubmit={handleRecover} className="mt-8 space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-email">E-mail</Label>
                <Input id="rec-email" name="email" type="email" required placeholder="voce@email.com" />
              </div>
              <Button className="w-full" disabled={busy}>
                Enviar link de recuperação
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setRecovering(false)}>
                Voltar ao login
              </Button>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={setMode} className="mt-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <h1 className="font-display text-2xl font-semibold">Acesse sua conta</h1>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input id="login-email" name="email" type="email" required placeholder="voce@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" name="password" type="password" required minLength={6} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecovering(true)}
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                  <Button className="w-full" disabled={busy}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <h1 className="font-display text-2xl font-semibold">Crie sua conta</h1>
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Nome completo</Label>
                    <Input id="su-name" name="full_name" required placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">E-mail</Label>
                    <Input id="su-email" name="email" type="email" required placeholder="voce@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Senha</Label>
                    <Input id="su-password" name="password" type="password" required minLength={6} />
                  </div>
                  <Button className="w-full" disabled={busy}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!recovering && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar com Google
              </Button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline-offset-4 hover:underline">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
