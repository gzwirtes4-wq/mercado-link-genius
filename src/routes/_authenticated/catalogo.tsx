import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShoppingBag,
  Star,
  Truck,
  Plus,
  Copy,
  Check,
  Loader2,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import {
  fetchProducts,
  fetchMyProducts,
  fetchIntegration,
  fetchMyLinks,
  fetchProductById,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo | AfiliaHub" },
      { name: "description", content: "Explore o catálogo de produtos do Mercado Livre para divulgar." },
    ],
  }),
  component: CatalogoPage,
});

// ─── Mercado Livre API Config ────────────────────────────────────────────────
// Configure no ambiente:
// VITE_MELI_ACCESS_TOKEN=seu_access_token_de_aplicativo
//
// Docs: https://developers.mercadolivre.com.br/pt_br/gerenciar-seu-aplicativo
// O token de aplicativo permite buscar produtos públicos do catálogo.
//
const MELI_ACCESS_TOKEN = import.meta.env.VITE_MELI_ACCESS_TOKEN as string | undefined;
const MELI_API_BASE = "https://api.mercadolivre.com.br";

interface MeliProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  category_id: string;
  sold_quantity: number;
  reviews_rating: number;
  reviews_total: number;
  shipping: { free_shipping: boolean };
  condition: string;
  original_price: number | null;
}

interface MeliCategory {
  id: string;
  name: string;
  path_from_root: { id: string; name: string }[];
}

// ─── Fetch Categories ────────────────────────────────────────────────────────
async function fetchMeliCategories(): Promise<{ id: string; name: string }[]> {
  const popularCategories = [
    { id: "MLB1055", name: "Celulares e Telefones" },
    { id: "MLB1648", name: "Computadores" },
    { id: "MLB1000", name: "Eletrônicos" },
    { id: "MLB5726", name: "Acessórios de Moda" },
    { id: "MLB1276", name: "Games" },
    { id: "MLB1574", name: "Esporte e Fitness" },
    { id: "MLB1384", name: "Beleza e Cuidado" },
    { id: "MLB1500", name: "Casa e Móveis" },
    { id: "MLB1744", name: "Ferramentas" },
    { id: "MLB1039", name: "Música e Instrumentos" },
  ];

  if (!MELI_ACCESS_TOKEN) return popularCategories;

  try {
    const res = await fetch(
      `${MELI_API_BASE}/sites/MLB/categories`,
      { headers: { Authorization: `Bearer ${MELI_ACCESS_TOKEN}` } },
    );
    if (!res.ok) return popularCategories;
    const categories: { id: string; name: string }[] = await res.json();
    return categories.slice(0, 20);
  } catch {
    return popularCategories;
  }
}

