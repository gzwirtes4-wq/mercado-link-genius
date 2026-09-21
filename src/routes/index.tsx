import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Link2,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mercado Ecommerce | Transforme produtos em oportunidades de vendas" },
      {
        name: "description",
        content:
          "Plataforma premium para afiliados do Mercado Livre: encontre produtos, gere links oficiais, crie anúncios e acompanhe seus resultados.",
      },
      { property: "og:title", content: "Mercado Ecommerce | Transforme produtos em oportunidades de vendas" },
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
  {
    n: "01",
    title: "Encontre produtos",
    text: "Busque no catálogo com filtros por categoria, preço, avaliação e popularidade.",
  },
  {
    n: "02",
    title: "Escolha o produto",
    text: "Veja detalhes, especificações e cadastre o que faz sentido para o seu público.",
  },
  {
    n: "03",
    title: "Gere seu link",
    text: "Crie e copie seu link de afiliado a partir da sua conta conectada ao Mercado Livre.",
  },
  {
    n: "04",
    title: "Divulgue",
    text: "Use o gerador de anúncios para WhatsApp, Instagram, Telegram e Stories.",
  },
];

const PLANS = [
  {
    name: "1 Mês",
    price: "R$ 160,99",
    description: "Acesso à plataforma durante 30 dias.",
    features: [
      "Catálogo completo de produtos",
      "Pesquisa e filtros avançados",
      "Meus Produtos — até 50 itens",
      "Gerador de links de afiliado",
      "Criador de anúncios",
      "Dashboard com métricas",
      "Suporte por chamados",
    ],
    highlight: false,
    badge: null,
  },
  {
    name: "Lifetime",
    price: "R$ 295,99",
    description: "Acesso vitalício à plataforma. Pagamento único, sem mensalidade.",
    features: [
      "Tudo do plano 1 Mês",
      "Acesso vitalício — sem expiração",
      "Produtos cadastrados ilimitados",
      "Gerador de anúncios completo",
      "Analytics avançado",
      "Pedidos e financeiro detalhados",
      "Suporte prioritário",
    ],
    highlight: true,
    badge: "Acesso vitalício",
  },
];

const STATS = [
  { icon: Users, value: "+2.400", label: "Afiliados activos" },
  { icon: ShoppingCart, value: "+180K", label: "Produtos catalogados" },
  { icon: TrendingUp, value: "+98K", label: "Links gerados" },
  { icon: CheckCircle2, value: "+12K", label: "Vendas rastreadas" },
];

