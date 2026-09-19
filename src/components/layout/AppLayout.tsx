import * as React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Wallet,
  Plug,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Menu,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { firstName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/catalogo", label: "Catálogo", icon: Store },
  { to: "/meus-produtos", label: "Meus Produtos", icon: Package },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/integracoes", label: "Integrações", icon: Plug },
  { to: "/chamados", label: "Chamados", icon: LifeBuoy },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-base font-semibold">AfiliaHub</p>
          <p className="text-[11px] text-muted-foreground">Ferramentas para afiliados</p>
        </div>
      )}
    </div>
  );
}

function NavList({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const items = [...NAV, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck } as const] : [])];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4", active ? "opacity-100" : "opacity-70")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const name = firstName(profile?.full_name, user?.email);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Link to="/dashboard" className="px-1">
          <Logo />
        </Link>
        <div className="mt-7 flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          <NavList isAdmin={isAdmin} />
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="truncate text-sm font-medium capitalize">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <div className="flex h-full flex-col px-4 py-5">
                  <Logo />
                  <div className="mt-6 flex-1 overflow-y-auto">
                    <NavList isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
                  </div>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    <LogOut className="size-4" /> Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
              {description && (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
              )}
            </div>
            {actions}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
