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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { fetchMyProducts, fetchProducts, fetchIntegration, type Product } from "@/lib/queries";

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
  const integration = useQuery({ queryKey: ["integration", uid], queryFn: () => fetchIntegration(uid), enabled: !!uid });
  const connected = integration.data?.status === "connected";

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
    <AppLayout title="Catálogo" description="Escolha produtos para divulgar e prepare seus anúncios.">
      {!connected && (
        <div className="surface mb-6 flex flex-col gap-3 border-brand/40 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Integração não configurada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte sua conta do Mercado Livre para visualizar produtos reais do programa de afiliados.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <a href="/integracoes">Configurar</a>
          </Button>
        </div>
      )}

      <div className="surface mb-6 p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto ou categoria"
            className="h-12 pl-12 text-base"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="size-4" /> Filtros
          </Button>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularidade">Mais vendidos</SelectItem>
              <SelectItem value="novidades">Novidades</SelectItem>
              <SelectItem value="avaliacao">Melhor avaliação</SelectItem>
              <SelectItem value="preco-asc">Menor preço</SelectItem>
              <SelectItem value="preco-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Avaliação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Qualquer avaliação</SelectItem>
              <SelectItem value="4">4+ estrelas</SelectItem>
              <SelectItem value="4.5">4,5+ estrelas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <div className="mt-5 border-t border-border pt-4">
            <label className="mb-3 block text-sm font-medium">
              Preço até {brl(maxPrice)}
            </label>
            <Slider
              value={[maxPrice]}
              min={50}
              max={2000}
              step={50}
              onValueChange={(v) => setMaxPrice(v[0] ?? 2000)}
              className="max-w-md"
            />
          </div>
        )}
      </div>

      {products.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando produtos...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nenhum produto encontrado"
          description="Ajuste a busca ou os filtros para ver outros resultados."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
