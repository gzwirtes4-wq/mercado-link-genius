import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  MousePointerClick,
  Link2,
  Megaphone,
  Store,
  Plug,
  Package,
  BarChart3,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import heroImage from "@/assets/hero-dashboard.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AfiliaHub | Transforme produtos em oportunidades de vendas" },
      {
        name: "description",
        content:
          "Plataforma para afiliados do Mercado Livre: encontre produtos, gere links oficiais, crie anúncios e acompanhe suas divulgações.",
      },
      { property: "og:title", content: "AfiliaHub | Transforme produtos em oportunidades de vendas" },
      {
        property: "og:description",
        content:
          "Ferramentas para encontrar produtos, organizar divulgações e trabalhar com e-commerce através do Mercado Livre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { n: "01", title: "Encontre produtos", text: "Pesquise no catálogo com filtros por categoria, preço, avaliação e popularidade." },
  { n: "02", title: "Escolha o produto", text: "Veja detalhes, especificações e cadastre o que faz sentido para o seu público." },
  { n: "03", title: "Gere seu link", text: "Crie e copie seu link de afiliado a partir da sua conta conectada ao Mercado Livre." },
  { n: "04", title: "Divulgue", text: "Use o gerador de anúncios para WhatsApp, Instagram, Telegram e Stories." },
];

const BENEFITS = [
  { icon: Store, title: "Catálogo de Produtos", text: "Busca e filtros avançados para achar produtos rapidamente." },
  { icon: Plug, title: "Integração Mercado Livre", text: "Conexão pelo fluxo oficial. Nunca pedimos sua senha." },
  { icon: Link2, title: "Gerador de Links", text: "Links organizados por produto, com contagem de cliques." },
  { icon: Megaphone, title: "Criador de Anúncios", text: "Modelos de copy prontos para cada rede social." },
  { icon: Package, title: "Meus Produtos", text: "Sua seleção salva, com status e ações rápidas." },
  { icon: BarChart3, title: "Analytics", text: "Acompanhe cliques, pedidos e comissões em um só lugar." },
];

const PLANS = [
  {
    name: "Classic",
    price: "R$ 150,99",
    description: "Para quem está começando a organizar suas divulgações.",
    features: [
      "Catálogo de produtos",
      "Até 50 produtos cadastrados",
      "Gerador de links de afiliado",
      "Gerador de anúncios básico",
      "Suporte por chamados",
    ],
    highlight: false,
  },
  {
    name: "PRO",
    price: "R$ 250,99",
    description: "Para quem quer escalar a operação com mais ferramentas.",
    features: [
      "Tudo do Classic",
      "Produtos cadastrados ilimitados",
      "Gerador de anúncios completo",
      "Analytics avançado de cliques",
      "Pedidos e financeiro detalhados",
      "Suporte prioritário",
    ],
    highlight: true,
  },
];

function Landing() {
  const { session } = useAuth();
  const ctaTo = session ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={ctaTo}>{session ? "Meu painel" : "Entrar"}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={ctaTo}>Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
            Ferramentas para afiliados do Mercado Livre
          </Badge>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Transforme produtos em oportunidades de vendas
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Tenha ferramentas para encontrar produtos, organizar suas divulgações e trabalhar com e-commerce
            através do Mercado Livre.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={ctaTo}>
                COMEÇAR AGORA <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">VER COMO FUNCIONA</a>
            </Button>
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Não prometemos ganhos garantidos. A plataforma oferece ferramentas de organização e divulgação —
            os resultados dependem do seu trabalho, da sua audiência e das regras do programa de afiliados.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-brand/15 blur-2xl" aria-hidden />
          <img
            src={heroImage}
            alt="Painel do AfiliaHub com indicadores, gráficos e produtos"
            width={1280}
            height={960}
            className="relative w-full rounded-2xl border border-border shadow-[var(--shadow-lift)]"
          />
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-3xl font-semibold">Como funciona</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Um fluxo simples, do produto ao post.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="surface p-6">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold text-brand">{s.n}</span>
                  {i === 0 && <Search className="size-4 text-muted-foreground" />}
                  {i === 1 && <MousePointerClick className="size-4 text-muted-foreground" />}
                  {i === 2 && <Link2 className="size-4 text-muted-foreground" />}
                  {i === 3 && <Megaphone className="size-4 text-muted-foreground" />}
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-3xl font-semibold">Tudo em um só painel</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="surface p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <div className="grid size-10 place-items-center rounded-xl bg-accent">
                  <b.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-border bg-card/60 py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold">Planos</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha o plano que acompanha o seu momento. Cancele quando quiser.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "relative rounded-2xl border-2 border-primary bg-card p-7 shadow-[var(--shadow-lift)]"
                    : "surface p-7"
                }
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Mais completo
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-5">
                  <span className="font-display text-3xl font-semibold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-7 w-full" variant={p.highlight ? "default" : "outline"}>
                  <Link to={ctaTo}>Começar com {p.name}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Os valores referem-se ao acesso às ferramentas da plataforma. Não vendemos promessa de
            faturamento nem garantia de vendas.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-muted-foreground sm:flex-row">
          <Logo compact />
          <p>© {new Date().getFullYear()} AfiliaHub. Não afiliado oficialmente ao Mercado Livre.</p>
        </div>
      </footer>
    </div>
  );
}
