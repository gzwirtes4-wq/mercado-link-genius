import { QueryClient } from "@tanstack/react-query";
import { createRouter, Router, Route } from "@tanstack/react-router";

// ─── Route Registry (manual to avoid circular import issues) ──────────────────
const rootRoute = new Route({
  getParentRoute: () => undefined as unknown as Router,
  id: "root",
  path: "/",
});

const authenticatedRoute = new Route({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  path: "/",
});

const authRoute = new Route({ getParentRoute: () => rootRoute, id: "auth", path: "/auth" });
const resetPasswordRoute = new Route({ getParentRoute: () => rootRoute, id: "reset-password", path: "/reset-password" });
const dashboardRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "dashboard", path: "/dashboard" });
const catalogoRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "catalogo", path: "/catalogo" });
const meusProdutosRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "meus-produtos", path: "/meus-produtos" });
const produtosDivulgarRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "produtos-divulgar", path: "/produtos-divulgar" });
const pedidosRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "pedidos", path: "/pedidos" });
const financeiroRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "financeiro", path: "/financeiro" });
const integracoesRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "integracoes", path: "/integracoes" });
const configuracoesRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "configuracoes", path: "/configuracoes" });
const chamadosRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "chamados", path: "/chamados" });
const adminRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "admin", path: "/admin" });
const routeRoute = new Route({ getParentRoute: () => authenticatedRoute, id: "route", path: "" });

const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
    dashboardRoute,
    catalogoRoute,
    meusProdutosRoute,
    produtosDivulgarRoute,
    pedidosRoute,
    financeiroRoute,
    integracoesRoute,
    configuracoesRoute,
    chamadosRoute,
    adminRoute,
    routeRoute,
  ]),
  authRoute,
  resetPasswordRoute,
]);

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

export { routeTree };
