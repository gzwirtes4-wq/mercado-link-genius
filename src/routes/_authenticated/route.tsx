"use client";

import * as React from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { session, loading, isAdmin } = useAuth();
  const userId = session?.user?.id;

  const access = useQuery({
    queryKey: ["access", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, plans(slug)")
        .eq("user_id", userId!)
        .maybeSingle();
      if (!data || data.status !== "active") return false;
      const slug = (data.plans as { slug: string } | null)?.slug;
      if (slug === "lifetime") return true;
      if (!data.current_period_end) return true;
      return new Date(data.current_period_end) > new Date();
    },
  });

  React.useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  React.useEffect(() => {
    if (!isAdmin && access.isSuccess && access.data === false) {
      navigate({ to: "/auth", search: { step: "plans" }, replace: true });
    }
  }, [isAdmin, access.isSuccess, access.data, navigate]);

  if (loading || !session) return <Splash />;
  if (!isAdmin && (access.isLoading || access.data === false)) return <Splash />;

  return <Outlet />;
}
