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
      <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
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
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <div className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <item.icon className={cn("size-4", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
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
      {/* Premium Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* Gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        
        <div className="px-6 py-6">
          <Link to="/dashboard">
            <Logo />
          </Link>
        </div>
        
        <div className="mt-2 flex-1 overflow-y-auto px-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          <NavList isAdmin={isAdmin} />
        </div>
        
        <div className="m-4 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <p className="truncate text-sm font-semibold capitalize">{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 w-full border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" 
            onClick={signOut}
          >
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        {/* Premium Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-sidebar-border bg-sidebar p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <div className="flex h-full flex-col px-5 py-6">
                  <Link onClick={() => setOpen(false)} to="/dashboard">
                    <Logo />
                  </Link>
                  <div className="mt-6 flex-1 overflow-y-auto">
                    <NavList isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" 
                    onClick={signOut}
                  >
                    <LogOut className="size-4 mr-2" /> Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{title}</h1>
              {description && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
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
