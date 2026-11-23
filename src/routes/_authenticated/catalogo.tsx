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
  Copy,
  Check,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Tag,
  X,
  Plus,
  Trash2,
  Image,
  Settings2,
  Globe,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { AdGenerator } from "@/components/AdGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { fetchIntegration } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo | Mercado Ecommerce" },
      { name: "description", content: "Catálogo de produtos reais para venda sem estoque. Encontre fornecedores, calcule sua margem e comece a lucrar." },
    ],
  }),
  component: CatalogoPage,
});

// ─── Mercado Livre API ──────────────────────────────────────────────────────
const MELI_ACCESS_TOKEN = import.meta.env['VITE_MELI_ACCESS_TOKEN'] as string | undefined;
const MELI_API_BASE = "https://api.mercadolivre.com.br";

interface MeliProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  pictures: { url: string }[];
  permalink: string;
  category_id: string;
  sold_quantity: number;
  reviews_rating: number;
  reviews_total: number;
  shipping: { free_shipping: boolean };
  condition: string;
  original_price: number | null;
  seller: { id: number; nickname: string; seller_reputation: { level_id: string } };
  catalog_product_id: string | null;
}

interface MeliCategory {
  id: string;
  name: string;
}

const CATEGORIAS_POPULARES: { id: string; name: string; icon: string }[] = [
  { id: "MLB1055", name: "Celulares e Telefones", icon: "📱" },
  { id: "MLB1648", name: "Informática", icon: "💻" },
  { id: "MLB1000", name: "Eletrônicos", icon: "🎧" },
  { id: "MLB5726", name: "Acessórios de Moda", icon: "👜" },
  { id: "MLB1276", name: "Games", icon: "🎮" },
  { id: "MLB1574", name: "Esporte e Fitness", icon: "🏋️" },
  { id: "MLB1384", name: "Beleza e Cuidado", icon: "💄" },
  { id: "MLB1500", name: "Casa e Móveis", icon: "🏠" },
  { id: "MLB1744", name: "Ferramentas", icon: "🔧" },
  { id: "MLB1642", name: "Eletrodomésticos", icon: "🍳" },
  { id: "MLB1430", name: "Moda", icon: "👕" },
  { id: "MLB1132", name: "Instrumentos Musicais", icon: "🎸" },
];

async function fetchMeliCategories(): Promise<{ id: string; name: string }[]> {
  if (!MELI_ACCESS_TOKEN) return CATEGORIAS_POPULARES;
  try {
    const res = await fetch(`${MELI_API_BASE}/sites/MLB/categories`, {
      headers: { Authorization: `Bearer ${MELI_ACCESS_TOKEN}` },
    });
    if (!res.ok) return CATEGORIAS_POPULARES;
    const categories: { id: string; name: string }[] = await res.json();
    return categories.slice(0, 20);
  } catch {
    return CATEGORIAS_POPULARES;
  }
}

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

