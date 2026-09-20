import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Megaphone, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { ProductDialog } from "@/components/ProductDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, shortDate } from "@/lib/format";
import { fetchIntegration, fetchMyLinks, fetchMyProducts, type Product } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/meus-produtos")({
  head: () => ({
    meta: [
      { title: "Meus Produtos | Mercado Ecommerce" },
      { name: "description", content: "Produtos salvos, links de afiliado e cliques." },
      { property: "og:title", content: "Meus Produtos | Mercado Ecommerce" },
      { property: "og:description", content: "Produtos salvos, links de afiliado e cliques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeusProdutos,
});

function MeusProdutos() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<Product | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const mine = useQuery({ queryKey: ["my-products", uid], queryFn: () => fetchMyProducts(uid), enabled: !!uid });
  const links = useQuery({ queryKey: ["links", uid], queryFn: () => fetchMyLinks(uid), enabled: !!uid });
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const connected = integration.data?.status === "connected";

  const linkFor = (productId: string) => links.data?.find((l) => l.product_id === productId);

  const generate = useMutation({
    mutationFn: async (p: Product) => {
      if (!connected) throw new Error("integration");
      const base = p.permalink ?? "https://www.mercadolivre.com.br";
      const tag = integration.data?.account_identifier ?? uid.slice(0, 8);
      const { error } = await supabase
        .from("affiliate_links")
        .insert({ user_id: uid, product_id: p.id, url: `${base}?matt_word=${tag}` });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link gerado");
      void qc.invalidateQueries({ queryKey: ["links", uid] });
    },
    onError: (e: Error) =>
      e.message === "integration"
        ? toast.error("Integração não configurada", {
            description: "Conecte sua conta do Mercado Livre para gerar links oficiais.",
          })
        : toast.error("Não foi possível gerar o link", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      setRemoving(null);
      void qc.invalidateQueries({ queryKey: ["my-products", uid] });
    },
  });

  const rows = mine.data ?? [];

  return (
    <AppLayout title="Meus Produtos" description="Sua seleção de produtos e links.">
      {!connected && (
        <div className="surface mb-5 p-4 text-sm">
          <p className="font-semibold">Integração não configurada</p>
          <p className="mt-1 text-muted-foreground">
            A geração de links de afiliado depende da conexão oficial com o Mercado Livre.{" "}
            <Link to="/integracoes" className="underline underline-offset-4">
              Configurar agora
            </Link>
            .
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Explore o catálogo e cadastre os produtos que você quer divulgar."
          action={
            <Button asChild>
              <Link to="/catalogo">Ir para o catálogo</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const p = row.products;
            if (!p) return null;
            const link = linkFor(p.id);
            return (
              <div key={row.id} className="surface flex flex-col p-4">
                <div className="flex gap-3">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.title} loading="lazy" className="size-16 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {brl(Number(p.price))} • cadastrado em {shortDate(row.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{row.status}</Badge>
                  <Badge variant="outline">{link?.clicks ?? 0} cliques</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {link ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(link.url);
                        toast.success("Link copiado");
                      }}
                    >
                      <Copy className="size-4" /> Copiar link
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => generate.mutate(p)} disabled={generate.isPending}>
                      <Link2 className="size-4" /> Gerar link
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelected(p)}>
                    <Megaphone className="size-4" /> Criar anúncio
                  </Button>
                  <Button variant="ghost" size="sm" className="col-span-2 text-destructive" onClick={() => setRemoving(row.id)}>
                    <Trash2 className="size-4" /> Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog
        product={selected}
        link={(selected ? linkFor(selected.id)?.url : undefined) ?? ""}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />

      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto sai da sua lista. O link gerado para ele também deixa de ficar disponível aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && remove.mutate(removing)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
