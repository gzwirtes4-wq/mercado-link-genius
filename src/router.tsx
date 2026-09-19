import { 
  createRouter as createTanRouter,
  Route,
  rootRouteId,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Build the route tree with proper typing
export const routeTreeWithContext = routeTree;

// Create the router with explicit root
const router = createTanRouter({
  routeTree: routeTreeWithContext,
  defaultPreload: "viewport",
  defaultPreloadStaleTime: 0,
  context: {
    auth: {
      user: null,
      profile: null,
    },
  },
  beforeNavigate: (ctx) => {
    // Optional: add navigation guards here
  },
  errorComponent: ({ error }) => {
    console.error("Route error:", error);
    return null;
  },
});

export function createRouter() {
  return router;
}

export { router };
