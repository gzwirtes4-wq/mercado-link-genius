import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Mercado Ecommerce" },
      { name: "description", content: "Perfil, segurança e plano ativo." },
      { property: "og:title", content: "Configurações | Mercado Ecommerce" },
      { property: "og:description", content: "Perfil, segurança e plano ativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: String(form.get("full_name")), phone: String(form.get("phone")) })
      .eq("id", user?.id ?? "");
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado");
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível alterar a senha", { description: error.message });
      return;
    }
    toast.success("Senha alterada");
  };

  return (
    <AppLayout title="Configurações" description="Gerencie seu perfil e sua conta.">
      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="surface space-y-4 p-5">
          <h2 className="text-sm font-semibold">Perfil</h2>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <Button disabled={busy}>Salvar alterações</Button>
        </form>

        <form onSubmit={changePassword} className="surface h-fit space-y-4 p-5">
          <h2 className="text-sm font-semibold">Segurança</h2>
          <div className="space-y-2">
            <Label htmlFor="current_password">Senha atual</Label>
            <Input id="current_password" name="current_password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <Button disabled={busy}>Alterar senha</Button>
        </form>

        <div className="surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Plano e acesso</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{isAdmin ? "Administrador" : "Usuário"}</Badge>
            <span className="text-muted-foreground">
              Acesso às ferramentas da plataforma. A cobrança de planos ainda não está ativa nesta conta.
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
