import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { brl, shortDate } from "@/lib/format";
import { fetchCommissions, fetchIntegration } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | Mercado Ecommerce" },
      { name: "description", content: "Comissões disponíveis, pendentes e histórico." },
      { property: "og:title", content: "Financeiro | Mercado Ecommerce" },
      { property: "og:description", content: "Comissões disponíveis, pendentes e histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const commissions = useQuery({ queryKey: ["commissions", uid], queryFn: () => fetchCommissions(uid), enabled: !!uid });
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const connected = integration.data?.status === "connected";

  const rows = commissions.data ?? [];
  const sum = (status: string) =>
    rows.filter((c) => c.status === status).reduce((a, c) => a + Number(c.amount ?? 0), 0);

  const cards = [
    { label: "Disponível", value: sum("disponivel") },
    { label: "Pendente", value: sum("pendente") },
    { label: "Aprovado", value: sum("aprovado") },
  ];

  return (
    <AppLayout title="Financeiro" description="Suas comissões, sempre com dados reais da integração.">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-3 font-display text-2xl font-semibold">{brl(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={connected ? "Nenhuma comissão registrada" : "Integração não configurada"}
            description={
              connected
                ? "As comissões aparecem aqui conforme forem informadas pela integração oficial."
                : "Sem a conexão com o Mercado Livre não há comissões para mostrar. Não simulamos valores."
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
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Disponível em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{shortDate(c.created_at)}</TableCell>
                    <TableCell>{brl(Number(c.amount))}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status}</Badge>
                    </TableCell>
                    <TableCell>{shortDate(c.available_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