// ─── Fetch Meli Products ─────────────────────────────────────────────────────
async function fetchMeliProducts(params: {
  query: string;
  category: string;
  sort: string;
  offset: number;
  limit: number;
}): Promise<{ items: MeliProduct[]; total: number }> {
  if (!MELI_ACCESS_TOKEN) return { items: [], total: 0 };

  try {
    let url: string;
    if (params.query) {
      url = `${MELI_API_BASE}/sites/MLB/search?q=${encodeURIComponent(params.query)}&offset=${params.offset}&limit=${params.limit}`;
      if (params.category && params.category !== "all") url += `&category=${params.category}`;
      if (params.sort) url += `&sort=${params.sort}`;
    } else if (params.category && params.category !== "all") {
      url = `${MELI_API_BASE}/sites/MLB/search?category=${params.category}&offset=${params.offset}&limit=${params.limit}`;
      if (params.sort) url += `&sort=${params.sort}`;
    } else {
      url = `${MELI_API_BASE}/sites/MLB/search?offset=${params.offset}&limit=${params.limit}`;
    }

    const res = await fetch(url, { headers: { Authorization: `Bearer ${MELI_ACCESS_TOKEN}` } });
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return { items: data.results ?? [], total: data.paging?.total ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

// ─── Generate / Save Affiliate Link ─────────────────────────────────────────
async function generateAffiliateLink(userId: string, product: MeliProduct): Promise<string> {
  const { data: existing } = await supabase
    .from("affiliate_links")
    .select("url, id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existing) return existing.url;

  // Usa o permalink oficial do Mercado Livre — em produção, substitua pelo link
  // de afiliado real através da API do programa de associados do Mercado Livre.
  const linkUrl = product.permalink;

  const shortCode = Math.random().toString(36).slice(2, 8);
  await supabase.from("affiliate_links").insert({
    user_id: userId,
    product_id: product.id,
    url: linkUrl,
    short_code: shortCode,
    clicks: 0,
  });
  return linkUrl;
}

// ─── Add to My Products ──────────────────────────────────────────────────────
async function addToMyProducts(userId: string, product: MeliProduct): Promise<void> {
  const { data: saved, error: upsertError } = await supabase
    .from("products")
    .upsert(
      {
        external_id: product.id,
        title: product.title,
        price: product.price,
        original_price: product.original_price ?? null,
        category: product.category_id ?? "Geral",
        image_url: product.thumbnail,
        permalink: product.permalink,
        rating: product.reviews_rating ?? 0,
        reviews_count: product.reviews_total ?? 0,
        sold_quantity: product.sold_quantity ?? 0,
        free_shipping: product.shipping?.free_shipping ?? false,
        source: "mercadolivre",
        active: true,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .maybeSingle();

  if (upsertError || !saved) {
    toast.error("Não foi possível salvar o produto");
    return;
  }

  const { data: existing } = await supabase
    .from("user_products")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", saved.id)
    .maybeSingle();

  if (existing) {
    toast.info("Este produto já está na sua lista");
    return;
  }

  await supabase.from("user_products").insert({
    user_id: userId,
    product_id: saved.id,
    status: "ativo",
  });
}

// ─── Local Product type ──────────────────────────────────────────────────────
type LocalProduct = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  permalink: string | null;
  rating: number;
  reviews_count: number;
  sold_quantity: number;
  free_shipping: boolean;
  source: string;
  is_new: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────
function CatalogoPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sort, setSort] = React.useState("relevance");
  const [page, setPage] = React.useState(0);
  const [selectedProduct, setSelectedProduct] = React.useState<MeliProduct | LocalProduct | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [linkLoadingId, setLinkLoadingId] = React.useState<string | null>(null);

  const limit = 24;

  const { data: categories = [] } = useQuery({
    queryKey: ["meli-categories"],
    queryFn: fetchMeliCategories,
  });

  const { data: meliResult, isLoading: meliLoading } = useQuery({
    queryKey: ["meli-products", search, category, sort, page],
    queryFn: () =>
      fetchMeliProducts({ query: search, category, sort: sort === "relevance" ? "" : sort, offset: page * limit, limit }),
    enabled: Boolean(MELI_ACCESS_TOKEN),
  });

  const { data: localProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    enabled: !MELI_ACCESS_TOKEN,
  });

  const { data: myProducts = [] } = useQuery({
    queryKey: ["my-products", uid],
    queryFn: () => fetchMyProducts(uid),
    enabled: !!uid,
  });

  const { data: myLinks = [] } = useQuery({
    queryKey: ["links", uid],
    queryFn: () => fetchMyLinks(uid),
    enabled: !!uid,
  });

  const { data: integration } = useQuery({
    queryKey: ["integration", uid],
    queryFn: () => fetchIntegration(uid),
    enabled: !!uid,
  });

  const addMutation = useMutation({
    mutationFn: async (product: MeliProduct | LocalProduct) => {
      const p = product as MeliProduct;
      await addToMyProducts(uid, p);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products", uid] });
      toast.success("Produto adicionado à sua lista!");
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (product: MeliProduct | LocalProduct) => {
      const p = product as MeliProduct;
      return generateAffiliateLink(uid, p);
    },
    onSuccess: (url) => {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    },
  });

  const handleCopy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPages = meliResult ? Math.ceil(meliResult.total / limit) : 0;
  const isMeliConnected = Boolean(MELI_ACCESS_TOKEN);
  const isUserConnected = integration?.status === "connected";

  return (
    <AppLayout
      title="Catálogo"
      description={
        isMeliConnected
          ? "Explore produtos do Mercado Livre para divulgar como afiliado."
          : "Catálogo de produtos disponíveis para divulgação."
      }
    >
      {/* Filters */}
      <div className="surface mb-6 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevância</SelectItem>
                <SelectItem value="price_asc">Menor preço</SelectItem>
                <SelectItem value="price_desc">Maior preço</SelectItem>
                <SelectItem value="sold_quantity_desc">Mais vendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isMeliConnected && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-[#FFD000]/10 text-[#FFD000] border-[#FFD000]/20">
              <ShoppingBag className="mr-1 size-3" />
              Mercado Livre conectado — {meliResult?.total.toLocaleString("pt-BR") ?? 0} produtos encontrados
            </Badge>
            {!isUserConnected && (
              <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
                <AlertCircle className="mr-1 size-3" />
                <Link to="/integracoes">Conecte sua conta</Link> para rastrear vendas
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {isMeliConnected ? (
        meliLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface animate-pulse space-y-3 p-4">
                <div className="aspect-[4/3] rounded-xl bg-muted" />
                <div className="h-4 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-6 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : meliResult?.items.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum produto encontrado"
            description="Tente ajustar os filtros ou buscar outro termo."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {meliResult?.items.map((p) => {
              const isSaved = myProducts.some((mp) => mp.product_id === p.id);
              const hasLink = myLinks.some((ml) => ml.product_id === p.id);
              const savedLink = myLinks.find((ml) => ml.product_id === p.id);

              return (
                <div key={p.id} className="surface group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]">
                  {p.thumbnail && (
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer" onClick={() => setSelectedProduct(p)}>
                      <img
                        src={p.thumbnail.replace("-I", "-O")}
                        alt={p.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {p.shipping.free_shipping && (
                        <div className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground flex items-center gap-1">
                          <Truck className="size-3" /> Frete grátis
                        </div>
                      )}
                      {p.condition === "new" && (
                        <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black">
                          Novo
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {p.category_id}
                    </Badge>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight cursor-pointer hover:text-primary" onClick={() => setSelectedProduct(p)}>
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-[#FFD000]" />
                      <span className="text-xs text-muted-foreground">
                        {p.reviews_rating > 0 ? `${p.reviews_rating}/5 (${p.reviews_total})` : "Sem avaliações"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl font-bold">{brl(p.price)}</span>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-xs text-muted-foreground line-through">{brl(p.original_price)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.sold_quantity.toLocaleString("pt-BR")} vendidos
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white/10 text-white hover:bg-white/10 hover:text-white text-xs"
                        onClick={() => setSelectedProduct(p)}
                      >
                        <ExternalLink className="size-3 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold text-xs"
                        onClick={() => linkMutation.mutate(p)}
                        disabled={linkMutation.isPending && linkLoadingId === p.id}
                      >
                        {linkLoadingId === p.id ? (
                          <Loader2 className="size-3 mr-1 animate-spin" />
                        ) : hasLink ? (
                          <>
                            <Copy className="size-3 mr-1" />
                            {copiedId === p.id ? <Check className="size-3 mr-1" /> : null}
                            Copiar
                          </>
                        ) : (
                          <>
                            <ExternalLink className="size-3 mr-1" /> Link
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/40 hover:text-white hover:bg-white/10 text-xs px-2"
                        onClick={() => { setAddingId(p.id); addMutation.mutate(p); }}
                        disabled={isSaved || addMutation.isPending}
                        title={isSaved ? "Já está na sua lista" : "Adicionar à minha lista"}
                      >
                        <Plus className={`size-4 ${isSaved ? "text-success" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div className="rounded-xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-6 text-center space-y-3 mb-6">
            <ShoppingBag className="mx-auto size-8 text-[#FFD000]" />
            <div>
              <p className="font-semibold text-white">Catálogo do Mercado Livre não configurado</p>
              <p className="mt-1 text-sm text-white/50">
                Para exibir produtos reais do Mercado Livre, configure <code className="text-xs bg-white/10 px-1 rounded">VITE_MELI_ACCESS_TOKEN</code> no ambiente.
              </p>
              <a
                href="https://developers.mercadolivre.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#FFD000] underline underline-offset-2"
              >
                Criar aplicativo no Mercado Livre <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
          {localProducts.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Catálogo vazio"
              description="Nenhum produto disponível no momento. Configure a API do Mercado Livre."
              action={
                <Button asChild size="sm" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90">
                  <Link to="/meus-produtos">Meus Produtos</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {localProducts.map((p) => (
                <div key={p.id} className="surface group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]">
                  {p.image_url && (
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer" onClick={() => setSelectedProduct(p)}>
                      <img src={p.image_url} alt={p.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      {p.free_shipping && (
                        <div className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground flex items-center gap-1">
                          <Truck className="size-3" /> Frete grátis
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                    <p className="line-clamp-2 text-sm font-semibold cursor-pointer hover:text-primary" onClick={() => setSelectedProduct(p)}>{p.title}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl font-bold">{brl(Number(p.price))}</span>
                      {p.original_price && (
                        <span className="text-xs text-muted-foreground line-through">{brl(Number(p.original_price))}</span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10 hover:text-white text-xs"
                        onClick={() => setSelectedProduct(p)}>
                        <ExternalLink className="size-3 mr-1" /> Ver
                      </Button>
                      <Button size="sm" className="flex-1 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold text-xs"
                        onClick={() => {
                          if (p.permalink) handleCopy(p.id, p.permalink);
                        }}>
                        <Copy className="size-3 mr-1" /> Link
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {isMeliConnected && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white hover:bg-white/10 hover:text-white"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white hover:bg-white/10 hover:text-white"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Product Dialog */}
      <ProductDialog product={selectedProduct} open={!!selectedProduct} onOpenChange={(o) => !o && setSelectedProduct(null)} />
    </AppLayout>
  );
}
