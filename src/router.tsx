import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    context: { queryClient } as never,
    defaultPreload: "viewport",
    defaultPreloadStaleTime: 0,
    wrapInRouter: true,
    defaultStructuralSharing: true,
  });
}

export const router = createRouter();

export { queryClient };
