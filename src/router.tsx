import { createRouter as createTanStackRouter, default as Router } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createTanStackRouter({ routeTree });
export {
  Router,
  Link,
  redirect,
  useNavigate,
  useParams,
  useSearch,
  useLoaderData,
  useActionData,
  useRouteError,
  isRedirectError,
} from "@tanstack/react-router";
