import { ExternalLink, Star, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdGenerator } from "@/components/AdGenerator";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/queries";

export function ProductDialog({
  product,
  link,
  open,
  onOpenChange,
}: {
  product: Product | null;
  link?: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-base">{product.title}</DialogTitle>
          <DialogDescription className="text-left">
            {product.category} • {product.source === "demo" ? "Item de demonstração do catálogo" : "Produto do catálogo"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalhes">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="anuncio">Gerador de anúncios</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="mt-5 space-y-5">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.title}
                loading="lazy"
                className="h-56 w-full rounded-xl border border-border object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-2xl font-semibold">{brl(Number(product.price))}</span>
              {product.original_price && Number(product.original_price) > Number(product.price) && (
                <span className="text-sm text-muted-foreground line-through">
                  {brl(Number(product.original_price))}
                </span>
              )}
              {product.free_shipping && (
                <Badge variant="secondary" className="gap-1">
                  <Truck className="size-3.5" /> Frete grátis
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">Avaliação</dt>
                <dd className="mt-1 flex items-center gap-1 font-medium">
                  <Star className="size-4 fill-brand text-brand" /> {Number(product.rating).toFixed(1)} (
                  {product.reviews_count})
                </dd>
              </div>
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">Vendidos</dt>
                <dd className="mt-1 font-medium">{product.sold_quantity.toLocaleString("pt-BR")}</dd>
              </div>
            </dl>
            {product.permalink && (
              <Button asChild variant="outline" className="w-full">
                <a href={product.permalink} target="_blank" rel="noreferrer">
                  Ver no Mercado Livre <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
          </TabsContent>

          <TabsContent value="anuncio" className="mt-5">
            <AdGenerator product={product} link={link} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
