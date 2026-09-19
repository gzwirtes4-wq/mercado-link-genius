import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { IndexRoute } from "./routes/index";
import { AuthRoute } from "./routes/auth";
import { ResetPasswordRoute } from "./routes/reset-password";
import { AuthenticatedRouteRoute } from "./routes/_authenticated/route";
import { AdminRoute } from "./routes/_authenticated/admin";
import { CatalogoRoute } from "./routes/_authenticated/catalogo";
import { ChamadosRoute } from "./routes/_authenticated/chamados";
import { ConfiguracoesRoute } from "./routes/_authenticated/configuracoes";
import { DashboardRoute } from "./routes/_authenticated/dashboard";
import { FinanceiroRoute } from "./routes/_authenticated/financeiro";
import { IntegracoesRoute } from "./routes/_authenticated/integracoes";
import { MeusProdutosRoute } from "./routes/_authenticated/meus-produtos";
import { PedidosRoute } from "./routes/_authenticated/pedidos";
import { ProdutosDivulgarRoute } from "./routes/_authenticated/produtos-divulgar";

const routeTree = rootRoute.addChildren([
  IndexRoute,
  AuthRoute,
  ResetPasswordRoute,
  AuthenticatedRouteRoute.addChildren([
    AdminRoute,
    CatalogoRoute,
    ChamadosRoute,
    ConfiguracoesRoute,
    DashboardRoute,
    FinanceiroRoute,
    IntegracoesRoute,
    MeusProdutosRoute,
    PedidosRoute,
    ProdutosDivulgarRoute,
  ]),
]);

export const router = createTanStackRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