async function fetchMeliProductDetail(id: string): Promise<MeliProduct | null> {
  if (!MELI_ACCESS_TOKEN) return null;
  try {
    const res = await fetch(`${MELI_API_BASE}/items/${id}`, {
      headers: { Authorization: `Bearer ${MELI_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Lucro Estimado ─────────────────────────────────────────────────────────
const TAXA_ML = 0.11; // ~11% taxa Mercado Livre
const TAXA_PAGAMENTO = 0.039; // ~3.9% taxa pagamento

function calcularLucro(precoFornecedor: number, margem: number, taxaFrete: number = 0): {
  precoVenda: number;
  lucroBruto: number;
  lucroLiquido: number;
  taxaTotal: number;
} {
  const precoVenda = precoFornecedor * (1 + margem / 100);
  const taxaML = precoVenda * TAXA_ML;
  const taxaPgto = precoVenda * TAXA_PAGAMENTO;
  const taxaTotal = taxaML + taxaPgto + taxaFrete;
  const lucroBruto = precoVenda - precoFornecedor;
  const lucroLiquido = precoVenda - precoFornecedor - taxaTotal;
  return { precoVenda, lucroBruto, lucroLiquido, taxaTotal };
}

// ─── Types ───────────────────────────────────────────────────────────────────
type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  thumbnail: string;
  pictures: { url: string }[];
  permalink: string;
  category_id: string;
  category_name: string;
  sold_quantity: number;
  reviews_rating: number;
  condition: string;
  free_shipping: boolean;
  seller_nickname: string;
  seller_level: string;
  source: string;
};

type SavedProduct = {
  id: string;
  product_id: string;
  margin: number;
  custom_price: number | null;
  created_at: string;
  products: { id: string; title: string; price: number; image_url: string | null; permalink: string | null; category: string; source: string } | null;
};

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onDetails,
}: {
  product: CatalogProduct;
  onDetails: (p: CatalogProduct) => void;
}) {
  return (
    <article className="surface group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lift)]">
      <button
        type="button"
        onClick={() => onDetails(product)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-pointer"
      >
        <img
          src={product.thumbnail?.replace("-I", "-O") || product.pictures?.[0]?.url?.replace("-I", "-O") || ""}
          alt={product.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.free_shipping && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            <Truck className="size-3" /> Frete grátis
          </div>
        )}
        {product.condition === "new" && (
          <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black">
            Novo
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="line-clamp-2 text-left text-sm font-semibold leading-tight cursor-pointer hover:text-primary" onClick={() => onDetails(product)}>
            {product.title}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {product.seller_nickname && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Globe className="size-2.5" /> {product.seller_nickname}
            </Badge>
          )}
          <span>{product.sold_quantity.toLocaleString("pt-BR")} vendidos</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-white">{brl(product.price)}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">{brl(product.original_price)}</span>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button
            size="sm"
            className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold text-xs"
            onClick={() => onDetails(product)}
          >
            <TrendingUp className="size-3 mr-1" /> Calcular Lucro
          </Button>
          {product.permalink && (
            <Button size="sm" variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 hover:text-white text-xs" asChild>
              <a href={product.permalink} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3 mr-1" /> Ver fornecedor
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductDetailModal({
  product,
  open,
  onOpenChange,
}: {
  product: CatalogProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const queryClient = useQueryClient();
  const [margin, setMargin] = React.useState(30);
  const [customPrice, setCustomPrice] = React.useState<string>("");
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const { data: integration } = useQuery({
    queryKey: ["integration", uid],
    queryFn: () => fetchIntegration(uid),
    enabled: !!uid,
  });

  React.useEffect(() => {
    if (product) {
      setMargin(30);
      setCustomPrice("");
      setSaved(false);
    }
  }, [product?.id]);

  if (!product) return null;

  const precoFornecedor = product.price;
  const useCustom = customPrice !== "" && !isNaN(Number(customPrice)) && Number(customPrice) > 0;
  const precoVendaCalc = useCustom ? Number(customPrice) : (precoFornecedor * (1 + margin / 100));
  const taxaFrete = product.free_shipping ? 0 : precoVendaCalc * 0.05;
  const resultado = calcularLucro(precoFornecedor, useCustom ? ((precoVendaCalc / precoFornecedor - 1) * 100) : margin, taxaFrete);

  const handleSalvar = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      // Salva na tabela products
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .upsert({
          external_id: product.id,
          title: product.title,
          price: product.price,
          category: product.category_name || product.category_id,
          image_url: product.thumbnail || product.pictures?.[0]?.url || null,
          permalink: product.permalink,
          rating: product.reviews_rating ?? 0,
          sold_quantity: product.sold_quantity ?? 0,
          free_shipping: product.free_shipping,
          source: "mercadolivre",
          active: true,
        }, { onConflict: "external_id" })
        .select("id")
        .maybeSingle();

      if (prodErr || !prod) { toast.error("Erro ao salvar produto"); setSaving(false); return; }

      // Salva como favorito do usuário com margem
      const { error: favErr } = await supabase
        .from("user_products")
        .upsert({
          user_id: uid,
          product_id: prod.id,
          status: "favorito",
        }, { onConflict: "user_id,product_id" });

      if (favErr) { toast.error("Erro ao favoritar"); setSaving(false); return; }

      // Salva configuração de margem
      await supabase.from("affiliate_links").upsert({
        user_id: uid,
        product_id: prod.id,
        url: product.permalink,
        short_code: Math.random().toString(36).slice(2, 8),
        clicks: 0,
      }, { onConflict: "user_id,product_id" });

      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["my-products", uid] });
      toast.success("Produto salvo com sua margem de lucro!");
    } catch {
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleCopiarLink = async () => {
    const linkTexto = `${product.title}\n${brl(precoVendaCalc)} — Compre aqui: ${product.permalink}`;
    await navigator.clipboard.writeText(linkTexto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Texto do anúncio copiado!");
  };

  const mlConnected = integration?.status === "connected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-left text-base leading-snug">{product.title}</DialogTitle>
          <DialogDescription className="text-left">
            Fonte: Mercado Livre • {product.seller_nickname || "Vendedor"} • {product.sold_quantity.toLocaleString("pt-BR")} vendidos
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {/* Imagem */}
          {(product.thumbnail || product.pictures?.length) && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <img
                src={(product.pictures?.[0]?.url || product.thumbnail)?.replace("-I", "-O")}
                alt={product.title}
                className="size-full object-contain"
              />
            </div>
          )}

          {/* Preço do fornecedor */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Preço do fornecedor (ML)</p>
                <p className="font-display text-2xl font-bold text-white">{brl(product.price)}</p>
              </div>
              <div className="text-right">
                {product.free_shipping ? (
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <Truck className="size-3" /> Frete grátis
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Frete por conta do cliente</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Margem de lucro */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-[#FFD000]" />
              <h3 className="text-sm font-semibold">Sua margem de lucro</h3>
            </div>

            {/* Slider de margem */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margem</span>
                <span className="font-semibold text-white">{useCustom ? "Personalizado" : `${margin}%`}</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={margin}
                onChange={(e) => { setMargin(Number(e.target.value)); setCustomPrice(""); }}
                className="w-full accent-[#FFD000]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Preço personalizado */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ou defina o preço de venda:</span>
              <Input
                type="number"
                placeholder="Preço fixo"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-32 text-sm"
              />
              {customPrice && (
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setCustomPrice("")}>
                  <X className="size-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-xl border border-[#FFD000]/30 bg-[#FFD000]/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-[#FFD000]" />
              <h3 className="text-sm font-semibold text-white">Resultado estimado por venda</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Preço de venda</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{brl(precoVendaCalc)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Custo (fornecedor)</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{brl(precoFornecedor)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Taxas (~15%)</p>
                <p className="mt-1 font-display text-lg font-bold text-red-400">-{brl(resultado.taxaTotal)}</p>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                <p className="text-xs text-success">Lucro líquido estimado</p>
                <p className={`mt-1 font-display text-lg font-bold ${resultado.lucroLiquido >= 0 ? "text-success" : "text-red-400"}`}>
                  {brl(resultado.lucroLiquido)}
                </p>
              </div>
            </div>

            <p className="text-xs text-white/40">
              * Taxas: ~11% Mercado Livre + ~3.9% pagamento + frete (quando aplicável). Valor aproximado.
            </p>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold"
                onClick={handleSalvar}
                disabled={saving || saved}
              >
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                {saved ? "Salvo!" : "Salvar produto"}
              </Button>
              <Button
                variant="outline"
                className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                onClick={handleCopiarLink}
              >
                {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
                {copied ? "Copiado!" : "Copiar link"}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10 hover:text-white" asChild>
                <a href={product.permalink} target="_blank" rel="noreferrer">
                  <Globe className="size-4 mr-2" /> Ver no fornecedor
                </a>
              </Button>
              <Button
                variant="outline"
                className={`flex-1 border-[#FFD000]/30 text-[#FFD000] hover:bg-[#FFD000]/10 ${
                  !mlConnected ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!mlConnected}
                onClick={() => {
                  if (!mlConnected) {
                    toast.error("Conecte sua conta do Mercado Livre primeiro", {
                      description: "Vá em Integrações para conectar sua conta.",
                    });
                  }
                }}
                title={!mlConnected ? "Conecte sua conta do Mercado Livre em Integrações" : ""}
              >
                <ShoppingBag className="size-4 mr-2" />
                Publicar no ML {mlConnected ? "" : "(conecte-se)"}
              </Button>
            </div>
          </div>

          {/* Gerador de anúncios */}
          {saved && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Image className="size-4 text-[#FFD000]" />
                <h3 className="text-sm font-semibold">Gerador de anúncios</h3>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <AdGenerator
                  product={{
                    id: product.id,
                    title: product.title,
                    price: precoVendaCalc,
                    original_price: product.original_price,
                    category: product.category_name || product.category_id,
                    image_url: product.thumbnail || product.pictures?.[0]?.url || null,
                    permalink: product.permalink,
                    rating: product.reviews_rating ?? 0,
                    reviews_count: 0,
                    sold_quantity: product.sold_quantity ?? 0,
                    free_shipping: product.free_shipping,
                    is_new: product.condition === "new",
                    source: "mercadolivre",
                    description: null,
                    created_at: new Date().toISOString(),
                  } as never}
                  link={product.permalink}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
function CatalogoPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sort, setSort] = React.useState("relevance");
  const [page, setPage] = React.useState(0);
  const [selectedProduct, setSelectedProduct] = React.useState<CatalogProduct | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const limit = 24;

  const handleDetails = (p: CatalogProduct) => {
    setSelectedProduct(p);
    setModalOpen(true);
  };

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

  const { data: integration } = useQuery({
    queryKey: ["integration", uid],
    queryFn: () => fetchIntegration(uid),
    enabled: !!uid,
  });

  const totalPages = meliResult ? Math.ceil(meliResult.total / limit) : 0;
  const isMeliConnected = Boolean(MELI_ACCESS_TOKEN);
  const mlConnected = integration?.status === "connected";

  // Transforma MeliProduct em CatalogProduct
  const products: CatalogProduct[] = React.useMemo(() => {
    if (!meliResult?.items) return [];
    return meliResult.items.map((p): CatalogProduct => ({
      id: p.id,
      title: p.title,
      price: p.price,
      original_price: p.original_price,
      thumbnail: p.thumbnail,
      pictures: p.pictures || [],
      permalink: p.permalink,
      category_id: p.category_id,
      category_name: p.category_id,
      sold_quantity: p.sold_quantity,
      reviews_rating: p.reviews_rating ?? 0,
      condition: p.condition,
      free_shipping: p.shipping?.free_shipping ?? false,
      seller_nickname: p.seller?.nickname ?? "",
      seller_level: p.seller?.seller_reputation?.level_id ?? "",
      source: "mercadolivre",
    }));
  }, [meliResult]);

  return (
    <AppLayout
      title="Catálogo"
      description={
        isMeliConnected
          ? "Produtos reais do Mercado Livre para venda sem estoque. Calcule sua margem e comece a lucrar."
          : "Catálogo de produtos para venda sem estoque."
      }
    >
      {/* Header */}
      <div className="mb-6 rounded-xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#FFD000]/10">
              <ShoppingBag className="size-5 text-[#FFD000]" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Catálogo de Fornecedores</h2>
              <p className="text-xs text-white/50">
                {isMeliConnected
                  ? `${meliResult?.total.toLocaleString("pt-BR") ?? 0} produtos reais do Mercado Livre`
                  : "Configure VITE_MELI_ACCESS_TOKEN para carregar produtos reais"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mlConnected ? (
              <Badge className="bg-success/10 text-success border-success/20 gap-1">
                <Check className="size-3" /> Mercado Livre conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-[#FFD000]/20 text-[#FFD000] text-xs gap-1">
                <AlertCircle className="size-3" />
                <Link to="/integracoes">Conecte o ML</Link> para publicar
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="surface mb-6 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos, marcas, categorias..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
              <SelectTrigger className="w-[170px]">
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

        {/* Categorias rápidas */}
        {isMeliConnected && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_POPULARES.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat.id); setPage(0); }}
                className={
                  category === cat.id
                    ? "rounded-full bg-[#FFD000] px-3 py-1 text-xs font-medium text-black transition-all"
                    : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
                }
              >
                {cat.icon} {cat.name}
              </button>
            ))}
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
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum produto encontrado"
            description="Tente ajustar os filtros ou buscar outro termo."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onDetails={handleDetails} />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="rounded-xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-6 text-center space-y-3 mb-6">
            <ShoppingBag className="mx-auto size-8 text-[#FFD000]" />
            <div>
              <p className="font-semibold text-white">Catálogo do Mercado Livre não configurado</p>
              <p className="mt-1 text-sm text-white/50">
                Para exibir produtos reais, configure <code className="text-xs bg-white/10 px-1 rounded">VITE_MELI_ACCESS_TOKEN</code> no ambiente.
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

          {/* Categorias mesmo sem API */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIAS_POPULARES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className="surface flex items-center gap-3 p-4 text-left transition-all hover:shadow-[var(--shadow-lift)]"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">Ver produtos</p>
                </div>
              </button>
            ))}
          </div>
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
            {page + 1} de {totalPages} — {meliResult?.total.toLocaleString("pt-BR")} produtos
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

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setSelectedProduct(null);
        }}
      />
    </AppLayout>
  );
}
