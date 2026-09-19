import * as React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { sonner } from "@/components/ui/sonner";
import { AuthSync } from "@/integrations/supabase/auth-attacher";
import { createRouter } from "../router";
import "../styles.css";

const queryClient = new QueryClient();
const router = createRouter();

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

export default App;
