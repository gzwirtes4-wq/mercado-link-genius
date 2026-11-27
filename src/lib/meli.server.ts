// Server-only Mercado Livre helpers. Never import this file from client code;
// load it inside server handlers with `await import("@/lib/meli.server")`.
//
// Tokens live in `public.meli_tokens`, which has RLS enabled and no policies,
// so only the service role (this file) can read or write them.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const MELI_API = "https://api.mercadolibre.com";
export const MELI_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
export const MELI_PROVIDER = "mercado_livre";
const STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export type MeliErrorKind =
  | "config"
  | "not_connected"
  | "auth_expired"
  | "forbidden"
  | "rate_limited"
  | "not_found"
  | "api_error"
  | "network";

export type MeliFailure = { ok: false; kind: string; message: string };

/** Converts any error into a serializable failure for server functions. */
export function toFailure(e: unknown): MeliFailure {
  if (e instanceof MeliError) return { ok: false, kind: e.kind, message: e.message };
  console.error(
    JSON.stringify({ scope: "meli", level: "error", msg: "unexpected", err: String(e) }),
  );
  return { ok: false, kind: "internal", message: "Erro interno ao falar com o Mercado Livre" };
}

export class MeliError extends Error {
  constructor(
    public kind: MeliErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
  scope?: string;
};

function log(level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) {
  // Structured log; never include tokens, codes or secrets here.
  console[level](JSON.stringify({ scope: "meli", level, msg, ...extra }));
}

export function getMeliConfig() {
  const clientId = process.env["MELI_CLIENT_ID"];
  const clientSecret = process.env["MELI_CLIENT_SECRET"];
  const redirectUri = process.env["MELI_REDIRECT_URI"];
  if (!clientId || !clientSecret || !redirectUri) {
    const missing = [
      !clientId && "MELI_CLIENT_ID",
      !clientSecret && "MELI_CLIENT_SECRET",
      !redirectUri && "MELI_REDIRECT_URI",
    ].filter(Boolean);
    throw new MeliError(
      "config",
      `Integração não configurada no servidor (faltando: ${missing.join(", ")})`,
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function isMeliConfigured() {
  try {
    getMeliConfig();
    return true;
  } catch {
    return false;
  }
}

// ── OAuth state (CSRF protection for the callback) ─────────────────────────
export async function createOAuthState(userId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  // opportunistic cleanup of expired states
  await supabaseAdmin
    .from("meli_oauth_states")
    .delete()
    .lt("created_at", new Date(Date.now() - STATE_TTL_MS).toISOString());

  const { error } = await supabaseAdmin
    .from("meli_oauth_states")
    .insert({ state, user_id: userId });
  if (error) throw new MeliError("api_error", "Não foi possível iniciar a conexão");
  return state;
}

/** Validates and consumes (single use) an OAuth state. Returns the user id. */
export async function consumeOAuthState(state: string): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(state)) return null;
  const { data } = await supabaseAdmin
    .from("meli_oauth_states")
    .delete()
    .eq("state", state)
    .select("user_id, created_at")
    .maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > STATE_TTL_MS) return null;
  return data.user_id;
}

// ── Token endpoint ─────────────────────────────────────────────────────────
async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${MELI_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params),
    });
  } catch {
    throw new MeliError("network", "Falha de conexão com o Mercado Livre");
  }
  const body = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    message?: string;
  };
  if (!res.ok || !body.access_token || !body.refresh_token) {
    const reason = body.message || body.error || `HTTP ${res.status}`;
    // invalid_grant = code/refresh token expired, reused or revoked
    const kind: MeliErrorKind = body.error === "invalid_grant" ? "auth_expired" : "api_error";
    throw new MeliError(kind, `Mercado Livre recusou a autorização: ${reason}`, res.status);
  }
  return body as TokenResponse;
}

