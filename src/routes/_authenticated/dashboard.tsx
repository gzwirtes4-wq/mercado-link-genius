import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Link2,
  MousePointerClick,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Plug,
  Store,
  Zap,
  DollarSign,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { brl, greeting, firstName } from "@/lib/format";
import {
  fetchCommissions,
  fetchIntegration,
  fetchMyLinks,
  fetchMyProducts,
  fetchOrders,
  fetchProducts,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Mercado Ecommerce" },
      { name: "description", content: "Acompanhe produtos, links, cliques, pedidos e comissões." },
      { property: "og:title", content: "Dashboard | Mercado Ecommerce" },
      { property: "og:description", content: "Acompanhe produtos, links, cliques, pedidos e comissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  isHighlight,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string | undefined;
  trend?: string | undefined;
  isHighlight?: boolean | undefined;
}) {
  return (
    <div className={`surface group relative overflow-hidden p-5 transition-all duration-300 hover:shadow-[var(--shadow-lift)] ${isHighlight ? 'border-primary/30' : ''}`}>
      {isHighlight && (
        <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/10 blur-2xl" />
      )}
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`grid size-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${isHighlight ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
          <Icon className={`size-5 ${isHighlight ? '' : ''}`} />
        </div>
      </div>
      <div className="relative mt-4">
        <p className="font-display text-3xl font-bold">{value}</p>
        {trend && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="size-3" /> {trend}
          </p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, profile } = useAuth();
  const uid = user?.id ?? "";

  const myProducts = useQuery({ queryKey: ["my-products", uid], queryFn: () => fetchMyProducts(uid), enabled: !!uid });
  const links = useQuery({ queryKey: ["links", uid], queryFn: () => fetchMyLinks(uid), enabled: !!uid });
  const orders = useQuery({ queryKey: ["orders", uid], queryFn: () => fetchOrders(uid), enabled: !!uid });
  const commissions = useQuery({ queryKey: ["commissions", uid], queryFn: () => fetchCommissions(uid), enabled: !!uid });
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const featured = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const clicks = (links.data ?? []).reduce((acc, l) => acc + (l.clicks ?? 0), 0);
  const sales = (orders.data ?? []).filter((o) => o.status === "aprovado").length;
  const commissionTotal = (commissions.data ?? []).reduce((a, c) => a + Number(c.amount ?? 0), 0);
  const connected = integration.data?.status === "connected";

  const clicksByProduct = (links.data ?? [])
    .map((l) => ({
      name:
        (myProducts.data ?? []).find((p) => p.product_id === l.product_id)?.products?.title?.slice(0, 18) ??
        "Produto",
      cliques: l.clicks ?? 0,
    }))
    .slice(0, 6);

  const ordersByMonth = Object.values(
    (orders.data ?? []).reduce<Record<string, { mes: string; pedidos: number; comissao: number }>>((acc, o) => {
      const key = new Date(o.ordered_at).toLocaleDateString("pt-BR", { month: "short" });
      acc[key] = acc[key] ?? { mes: key, pedidos: 0, comissao: 0 };
      acc[key].pedidos += 1;
      return acc;
    }, {}),
  );

  return (
    <AppLayout
      title={`${greeting()}, ${firstName(profile?.full_name, user?.email)}`}
      description="Encontre produtos, prepare suas divulgações e acompanhe seus resultados."
      actions={
        <Button asChild size="sm" className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/catalogo">
            <Store className="size-4 mr-2" /> Explorar catálogo
          </Link>
        </Button>
      }
    >
      {/* Premium Integration Alert */}
      {!connected && (
        <div className="surface mb-6 flex flex-col gap-3 border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plug className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Integração não configurada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Conecte sua conta do Mercado Livre pelo fluxo oficial para receber pedidos e comissões reais.
                Até lá, vendas e comissões ficam zeradas — nada é simulado.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/integracoes">Configurar</Link>
          </Button>
        </div>
      )}

      {connected && (
        <div className="surface mb-6 flex items-center gap-4 border-success/30 bg-success/5 p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success text-success-foreground">
            <Zap className="size-5" />
          </div>
          <div className="flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <Store className="size-4" /> Mercado Livre conectado
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Conta: {integration.data?.account_identifier} • Suas vendas e comissões aparecem em tempo real
            </p>
          </div>
        </div>
      )}

      {/* Premium Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={Package} label="Produtos" value={String(myProducts.data?.length ?? 0)} isHighlight />
        <StatCard icon={Link2} label="Links" value={String(links.data?.length ?? 0)} />
        <StatCard icon={MousePointerClick} label="Cliques" value={clicks.toLocaleString("pt-BR")} isHighlight />
        <StatCard
          icon={DollarSign}
          label="Vendas"
          value={String(sales)}
          hint={connected ? undefined : "Aguardando integração"}
        />
        <StatCard
          icon={Wallet}
          label="Comissão"
          value={brl(commissionTotal)}
          hint={connected ? undefined : "Aguardando integração"}
          isHighlight
        />
        <StatCard icon={ShoppingBag} label="Pedidos" value={String(orders.data?.length ?? 0)} />
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cliques por produto</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{clicks} cliques</Badge>
          </div>
          {clicksByProduct.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10">
                <MousePointerClick className="size-5 text-primary" />
              </div>
              <p className="mt-4 text-sm font-medium">Nenhum clique ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gere links em Meus Produtos para começar a medir.
              </p>
            </div>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clicksByProduct}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-lg)' 
                    }}
                  />
                  <Bar dataKey="cliques" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pedidos ao longo do tempo</h2>
            <Badge variant="secondary" className="bg-success/10 text-success">{orders.data?.length ?? 0} pedidos</Badge>
          </div>
          {ordersByMonth.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-muted">
                <TrendingUp className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">Sem pedidos registrados</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Os dados aparecem aqui quando a integração oficial estiver ativa.
              </p>
            </div>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ordersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-lg)' 
                    }}
                  />
                  <defs>
                    <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="pedidos" 
                    stroke="var(--primary)" 
                    fill="url(#colorPedidos)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Featured Products */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Produtos em destaque</h2>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/catalogo">Ver catálogo →</Link>
          </Button>
        </div>
        {(featured.data ?? []).length === 0 ? (
          <EmptyState icon={Store} title="Catálogo vazio" description="Nenhum produto disponível no momento." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(featured.data ?? []).slice(0, 4).map((p) => (
              <div key={p.id} className="surface group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]">
                {p.image_url && (
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img 
                      src={p.image_url} 
                      alt={p.title} 
                      loading="lazy" 
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                )}
                <div className="p-4">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.category}
                  </Badge>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold">{p.title}</p>
                  <p className="mt-2 font-display text-xl font-bold">{brl(Number(p.price))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
