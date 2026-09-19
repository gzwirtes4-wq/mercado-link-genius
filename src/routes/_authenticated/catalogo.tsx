import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Store } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { fetchMyProducts, fetchProducts, type Product } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo | AfiliaHub" },
      { name: "description", content: "Busque produtos por categoria, preço, avaliação e popularidade." },
      { property: "og:title", content: "Catálogo | AfiliaHub" },
      { property: "og:description", content: "Busque produtos por categoria, preço, avaliação e popularidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();

  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const mine = useQuery({ queryKey: ["my-products", uid], queryFn: () => fetchMyProducts(uid), enabled: !!uid });

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("todas");
  const [sort, setSort] = React.useState("popularidade");
  const [minRating, setMinRating] = React.useState("0");
  const [maxPrice, setMaxPrice] = React.useState(2000);
  const [selected, setSelected] = React.useState<Product | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const savedIds = new Set((mine.data ?? []).map((p) => p.product_id));

  const save = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("user_products").insert({ user_id: uid, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto cadastrado em Meus Produtos");
      void qc.invalidateQueries({ queryKey: ["my-products", uid] });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível cadastrar", {
        description: e.message.includes("duplicate") ? "Este produto já está na sua lista." : e.message,
      }),
  });

  const categories = Array.from(new Set((products.data ?? []).map((p) => p.category))).sort();

  const filtered = (products.data ?? [])
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (q && !`${p.title} ${p.category}`.toLowerCase().includes(q)) return false;
      if (category !== "todas" && p.category !== category) return false;
      if (Number(p.rating) < Number(minRating)) return false;
      if (Number(p.price) > maxPrice) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "preco-asc") return Number(a.price) - Number(b.price);
      if (sort === "preco-desc") return Number(b.price) - Number(a.price);
      if (sort === "avaliacao") return Number(b.rating) - Number(a.rating);
      if (sort === "novidades") return Number(b.is_new) - Number(a.is_new);
      return b.sold_quantity - a.sold_quantity;
    });

  return (
    <AppLayout title="Catálogo" description="Encontre produtos para divulgar.">
      <div className="surface mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por produto ou categoria..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="size-4" /> Filtros
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ordenar por</label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularidade">Mais vendidos</SelectItem>
                  <SelectItem value="novidades">Novidades</SelectItem>
                  <SelectItem value="avaliacao">Melhor avaliação</SelectItem>
                  <SelectItem value="preco-asc">Menor preço</SelectItem>
                  <SelectItem value="preco-desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Avaliação mínima</label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Qualquer</SelectItem>
                  <SelectItem value="4">4+ estrelas</SelectItem>
                  <SelectItem value="4.5">4,5+ estrelas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Preço até {brl(maxPrice)}
              </label>
              <Slider
                value={[maxPrice]}
                min={50}
                max={2000}
                step={50}
                onValueChange={(v) => setMaxPrice(v[0] ?? 2000)}
                className="pt-3"
              />
            </div>
          </div>
        )}
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Este catálogo é um conjunto de exemplos para você testar as ferramentas. Após conectar sua conta do
        Mercado Livre em Integrações, os produtos reais da API oficial aparecem aqui.
      </p>

      {products.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando produtos...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nenhum produto encontrado"
          description="Ajuste a busca ou os filtros para ver outros resultados."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              saved={savedIds.has(p.id)}
              busy={save.isPending}
              onSave={() => save.mutate(p.id)}
              onOpen={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      <ProductDialog product={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </AppLayout>
  );
}