async function storeTokens(userId: string, t: TokenResponse) {
  const expiresAt = new Date(Date.now() + t.expires_in * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("meli_tokens")
    .upsert(
      {
        user_id: userId,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );
  if (error) throw new MeliError("api_error", "Falha ao salvar credenciais");
  return expiresAt;
}

async function setIntegration(userId: string, values: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("integrations")
    .upsert(
      { user_id: userId, provider: MELI_PROVIDER, ...values },
      { onConflict: "user_id,provider" },
    );
  if (error) log("error", "integration upsert failed", { userId, code: error.code });
}

/** Exchanges the authorization code, stores tokens and marks the account connected. */
export async function completeAuthorization(userId: string, code: string) {
  const { clientId, clientSecret, redirectUri } = getMeliConfig();
  const t = await tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  // A Mercado Livre account must not be linked to two different users here.
  const { data: other } = await supabaseAdmin
    .from("integrations")
    .select("user_id")
    .eq("provider", MELI_PROVIDER)
    .eq("ml_user_id", String(t.user_id))
    .neq("user_id", userId)
    .eq("status", "connected")
    .maybeSingle();
  if (other) {
    throw new MeliError(
      "forbidden",
      "Esta conta do Mercado Livre já está conectada a outro usuário da plataforma",
    );
  }

  const expiresAt = await storeTokens(userId, t);

  let nickname: string | null = null;
  try {
    const me = await fetch(`${MELI_API}/users/me`, {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    if (me.ok) nickname = ((await me.json()) as { nickname?: string }).nickname ?? null;
  } catch {
    /* nickname is cosmetic */
  }

  await setIntegration(userId, {
    status: "connected",
    ml_user_id: String(t.user_id),
    account_identifier: nickname ?? String(t.user_id),
    nickname,
    scope: t.scope ?? null,
    token_expires_at: expiresAt,
    connected_at: new Date().toISOString(),
    last_error: null,
  });
  log("info", "account connected", { userId, mlUserId: t.user_id });
}

export async function disconnect(userId: string) {
  await supabaseAdmin.from("meli_tokens").delete().eq("user_id", userId);
  await setIntegration(userId, {
    status: "disconnected",
    account_identifier: null,
    nickname: null,
    ml_user_id: null,
    token_expires_at: null,
    scope: null,
    last_error: null,
  });
}

/** Returns a valid access token for the user, refreshing it when needed. */
export async function getAccessToken(userId: string): Promise<string> {
  const { data: tok } = await supabaseAdmin
    .from("meli_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!tok)
    throw new MeliError("not_connected", "Conecte sua conta do Mercado Livre em Integrações");

  if (new Date(tok.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS) return tok.access_token;

  const { clientId, clientSecret } = getMeliConfig();
  try {
    // Refresh tokens are single-use: the new one replaces the old one.
    const t = await tokenRequest({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tok.refresh_token,
    });
    const expiresAt = await storeTokens(userId, t);
    await setIntegration(userId, {
      status: "connected",
      token_expires_at: expiresAt,
      last_error: null,
    });
    return t.access_token;
  } catch (e) {
    if (e instanceof MeliError && e.kind === "auth_expired") {
      await setIntegration(userId, {
        status: "expired",
        last_error: "Autorização expirada ou revogada. Reconecte a conta.",
      });
      throw new MeliError(
        "auth_expired",
        "Sua autorização do Mercado Livre expirou. Reconecte a conta em Integrações.",
      );
    }
    throw e;
  }
}

/** GET against the Mercado Livre API with the user's token and typed errors. */
export async function meliGet<T>(userId: string, path: string): Promise<T> {
  const token = await getAccessToken(userId);
  let res: Response;
  try {
    res = await fetch(`${MELI_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new MeliError("network", "Falha de conexão com o Mercado Livre");
  }
  if (res.ok) return (await res.json()) as T;

  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  const reason = body.message || body.error || `HTTP ${res.status}`;
  log("warn", "api error", { userId, status: res.status, path: path.split("?")[0] });
  if (res.status === 401) {
    await setIntegration(userId, { status: "expired", last_error: reason });
    throw new MeliError(
      "auth_expired",
      "Sua autorização do Mercado Livre expirou. Reconecte a conta.",
      401,
    );
  }
  if (res.status === 403) {
    throw new MeliError(
      "forbidden",
      `O Mercado Livre negou acesso a este recurso para o seu aplicativo (${reason}).`,
      403,
    );
  }
  if (res.status === 429)
    throw new MeliError(
      "rate_limited",
      "Limite de requisições do Mercado Livre atingido. Tente em instantes.",
      429,
    );
  if (res.status === 404)
    throw new MeliError("not_found", "Item não encontrado no Mercado Livre", 404);
  throw new MeliError("api_error", `Erro do Mercado Livre: ${reason}`, res.status);
}
