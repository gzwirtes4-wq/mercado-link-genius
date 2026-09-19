import { Check, Plus, Star, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/queries";

export function ProductCard({
  product,
  saved,
  onSave,
  onOpen,
  busy,
}: {
  product: Product;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  busy?: boolean;
}) {
  return (
    <article className="surface flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <button type="button" onClick={onOpen} className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : null}
        {product.is_new && (
          <Badge className="absolute left-3 top-3 bg-brand text-brand-foreground">Novidade</Badge>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {product.category}
        </p>
        <button type="button" onClick={onOpen} className="mt-1 line-clamp-2 text-left text-sm font-semibold">
          {product.title}
        </button>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-brand text-brand" /> {Number(product.rating).toFixed(1)}
          </span>
          <span>{product.sold_quantity.toLocaleString("pt-BR")} vendidos</span>
          {product.free_shipping && (
            <span className="flex items-center gap-1 text-success">
              <Truck className="size-3.5" /> grátis
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold">{brl(Number(product.price))}</span>
          {product.original_price && Number(product.original_price) > Number(product.price) && (
            <span className="text-xs text-muted-foreground line-through">
              {brl(Number(product.original_price))}
            </span>
          )}
        </div>

        <Button
          className="mt-4 w-full"
          variant={saved ? "secondary" : "default"}
          disabled={saved || busy}
          onClick={onSave}
        >
          {saved ? (
            <>
              <Check className="size-4" /> Produto cadastrado
            </>
          ) : (
            <>
              <Plus className="size-4" /> Cadastrar produto
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
