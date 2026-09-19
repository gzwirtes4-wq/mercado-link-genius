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
  Zap,
  TrendingUp,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMyLinks,
  fetchIntegration,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/produtos-divulgar")({
  head: () => ({
    meta: [
      { title: "Produtos para Divulgar | Mercado Ecommerce" },
      { name: "description", content: "Encontre produtos do Mercado Livre para divulgar como afiliado." },
    ],
  }),
  component: ProdutosDivulgarPage,
});

// ─── Mercado Livre API Config ────────────────────────────────────────────────
// A busca de produtos públicos NÃO exige OAuth — qualquer app pode usar.
// Docs: https://developers.mercadolivre.com.br/pt_br/busca-de-produtos
//
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
  reviews_rating: number | null;
  reviews_total: number;
  shipping: { free_shipping: boolean };
  condition: string;
  original_price: number | null;
  seller: {
    id: number;
    nickname: string;
    seller_reputation: {
      level_id: string | null;
      power_seller_status: string | null;
    };
  };
}

interface MeliCategory {
  id: string;
  name: string;
  path_from_root: { id: string; name: string }[];
}

interface MeliSeller {
  id: number;
  nickname: string;
  car_dealer: boolean;
  real_estate_agency: boolean;
  seller_reputation: {
    level_id: string | null;
    power_seller_status: string | null;
    metrics: {
      sales: { completed: number };
      ratings: { negative: number; neutral: number; positive: number };
    };
  };
  eshop?: {
    logo: string;
    domain_id: string;
  };
}

// ─── Categorias Populares ────────────────────────────────────────────────────
const POPULAR_CATEGORIES = [
  { id: "MLB1055", name: "Celulares e Telefones", icon: "📱" },
  { id: "MLB1648", name: "Computadores", icon: "💻" },
  { id: "MLB1000", name: "Eletrônicos", icon: "🎧" },
  { id: "MLB5726", name: "Acessórios de Moda", icon: "👜" },
  { id: "MLB1276", name: "Games", icon: "🎮" },
  { id: "MLB1574", name: "Esporte e Fitness", icon: "⚽" },
  { id: "MLB1384", name: "Beleza e Cuidado", icon: "💄" },
  { id: "MLB1500", name: "Casa e Móveis", icon: "🏠" },
  { id: "MLB1744", name: "Ferramentas", icon: "🔧" },
  { id: "MLB1039", name: "Música e Instrumentos", icon: "🎸" },
  { id: "MLB118203", name: "Animais e Mascotes", icon: "🐾" },
  { id: "MLB1132", name: "Brinquedos", icon: "🧸" },
];

// ─── Fetch Categories from MELI ──────────────────────────────────────────────
async function fetchMeliCategories(): Promise<{ id: string; name: string; icon: string }[]> {
  try {
    const res = await fetch(`${MELI_API_BASE}/sites/MLB/categories`);
    if (!res.ok) return POPULAR_CATEGORIES;
    const categories: { id: string; name: string }[] = await res.json();
    return categories.slice(0, 30).map((c) => ({
      id: c.id,
      name: c.name,
      icon: "📁",
    }));
  } catch {
    return POPULAR_CATEGORIES;
  }
}

// ─── Fetch Products from MELI ─────────────────────────────────────────────────
async function fetchMeliProducts(params: {
  query: string;
  category: string;
  sort: string;
  offset: number;
  limit: number;
}): Promise<{ items: MeliProduct[]; total: number; available_filters: { id: string; values: { id: string; name: string }[] }[] }> {
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

    const res = await fetch(url);
    if (!res.ok) return { items: [], total: 0, available_filters: [] };
    const data = await res.json();
    return {
      items: data.results ?? [],
      total: data.paging?.total ?? 0,
      available_filters: data.available_filters ?? [],
    };
  } catch {
    return { items: [], total: 0, available_filters: [] };
  }
}

