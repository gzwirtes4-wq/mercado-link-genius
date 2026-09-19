import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar nova senha | Mercado Ecommerce" },
      { name: "description", content: "Defina uma nova senha para acessar o painel AfiliaHub." },
      { property: "og:title", content: "Criar nova senha | Mercado Ecommerce" },
      { property: "og:description", content: "Defina uma nova senha para acessar o painel AfiliaHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      return toast.error("As senhas não coincidem");
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Não foi possível alterar a senha", { description: error.message });
    toast.success("Senha atualizada com sucesso");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="surface w-full max-w-sm space-y-4 p-6">
        <h1 className="font-display text-2xl font-semibold">Criar nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 6 caracteres.</p>
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" name="confirm" type="password" required minLength={6} />
        </div>
        <Button className="w-full" disabled={busy}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}