function Landing() {
  const { session } = useAuth();
  const ctaTo = session ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-[#FFD000]">Mercado</span> Ecommerce
          </span>
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            {session ? (
              <Button asChild size="sm" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold">
                <Link to="/dashboard">Meu painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-semibold">
                  <Link to="#planos">Começar agora</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-5 py-20 lg:py-32">
        {/* glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#FFD000]/5 blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto">
          <Badge className="mb-6 rounded-full border border-[#FFD000]/30 bg-[#FFD000]/10 px-4 py-1 text-xs font-medium text-[#FFD000]">
            Ferramentas para afiliados do Mercado Livre
          </Badge>

          <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            COMECE A FATURAR{" "}
            <span className="text-[#FFD000]">COM E-COMMERCE</span>
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-white/60 leading-relaxed">
            Encontre produtos para divulgar como afiliado e tenha ferramentas para organizar suas oportunidades de vendas em um só lugar.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-bold text-base px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(255,208,0,0.3)]">
              <Link to="#planos">
                COMEÇAR AGORA <ArrowRight className="size-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold text-base px-8 py-6 rounded-xl">
              <a href="#como-funciona">VER COMO FUNCIONA</a>
            </Button>
          </div>

          <p className="mt-8 flex items-start justify-center gap-2 text-xs text-white/40 max-w-sm mx-auto text-left">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#FFD000]/60" />
            Não prometemos ganhos garantidos. A plataforma oferece ferramentas de organização e divulgação — os resultados dependem do seu trabalho e da sua audiência.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/5 bg-[#111]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 p-8 text-center">
              <s.icon className="size-6 text-[#FFD000]" />
              <p className="font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Como funciona</h2>
            <p className="mt-3 text-sm text-white/50">Um fluxo simples, do produto à divulgação.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#FFD000]/30 transition-all duration-300 group">
                <div className="absolute -top-3 left-6 rounded-full bg-[#FFD000] px-3 py-0.5 text-xs font-bold text-black">
                  {s.n}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white group-hover:text-[#FFD000] transition-colors">{s.title}</h3>
                <p className="mt-2 text-sm text-white/50">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Tudo que você precisa para começar
            </h2>
            <p className="mt-3 text-sm text-white/50">Ferramentas completas em uma única plataforma.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShoppingCart, title: "Catálogo de Produtos", text: "Busca e filtros avançados para achar produtos rapidamente no Mercado Livre." },
              { icon: Zap, title: "Integração Mercado Livre", text: "Conexão pelo fluxo oficial OAuth. Nunca pedimos sua senha." },
              { icon: Link2, title: "Gerador de Links", text: "Links organizados por produto, com contagem de cliques." },
              { icon: TrendingUp, title: "Criador de Anúncios", text: "Modelos de copy prontos para WhatsApp, Instagram, Telegram e Stories." },
              { icon: CheckCircle2, title: "Meus Produtos", text: "Sua seleção salva, com status e ações rápidas." },
              { icon: Users, title: "Analytics", text: "Acompanhe cliques, pedidos e comissões disponíveis pela integração." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#FFD000]/30 transition-all duration-300">
                <div className="grid size-11 place-items-center rounded-xl bg-[#FFD000]/10">
                  <b.icon className="size-5 text-[#FFD000]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm text-white/50">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-t border-white/5 bg-[#0D0D0D] py-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Escolha o plano ideal para sua jornada
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Acesso imediato após confirmação do pagamento.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "relative rounded-2xl border-2 border-[#FFD000] bg-gradient-to-b from-[#FFD000]/10 to-[#0A0A0A] p-8 shadow-[0_0_60px_rgba(255,208,0,0.15)]"
                    : "relative rounded-2xl border border-white/10 bg-white/5 p-8"
                }
              >
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD000] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,208,0,0.4)]">
                    {p.badge}
                  </span>
                )}
                <div className="text-center">
                  <h3 className="font-display text-xl font-bold text-white">{p.name}</h3>
                  <p className="mt-2 text-sm text-white/50">{p.description}</p>
                  <div className="mt-6">
                    <span className="font-display text-4xl font-bold text-white">{p.price}</span>
                    <span className="text-sm text-white/40"> — pagamento único</span>
                  </div>
                </div>
                <ul className="mt-8 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-white/70">
                      <Check className="size-4 shrink-0 mt-0.5 text-[#FFD000]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {p.highlight ? (
                    <Button asChild className="w-full bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-bold text-base py-6 rounded-xl shadow-[0_0_30px_rgba(255,208,0,0.3)]">
                      <Link to="/auth">COMPRAR LIFETIME <ArrowRight className="size-4 ml-2" /></Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold py-6 rounded-xl">
                      <Link to="/auth">ASSINAR AGORA <ArrowRight className="size-4 ml-2" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-white/30">
            Os valores referem-se ao acesso às ferramentas da plataforma. Não vendemos promessa de faturamento nem garantia de vendas.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Pronto para começar?
          </h2>
          <p className="mt-3 text-sm text-white/50">
            Construa sua operação de divulgação com estrutura profissional.
          </p>
          <Button asChild size="lg" className="mt-8 bg-[#FFD000] text-black hover:bg-[#FFD000]/90 font-bold text-base px-10 py-6 rounded-xl shadow-[0_0_30px_rgba(255,208,0,0.3)]">
            <Link to="#planos">COMEÇAR AGORA <ArrowRight className="size-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-white/30 sm:flex-row">
          <span className="font-display text-base font-bold">
            <span className="text-[#FFD000]">Afilia</span>Hub
          </span>
          <p>© {new Date().getFullYear()} AfiliaHub. Não afiliado oficialmente ao Mercado Livre.</p>
        </div>
      </footer>
    </div>
  );
}