// ─── Generate / Save Affiliate Link ──────────────────────────────────────────
async function generateAffiliateLink(userId: string, product: MeliProduct): Promise<string> {
  const { data: existing } = await supabase
    .from("affiliate_links")
    .select("url, id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existing) return existing.url;

  // Em produção, substitua por link de afiliado real via programa oficial.
  // O permalink oficial do ML é usado como base.
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
  const { data: existing } = await supabase
    .from("user_products")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existing) {
    toast.info("Este produto já está na sua lista");
    return;
  }

  await supabase.from("products").upsert(
    {
      id: product.id,
      external_id: product.id,
      title: product.title,
      price: product.price,
      original_price: product.original_price,
      category: product.category_id,
      image_url: product.thumbnail,
      permalink: product.permalink,
      rating: product.reviews_rating ?? 0,
      reviews_count: product.reviews_total,
      sold_quantity: product.sold_quantity,
      free_shipping: product.shipping.free_shipping,
      condition: product.condition,
      source: "mercadolivre",
      active: true,
    },
    { onConflict: "id" },
  );

  await supabase.from("user_products").insert({
    user_id: userId,
    product_id: product.id,
    status: "saved",
  });
}

// ─── Get Category Name ────────────────────────────────────────────────────────
async function getCategoryName(categoryId: string): Promise<string> {
  try {
    const res = await fetch(`${MELI_API_BASE}/categories/${categoryId}`);
    if (!res.ok) return categoryId;
    const data: MeliCategory = await res.json();
    return data.name;
  } catch {
    return categoryId;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
function ProdutosDivulgarPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sort, setSort] = React.useState("relevance");
  const [page, setPage] = React.useState(0);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = React.useState(false);

  const limit = 24;

  const { data: categories = POPULAR_CATEGORIES } = useQuery({
    queryKey: ["meli-categories"],
    queryFn: fetchMeliCategories,
  });

  const { data: meliResult, isLoading } = useQuery({
    queryKey: ["meli-products", search, category, sort, page],
    queryFn: () =>
      fetchMeliProducts({
        query: search,
        category,
        sort: sort === "relevance" ? "" : sort,
        offset: page * limit,
        limit,
      }),
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

  const linkMutation = useMutation({
    mutationFn: async (product: MeliProduct) => {
      return generateAffiliateLink(uid, product);
    },
    onSuccess: (url) => {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    },
  });

  const addMutation = useMutation({
    mutationFn: async (product: MeliProduct) => {
      await addToMyProducts(uid, product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products", uid] });
      toast.success("Produto adicionado à sua lista!");
    },
  });

  const handleCopy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const totalPages = meliResult ? Math.ceil(meliResult.total / limit) : 0;
  const isUserConnected = integration?.status === "connected";

  return (
    <AppLayout
      title="Produtos para Divulgar"
      description="Encontre produtos do Mercado Livre para divulgar como afiliado."
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      }
    >
      {/* Integration Status Banner */}
      <div className="surface mb-6 flex flex-col gap-3 border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Catálogo oficial do Mercado Livre</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {meliResult?.total.toLocaleString("pt-BR") ?? 0} produtos encontrados • Dados em tempo real
            </p>
          </div>
        </div>
        {!isUserConnected && (
          <Button asChild size="sm" className="shrink-0 bg-[#FFD000] text-black hover:bg-[#FFD000]/90">
            <Link to="/integracoes">Conectar conta ML</Link>
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="surface mb-6 space-y-4 p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos para divulgar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
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
            <Button type="submit" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90">
              Buscar
            </Button>
          </div>
        </form>

        {/* Categories */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="size-4" />
              Categorias
              <ChevronDown className={`size-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCategory("all"); setPage(0); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  category === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent hover:bg-accent/80"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setPage(0); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    category === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent hover:bg-accent/80"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results Info */}
      {meliResult && meliResult.total > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * limit + 1}–{Math.min((page + 1) * limit, meliResult.total)} de{" "}
            {meliResult.total.toLocaleString("pt-BR")} produtos
          </p>
          {category !== "all" && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {categories.find((c) => c.id === category)?.name ?? category}
            </Badge>
          )}
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" : "space-y-3"}>
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
          icon={ShoppingBag}
          title="Nenhum produto encontrado"
          description="Tente ajustar os filtros ou buscar outro termo."
        />
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" : "space-y-3"}>
          {meliResult?.items.map((p) => {
            const hasLink = myLinks.some((ml) => ml.product_id === p.id);
            const savedLink = myLinks.find((ml) => ml.product_id === p.id);

            if (viewMode === "list") {
              return (
                <div
                  key={p.id}
                  className="surface flex gap-4 p-4 transition-all hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <img
                      src={p.thumbnail.replace("-I", "-O")}
                      alt={p.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {p.shipping.free_shipping && (
                      <div className="absolute bottom-1 left-1 rounded-full bg-[#00A650] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Frete grátis
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="line-clamp-2 text-sm font-semibold">{p.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vendido {p.sold_quantity.toLocaleString("pt-BR")} unidades
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display text-lg font-bold">{brl(p.price)}</span>
                        {p.original_price && p.original_price > p.price && (
                          <span className="ml-2 text-xs text-muted-foreground line-through">
                            {brl(p.original_price)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => window.open(p.permalink, "_blank")}
                        >
                          <ExternalLink className="size-3 mr-1" /> Ver
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90"
                          onClick={async () => {
                            const url = hasLink && savedLink ? savedLink.url : await generateAffiliateLink(uid, p);
                            handleCopy(p.id, url);
                          }}
                        >
                          {copiedId === p.id ? (
                            <><Check className="size-3 mr-1" /> Copiado!</>
                          ) : (
                            <><Copy className="size-3 mr-1" /> Gerar Link</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className="surface group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer"
                  onClick={() => window.open(p.permalink, "_blank")}>
                  <img
                    src={p.thumbnail.replace("-I", "-O")}
                    alt={p.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {p.shipping.free_shipping && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-[#00A650] px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                      <Truck className="size-3" /> Frete grátis
                    </div>
                  )}
                  {p.condition === "new" && (
                    <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black">
                      Novo
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight cursor-pointer hover:text-primary"
                    onClick={() => window.open(p.permalink, "_blank")}>
                    {p.title}
                  </p>
                  {p.reviews_rating && p.reviews_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-[#FFD000]" />
                      <span className="text-xs text-muted-foreground">
                        {p.reviews_rating}/5 ({p.reviews_total} avaliações)
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold">{brl(p.price)}</span>
                    {p.original_price && p.original_price > p.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {brl(p.original_price)}
                      </span>
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
                      onClick={() => window.open(p.permalink, "_blank")}
                    >
                      <ExternalLink className="size-3 mr-1" /> Ver
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold text-xs"
                      onClick={async () => {
                        const url = hasLink && savedLink ? savedLink.url : await generateAffiliateLink(uid, p);
                        handleCopy(p.id, url);
                      }}
                    >
                      {copiedId === p.id ? (
                        <><Check className="size-3 mr-1" /> Copiado!</>
                      ) : hasLink ? (
                        <><Copy className="size-3 mr-1" /> Copiar Link</>
                      ) : (
                        <><Zap className="size-3 mr-1" /> Gerar Link</>
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-white/40 hover:text-white hover:bg-white/10 text-xs"
                    onClick={() => { setAddingId(p.id); addMutation.mutate(p); }}
                    disabled={addMutation.isPending}
                  >
                    <Plus className="size-4 mr-1" /> Adicionar à lista
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i;
              if (totalPages > 5) {
                if (page > 2) pageNum = page - 2 + i;
                if (page > totalPages - 3) pageNum = totalPages - 5 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`size-8 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent hover:bg-accent/80"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
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

      {/* Affiliate Info */}
      <div className="mt-8 rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
        <Zap className="mx-auto size-8 text-primary" />
        <h3 className="mt-3 text-sm font-semibold">Programa de Afiliados do Mercado Livre</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Os links são salvos na sua conta. Para acompanhar vendas e comissões em tempo real,
          conecte sua conta do Mercado Livre na página de Integrações.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
          <Link to="/integracoes">Configurar Integração</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
