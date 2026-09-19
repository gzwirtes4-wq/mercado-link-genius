import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shortDate } from "@/lib/format";
import { fetchTickets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Chamados | AfiliaHub" },
      { name: "description", content: "Abra e acompanhe chamados de suporte." },
      { property: "og:title", content: "Chamados | AfiliaHub" },
      { property: "og:description", content: "Abra e acompanhe chamados de suporte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chamados,
});

function Chamados() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const [category, setCategory] = React.useState("Geral");
  const [priority, setPriority] = React.useState("media");

  const tickets = useQuery({ queryKey: ["tickets", uid], queryFn: () => fetchTickets(uid), enabled: !!uid });

  const create = useMutation({
    mutationFn: async (payload: { subject: string; message: string }) => {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: uid,
        subject: payload.subject,
        message: payload.message,
        category,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado aberto");
      void qc.invalidateQueries({ queryKey: ["tickets", uid] });
    },
    onError: (e: Error) => toast.error("Não foi possível abrir o chamado", { description: e.message }),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    create.mutate({ subject: String(form.get("subject")), message: String(form.get("message")) });
    e.currentTarget.reset();
  };

  const rows = tickets.data ?? [];

  return (
    <AppLayout title="Chamados" description="Fale com o suporte da plataforma.">
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="surface h-fit space-y-4 p-5">
          <h2 className="text-sm font-semibold">Novo chamado</h2>
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" name="subject" required placeholder="Resumo do problema" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral</SelectItem>
                <SelectItem value="Integração">Integração</SelectItem>
                <SelectItem value="Financeiro">Financeiro</SelectItem>
                <SelectItem value="Conta">Conta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" name="message" required rows={5} placeholder="Descreva o que aconteceu" />
          </div>
          <Button className="w-full" disabled={create.isPending}>
            Abrir chamado
          </Button>
        </form>

        <div className="space-y-3">
          {rows.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Nenhum chamado ainda"
              description="Quando você abrir um chamado, o acompanhamento aparece aqui."
            />
          ) : (
            rows.map((t) => (
              <div key={t.id} className="surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t.subject}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{t.priority}</Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.category} • aberto em {shortDate(t.created_at)}
                </p>
                {t.admin_response && (
                  <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-medium">Suporte:</span> {t.admin_response}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
