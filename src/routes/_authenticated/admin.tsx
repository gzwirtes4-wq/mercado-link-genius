import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shortDate } from "@/lib/format";
import { fetchProducts, fetchTickets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | AfiliaHub" },
      { name: "description", content: "Painel administrativo de usuários, produtos e chamados." },
      { property: "og:title", content: "Admin | AfiliaHub" },
      { property: "og:description", content: "Painel administrativo de usuários, produtos e chamados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, user } = useAuth();

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled: isAdmin });
  const tickets = useQuery({
    queryKey: ["admin-tickets"],
    enabled: isAdmin,
    queryFn: () => fetchTickets(user?.id ?? "", true),
  });

  if (!isAdmin) {
    return (
      <AppLayout title="Admin" description="Área restrita.">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Esta área é exclusiva para administradores da plataforma."
        />
      </AppLayout>
    );
  }

  const stats = [
    { label: "Usuários", value: profiles.data?.length ?? 0 },
    { label: "Produtos no catálogo", value: products.data?.length ?? 0 },
    { label: "Chamados", value: tickets.data?.length ?? 0 },
    { label: "Chamados abertos", value: (tickets.data ?? []).filter((t) => t.status === "aberto").length },
  ];

  return (
    <AppLayout title="Painel administrativo" description="Visão geral da plataforma.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="surface overflow-x-auto">
          <p className="border-b border-border p-4 text-sm font-semibold">Usuários</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.full_name ?? "-"}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{shortDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="surface overflow-x-auto">
          <p className="border-b border-border p-4 text-sm font-semibold">Chamados</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assunto</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tickets.data ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell>{t.priority}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
