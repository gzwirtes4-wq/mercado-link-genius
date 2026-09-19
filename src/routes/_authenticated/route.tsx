"use client";

import * as React from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, cause }) => {
    const { user, profile } = context.auth;

    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: window.location.href } });
    }

    // Carrega a subscription para checar acesso
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const hasAccess =
      subscription?.status === "active" &&
      (subscription?.plan_id === "lifetime" ||
        (subscription?.current_period_end &&
          new Date(subscription.current_period_end) > new Date()));

    if (!hasAccess) {
      throw redirect({
        to: "/auth",
        search: { step: "plans", reason: "no_subscription" },
      });
    }

    return { user, profile, subscription };
  },
  component: LayoutComponent,
  errorComponent: AuthError,
});

function AuthError({ error }: { error: unknown }) {
  const navigate = useNavigate();
  const isRedirectError =
    error && typeof error === "object" && "url" in error && (error as { url: string }).url;

  if (isRedirectError) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] p-6">
      <Alert variant="destructive" className="max-w-md border-red-900 bg-red-950">
        <AlertTriangle className="size-4" />
        <AlertTitle>Erro de autenticação</AlertTitle>
        <AlertDescription>
          Não foi possível verificar seu acesso. Por favor, faça login novamente.
        </AlertDescription>
      </Alert>
      <Button onClick={() => navigate({ to: "/auth" })}>Voltar ao login</Button>
    </div>
  );
}

function LayoutComponent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
