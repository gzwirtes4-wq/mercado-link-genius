import * as React from "react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { sonner } from "@/components/ui/sonner";
import { AuthSync } from "@/integrations/supabase/auth-attacher";
import "@/styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  context: { queryClient },
  defaultPreload: "viewport",
  defaultPreloadStaleTime: 0,
  routeTree: "./routeTree.gen.ts",
  wrapInRouter: false,
  defaultStructuralSharing: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthSync>
          <RouterProvider router={router} />
          {sonner()}
        </AuthSync>
      </QueryClientProvider>
    </StrictMode>
  );
}

// Entry point for TanStack Start
export default App;
