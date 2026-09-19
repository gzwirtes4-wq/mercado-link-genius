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
      { title: "Dashboard | AfiliaHub" },
      { name: "description", content: "Acompanhe produtos, links, cliques, pedidos e comissões." },
      { property: "og:title", content: "Dashboard | AfiliaHub" },
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
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="grid size-8 place-items-center rounded-lg bg-accent">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
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
      description="Visão geral da sua operação de afiliado."
      actions={
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/catalogo">
            <Store className="size-4" /> Explorar catálogo
          </Link>
        </Button>
      }
    >
      {!connected && (
        <div className="surface mb-6 flex flex-col gap-3 border-brand/40 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Plug className="size-4" /> Integração não configurada
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte sua conta do Mercado Livre pelo fluxo oficial para receber pedidos e comissões reais.
              Até lá, vendas e comissões ficam zeradas — nada é simulado.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/integracoes">Configurar</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Package} label="Produtos cadastrados" value={String(myProducts.data?.length ?? 0)} />
        <StatCard icon={Link2} label="Links gerados" value={String(links.data?.length ?? 0)} />
        <StatCard icon={MousePointerClick} label="Cliques" value={clicks.toLocaleString("pt-BR")} />
        <StatCard
          icon={TrendingUp}
          label="Vendas"
          value={String(sales)}
          hint={connected ? undefined : "Aguardando integração"}
        />
        <StatCard
          icon={Wallet}
          label="Comissão"
          value={brl(commissionTotal)}
          hint={connected ? undefined : "Aguardando integração"}
        />
        <StatCard icon={ShoppingBag} label="Pedidos" value={String(orders.data?.length ?? 0)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-sm font-semibold">Cliques por produto</h2>
          {clicksByProduct.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">
              Ainda não há cliques registrados. Gere links em Meus Produtos para começar a medir.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clicksByProduct}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cliques" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface p-5">
          <h2 className="text-sm font-semibold">Pedidos ao longo do tempo</h2>
          {ordersByMonth.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">
              Sem pedidos registrados. Os dados aparecem aqui quando a integração oficial estiver ativa.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ordersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area dataKey="pedidos" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Produtos em destaque</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
        {(featured.data ?? []).length === 0 ? (
          <EmptyState icon={Store} title="Catálogo vazio" description="Nenhum produto disponível no momento." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(featured.data ?? []).slice(0, 4).map((p) => (
              <div key={p.id} className="surface overflow-hidden">
                {p.image_url && (
                  <img src={p.image_url} alt={p.title} loading="lazy" className="h-32 w-full object-cover" />
                )}
                <div className="p-4">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.category}
                  </Badge>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</p>
                  <p className="mt-2 font-display text-base font-semibold">{brl(Number(p.price))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
