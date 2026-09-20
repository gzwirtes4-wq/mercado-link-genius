import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ExternalLink,
  ShoppingBag,
  Star,
  Truck,
  Plus,
  Copy,
  Check,
  Loader2,
  Zap,
  Grid3X3,
  List,
  ChevronDown,
  Filter,
  Store,
  TrendingUp,
  BadgeCheck,
  Award,
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
import { fetchMyLinks, fetchIntegration } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/produtos-divulgar")({
  head: () => ({
    meta: [
      { title: "Produtos para Divulgar | Mercado Ecommerce" },
      { name: "description", content: "Encontre produtos e fornecedores do Mercado Livre para divulgar como afiliado." },
    ],
  }),
  component: ProdutosDivulgarPage,
});

// ─── Mercado Livre API Config ────────────────────────────────────────────────
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

// ─── Fornecedor extraído de produtos ───────────────────────────────────────
interface Fornecedor {
  id: number;
  nickname: string;
  level_id: string | null;
  power_seller_status: string | null;
  totalVendido: number;
  totalProdutos: number;
  minPrice: number;
  maxPrice: number;
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

// ─── Fetch Products from MELI ─────────────────────────────────────────────────
async function fetchMeliProducts(params: {
  query: string;
  category: string;
  sellerId: string;
  sort: string;
  offset: number;
  limit: number;
}): Promise<{ items: MeliProduct[]; total: number }> {
  try {
    let url: string;
    if (params.sellerId && params.sellerId !== "all") {
      url = `${MELI_API_BASE}/sites/MLB/search?seller_id=${params.sellerId}&offset=${params.offset}&limit=${params.limit}`;
    } else if (params.query) {
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
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return { items: data.results ?? [], total: data.paging?.total ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

// ─── Extract unique sellers from products ─────────────────────────────────────
function extractFornecedores(products: MeliProduct[]): Fornecedor[] {
  const map = new Map<number, Fornecedor>();
  for (const p of products) {
    if (!p.seller) continue;
    const existing = map.get(p.seller.id);
    if (existing) {
      existing.totalVendido += p.sold_quantity;
      existing.totalProdutos += 1;
      existing.minPrice = Math.min(existing.minPrice, p.price);
      existing.maxPrice = Math.max(existing.maxPrice, p.price);
    } else {
      map.set(p.seller.id, {
        id: p.seller.id,
        nickname: p.seller.nickname,
        level_id: p.seller.seller_reputation?.level_id ?? null,
        power_seller_status: p.seller.seller_reputation?.power_seller_status ?? null,
        totalVendido: p.sold_quantity,
        totalProdutos: 1,
        minPrice: p.price,
        maxPrice: p.price,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalVendido - a.totalVendido);
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

// ─── Reputation Badge ─────────────────────────────────────────────────────────
function ReputationBadge({ levelId, powerStatus }: { levelId: string | null; powerStatus: string | null }) {
  if (powerStatus === "gold" || levelId === "5_green") {
    return <Badge className="bg-[#FFD000]/20 text-[#FFD000] border-[#FFD000]/30 text-[10px]"><Award className="size-3 mr-1" />MercadoLíder</Badge>;
  }
  if (levelId) {
    return <Badge className="bg-[#00A650]/20 text-[#00A650] border-[#00A650]/30 text-[10px]"><BadgeCheck className="size-3 mr-1" />Verificado</Badge>;
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
function ProdutosDivulgarPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sellerId, setSellerId] = React.useState("all");
  const [sort, setSort] = React.useState("relevance");
  const [page, setPage] = React.useState(0);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showFornecedores, setShowFornecedores] = React.useState(true);

  const limit = 24;

  const { data: meliResult, isLoading } = useQuery({
    queryKey: ["meli-products", search, category, sellerId, sort, page],
    queryFn: () =>
      fetchMeliProducts({ query: search, category, sellerId, sort: sort === "relevance" ? "" : sort, offset: page * limit, limit }),
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

  const fornecedores = extractFornecedores(meliResult?.items ?? []);
  const isUserConnected = integration?.status === "connected";
  const totalPages = meliResult ? Math.ceil(meliResult.total / limit) : 0;

  const linkMutation = useMutation({
    mutationFn: async (product: MeliProduct) => generateAffiliateLink(uid, product),
    onSuccess: (url) => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); },
  });

  const addMutation = useMutation({
    mutationFn: async (product: MeliProduct) => { await addToMyProducts(uid, product); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-products", uid] }); toast.success("Adicionado à sua lista!"); },
  });

  const handleCopy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeSeller = sellerId !== "all" ? fornecedores.find((f) => String(f.id) === sellerId) : null;

  return (
    <AppLayout
      title="Produtos para Divulgar"
      description="Encontre produtos e fornecedores reais do Mercado Livre para divulgar como afiliado."
      actions={
        <div className="flex items-center gap-2">
          {activeSeller && (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Store className="size-3 mr-1" />
              {activeSeller.nickname}
              <button onClick={() => { setSellerId("all"); setPage(0); }} className="ml-1 hover:text-white/60">×</button>
            </Badge>
          )}
          <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <Grid3X3 className="size-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
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
              {meliResult?.total.toLocaleString("pt-BR") ?? 0} produtos reais • {fornecedores.length} fornecedores encontrados
            </p>
          </div>
        </div>
        {!isUserConnected && (
          <Button asChild size="sm" className="shrink-0 bg-[#FFD000] text-black hover:bg-[#FFD000]/90">
            <Link to="/integracoes">Conectar conta ML</Link>
          </Button>
        )}
      </div>

      {/* ── FORNECEDORES / ANUNCIANTES ── */}
      <div className="surface mb-6 space-y-4 p-4">
        <Collapsible open={showFornecedores} onOpenChange={setShowFornecedores}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-[#FFD000]" />
              <h2 className="text-sm font-semibold">Fornecedores / Anunciantes</h2>
              {fornecedores.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{fornecedores.length} encontrados</Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <span className="hidden sm:inline">{showFornecedores ? "Ocultar" : "Mostrar"}</span>
                <ChevronDown className={`size-4 transition-transform ${showFornecedores ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-3">
            {isLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="min-w-[200px] animate-pulse space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="size-10 rounded-full bg-white/10" />
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-3 w-16 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : fornecedores.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Fornecedores aparecerão aqui conforme você busca produtos.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {fornecedores.slice(0, 30).map((f) => (
                  <div
                    key={f.id}
                    className={`min-w-[200px] shrink-0 cursor-pointer rounded-xl border p-4 transition-all hover:shadow-[var(--shadow-lift)] ${
                      sellerId === String(f.id)
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                    onClick={() => {
                      if (sellerId === String(f.id)) { setSellerId("all"); setPage(0); }
                      else { setSellerId(String(f.id)); setPage(0); }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="grid size-8 place-items-center rounded-full bg-[#FFD000]/10 text-xs font-bold text-[#FFD000]">
                        {f.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{f.nickname}</p>
                        <ReputationBadge levelId={f.level_id} powerStatus={f.power_seller_status} />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Produtos</span>
                        <span className="font-medium text-foreground">{f.totalProdutos}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Total vendido</span>
                        <span className="font-medium text-[#00A650]">{f.totalVendido.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Faixa de preço</span>
                        <span className="font-medium text-foreground">{brl(f.minPrice)} – {brl(f.maxPrice)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                          sellerId === String(f.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                        onClick={(e) => { e.stopPropagation(); if (sellerId === String(f.id)) { setSellerId("all"); setPage(0); } else { setSellerId(String(f.id)); setPage(0); } }}
                      >
                        {sellerId === String(f.id) ? "Todos" : "Ver produtos"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Search & Filters */}
      <div className="surface mb-6 space-y-4 p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(0); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
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
                  category === "all" ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                }`}
              >
                Todas
              </button>
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setPage(0); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    category === cat.id ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
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
            {activeSeller
              ? `${meliResult.total.toLocaleString("pt-BR")} produtos de ${activeSeller.nickname}`
              : `Mostrando ${page * limit + 1}–${Math.min((page + 1) * limit, meliResult.total)} de ${meliResult.total.toLocaleString("pt-BR")} produtos`}
          </p>
          {(category !== "all" || sellerId !== "all") && (
            <Badge variant="secondary" className="bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
              onClick={() => { setCategory("all"); setSellerId("all"); setPage(0); }}>
              Limpar filtros ×
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
                <div key={p.id} className="surface flex gap-4 p-4 transition-all hover:shadow-[var(--shadow-lift)]">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <img src={p.thumbnail.replace("-I", "-O")} alt={p.title} loading="lazy" className="size-full object-cover" />
                    {p.shipping.free_shipping && (
                      <div className="absolute bottom-1 left-1 rounded-full bg-[#00A650] px-1.5 py-0.5 text-[9px] font-bold text-white">Frete grátis</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="line-clamp-2 text-sm font-semibold">{p.title}</p>
                      {p.seller && (
                        <button
                          onClick={() => { setSellerId(String(p.seller.id)); setPage(0); }}
                          className="mt-1 flex items-center gap-1 text-[10px] text-[#FFD000] hover:underline"
                        >
                          <Store className="size-3" /> {p.seller.nickname}
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">{p.sold_quantity.toLocaleString("pt-BR")} vendidos</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display text-lg font-bold">{brl(p.price)}</span>
                        {p.original_price && p.original_price > p.price && (
                          <span className="ml-2 text-xs text-muted-foreground line-through">{brl(p.original_price)}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => window.open(p.permalink, "_blank")}>
                          <ExternalLink className="size-3 mr-1" /> Ver
                        </Button>
                        <Button size="sm" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90"
                          onClick={async () => {
                            const url = hasLink && savedLink ? savedLink.url : await generateAffiliateLink(uid, p);
                            handleCopy(p.id, url);
                          }}>
                          {copiedId === p.id ? <><Check className="size-3 mr-1" /> Copiado!</> : <><Copy className="size-3 mr-1" /> Gerar Link</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} className="surface group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer"
                  onClick={() => window.open(p.permalink, "_blank")}>
                  <img src={p.thumbnail.replace("-I", "-O")} alt={p.title} loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {p.shipping.free_shipping && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-[#00A650] px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                      <Truck className="size-3" /> Frete grátis
                    </div>
                  )}
                  {p.condition === "new" && (
                    <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black">Novo</div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  {p.seller && (
                    <button
                      onClick={() => { setSellerId(String(p.seller.id)); setPage(0); }}
                      className="flex items-center gap-1 text-[10px] text-[#FFD000] hover:underline w-full truncate"
                    >
                      <Store className="size-3 shrink-0" /> {p.seller.nickname}
                    </button>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold leading-tight cursor-pointer hover:text-primary"
                    onClick={() => window.open(p.permalink, "_blank")}>
                    {p.title}
                  </p>
                  {p.reviews_rating && p.reviews_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-[#FFD000]" />
                      <span className="text-xs text-muted-foreground">{p.reviews_rating}/5 ({p.reviews_total})</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold">{brl(p.price)}</span>
                    {p.original_price && p.original_price > p.price && (
                      <span className="text-xs text-muted-foreground line-through">{brl(p.original_price)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.sold_quantity.toLocaleString("pt-BR")} vendidos</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline"
                      className="flex-1 border-white/10 text-white hover:bg-white/10 hover:text-white text-xs"
                      onClick={() => window.open(p.permalink, "_blank")}>
                      <ExternalLink className="size-3 mr-1" /> Ver
                    </Button>
                    <Button size="sm"
                      className="flex-1 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold text-xs"
                      onClick={async () => {
                        const url = hasLink && savedLink ? savedLink.url : await generateAffiliateLink(uid, p);
                        handleCopy(p.id, url);
                      }}>
                      {copiedId === p.id ? <><Check className="size-3 mr-1" /> Copiado!</> : hasLink ? <><Copy className="size-3 mr-1" /> Copiar</> : <><Zap className="size-3 mr-1" /> Link</>}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10 hover:text-white"
            disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
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
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`size-8 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                  }`}>
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10 hover:text-white"
            disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
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
