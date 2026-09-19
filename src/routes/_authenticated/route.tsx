import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Verifica autenticação
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const userId = data.user.id;

    // 2. Verifica assinatura ativa (plano pago)
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("id, status, plan_id, current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      console.error("[Auth] Erro ao verificar assinatura:", subError.message);
    }

    // Se não tem assinatura ativa, redireciona para escolha de plano
    if (!sub) throw redirect({ to: "/auth?step=plans" });

    // Verifica expiração (planos mensais)
    if (sub.current_period_end) {
      const expiresAt = new Date(sub.current_period_end);
      const now = new Date();
      if (expiresAt < now) throw redirect({ to: "/auth?step=plans" });
    }

    return { user: data.user, subscription: sub };
  },
  component: () => <Outlet />,
});
