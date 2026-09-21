import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Plus, CheckCircle2, XCircle, ShieldCheck, Loader2, UserCog, X, Check } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shortDate } from "@/lib/format";
import { fetchProducts, fetchTickets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Mercado Ecommerce" },
      { name: "description", content: "Painel administrativo de usuários, produtos e chamados." },
      { property: "og:title", content: "Admin | Mercado Ecommerce" },
      { property: "og:description", content: "Painel administrativo de usuários, produtos e chamados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, is_active, validated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, slug, price_cents")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const subs = useQuery({
    queryKey: ["admin-subs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, plan_id, status, current_period_end, plans(name, slug)");
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

  // ── Dialogs state ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editPlanOpen, setEditPlanOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");

  // ── Create user form ─────────────────────────────────────────────────────
  const [createEmail, setCreateEmail] = React.useState("");
  const [createName, setCreateName] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createPlanSlug, setCreatePlanSlug] = React.useState<string>("lifetime");

  const createUser = useMutation({
    mutationFn: async () => {
      const plan = plans.data?.find((p) => p.slug === createPlanSlug);
      const planId = plan?.id ?? plans.data?.[0]?.id ?? null;

      // Create via edge function for consistent setup
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/create-admin-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            email: createEmail,
            password: createPassword,
            name: createName,
            plan_id: planId,
            plan_slug: createPlanSlug,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Erro ao criar usuário");
      }
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso");
      setCreateOpen(false);
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("");
      void qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      void qc.invalidateQueries({ queryKey: ["admin-subs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Toggle active ────────────────────────────────────────────────────────
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", id);
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      void qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Validate user ────────────────────────────────────────────────────────
  const validateUser = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("profiles")
        .update({ validated_at: new Date().toISOString(), is_active: true })
        .eq("id", id);
    },
    onSuccess: () => {
      toast.success("Usuário validado");
      void qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Set plan ──────────────────────────────────────────────────────────────
  const setPlan = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !selectedPlanId) return;
      const plan = plans.data?.find((p) => p.id === selectedPlanId);
      if (!plan) return;

      const isLifetime = plan.slug === "lifetime";
      await supabase.from("subscriptions").upsert(
        {
          user_id: selectedUser.id,
          plan_id: selectedPlanId,
          status: "active",
          current_period_end: isLifetime ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    onSuccess: () => {
      toast.success("Plano atualizado");
      setEditPlanOpen(false);
      setSelectedUser(null);
      setSelectedPlanId("");
      void qc.invalidateQueries({ queryKey: ["admin-subs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Open edit plan dialog ────────────────────────────────────────────────
  const openEditPlan = (u: { id: string; email: string; full_name: string | null }) => {
    setSelectedUser(u);
    const currentSub = subs.data?.find((s) => s.user_id === u.id);
    setSelectedPlanId(currentSub?.plan_id ?? "");
    setEditPlanOpen(true);
  };

  const subFor = (userId: string) => subs.data?.find((s) => s.user_id === userId);

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

      {/* ── User Management ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Gestão de Usuários</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-2" /> Novo usuário
          </Button>
        </div>

        <div className="surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validação</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles.data ?? []).map((p) => {
                const sub = subFor(p.id);
                const planName = (sub?.plans as { name: string } | null)?.name ?? "—";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      {planName !== "—" ? (
                        <Badge variant="secondary">{planName}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem plano</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.is_active !== false ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1">
                          <CheckCircle2 className="size-3" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="size-3" /> Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.validated_at ? (
                        <Badge variant="outline" className="gap-1 border-success/30 text-success">
                          <ShieldCheck className="size-3" /> Validado
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => validateUser.mutate(p.id)}
                          disabled={validateUser.isPending}
                        >
                          <ShieldCheck className="size-3" /> Validar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{shortDate(p.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => openEditPlan(p)}
                        >
                          <UserCog className="size-3" /> Plano
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 gap-1 ${p.is_active !== false ? "text-amber-500 hover:text-amber-400" : "text-success hover:text-success"}`}
                          onClick={() => toggleActive.mutate({ id: p.id, isActive: p.is_active === false })}
                          disabled={toggleActive.isPending}
                        >
                          {p.is_active !== false ? (
                            <><XCircle className="size-3" /> Desativar</>
                          ) : (
                            <><CheckCircle2 className="size-3" /> Ativar</>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {profiles.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Platform Stats ──────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
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
              {tickets.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum chamado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="surface overflow-x-auto">
          <p className="border-b border-border p-4 text-sm font-semibold">Planos disponíveis</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Preço (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plans.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.slug}</Badge></TableCell>
                  <TableCell>{(p.price_cents / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Dialog: Create User ──────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-5" /> Criar novo usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome completo</Label>
              <Input
                id="new-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={createPlanSlug} onValueChange={setCreatePlanSlug}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.slug}>
                      {p.name} {p.slug === "lifetime" ? "(Vitalício)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createUser.mutate()}
              disabled={!createEmail || !createPassword || createUser.isPending}
            >
              {createUser.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Plan ────────────────────────────────────────────── */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano de {selectedUser?.full_name ?? selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.slug === "lifetime" ? "(Vitalício)" : ""} — R$ {(p.price_cents / 100).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => setPlan.mutate()}
              disabled={!selectedPlanId || setPlan.isPending}
            >
              {setPlan.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
