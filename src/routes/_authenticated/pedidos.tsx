import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { brl, shortDate } from "@/lib/format";
import { fetchIntegration, fetchOrders } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos | Mercado Ecommerce" },
      { name: "description", content: "Acompanhe os pedidos vindos das suas divulgações." },
      { property: "og:title", content: "Pedidos | Mercado Ecommerce" },
      { property: "og:description", content: "Acompanhe os pedidos vindos das suas divulgações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const [tab, setTab] = React.useState("todos");
  const orders = useQuery({ queryKey: ["orders", uid], queryFn: () => fetchOrders(uid), enabled: !!uid });
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const connected = integration.data?.status === "connected";

  const rows = (orders.data ?? []).filter((o) => (tab === "todos" ? true : o.status === tab));

  return (
    <AppLayout title="Pedidos" description="Pedidos recebidos pela integração oficial.">
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
          <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={connected ? "Nenhum pedido neste filtro" : "Integração não configurada"}
          description={
            connected
              ? "Assim que houver pedidos com este status, eles aparecem aqui."
              : "Os pedidos só aparecem depois que sua conta do Mercado Livre estiver conectada. Não exibimos dados fictícios."
          }
          action={
            !connected && (
              <Button asChild>
                <Link to="/integracoes">Configurar integração</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.external_order_id ?? o.id.slice(0, 8)}</TableCell>
                  <TableCell>{o.product_title}</TableCell>
                  <TableCell>{shortDate(o.ordered_at)}</TableCell>
                  <TableCell>{brl(Number(o.amount))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{o.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
