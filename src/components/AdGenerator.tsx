import * as React from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/queries";

const STYLES = ["Oferta", "Profissional", "Urgência", "Informativo", "Curto"] as const;
const CHANNELS = ["WhatsApp", "Instagram", "Telegram", "Stories"] as const;

type Channel = (typeof CHANNELS)[number];
type Style = (typeof STYLES)[number];

function buildCopy(product: Product, channel: Channel, style: Style, link: string) {
  const price = brl(Number(product.price));
  const linkLine = link ? `\n\n👉 ${link}` : "\n\n👉 (gere seu link de afiliado na página Meus Produtos)";
  const disclaimer = "\n\nPreço e disponibilidade podem mudar a qualquer momento.";

  const bodies: Record<Style, string> = {
    Oferta: `🔥 ${product.title}\n\nPor ${price}${product.free_shipping ? " • frete grátis" : ""}\nCategoria: ${product.category}`,
    Profissional: `${product.title}\n\nUma opção de ${product.category.toLowerCase()} com boa avaliação (${product.rating}/5).\nValor atual: ${price}.`,
    Urgência: `⏳ ${product.title}\n\nEstá por ${price} agora. Ofertas assim costumam durar pouco — confira antes que mude.`,
    Informativo: `${product.title}\n\n• Categoria: ${product.category}\n• Avaliação: ${product.rating}/5 (${product.reviews_count} avaliações)\n• Preço: ${price}\n• Frete grátis: ${product.free_shipping ? "sim" : "não"}`,
    Curto: `${product.title} — ${price}`,
  };

  const channelWrap: Record<Channel, (t: string) => string> = {
    WhatsApp: (t) => `${t}${linkLine}${disclaimer}`,
    Instagram: (t) =>
      `${t}${linkLine}\n\n#achadinhos #${product.category.toLowerCase().replace(/[^a-z0-9]/g, "")} #ofertas${disclaimer}`,
    Telegram: (t) => `📢 ${t}${linkLine}${disclaimer}`,
    Stories: (t) => `${t.split("\n")[0]}\n\n${price}\nArrasta pra cima 👆${linkLine}`,
  };

  return channelWrap[channel](bodies[style]);
}

export function AdGenerator({ product, link }: { product: Product; link?: string }) {
  const [style, setStyle] = React.useState<Style>("Oferta");
  const [channel, setChannel] = React.useState<Channel>("WhatsApp");
  const [text, setText] = React.useState(() => buildCopy(product, "WhatsApp", "Oferta", link ?? ""));

  React.useEffect(() => {
    setText(buildCopy(product, channel, style, link ?? ""));
  }, [product, channel, style, link]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Texto copiado");
  };

  return (
    <div className="space-y-4">
      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
        <TabsList className="grid w-full grid-cols-4">
          {CHANNELS.map((c) => (
            <TabsTrigger key={c} value={c} className="text-xs">
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={channel} />
      </Tabs>

      <div className="flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            className={
              s === style
                ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            }
          >
            {s}
          </button>
        ))}
      </div>

      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="text-sm" />
      <Button onClick={copy} className="w-full">
        <Copy className="size-4" /> Copiar texto
      </Button>
    </div>
  );
}
