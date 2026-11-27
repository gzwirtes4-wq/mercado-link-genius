// Mercado Livre server functions. The handlers run only on the server; the
// browser receives RPC stubs. Tokens and the client secret never leave the server.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MeliFailure = { ok: false; kind: string; message: string };
type Result<T> = ({ ok: true } & T) | MeliFailure;

export type MeliSearchItem = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  category_id: string;
  sold_quantity: number;
  condition: string;
  shipping: { free_shipping: boolean };
  seller: {
    id: number;
    nickname: string;
    seller_reputation?: { level_id: string | null; power_seller_status: string | null };
  };
};

/** Status of the current user's connection (no tokens are returned). */
export const meliStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isMeliConfigured, MELI_PROVIDER } = await import("@/lib/meli.server");
    const { data } = await context.supabase
      .from("integrations")
      .select(
        "status, account_identifier, nickname, ml_user_id, connected_at, token_expires_at, last_error",
      )
      .eq("user_id", context.userId)
      .eq("provider", MELI_PROVIDER)
      .maybeSingle();
    return { configured: isMeliConfigured(), integration: data ?? null };
  });

/** Starts the official OAuth flow; returns the Mercado Livre authorization URL. */
export const meliStartAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result<{ url: string }>> => {
    try {
      const { getMeliConfig, createOAuthState, MELI_AUTH_URL } = await import("@/lib/meli.server");
      const { clientId, redirectUri } = getMeliConfig();
      const state = await createOAuthState(context.userId);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
      });
      return { ok: true, url: `${MELI_AUTH_URL}?${params.toString()}` };
    } catch (e) {
      const { toFailure } = await import("@/lib/meli.server");
      return toFailure(e);
    }
  });

export const meliDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result<object>> => {
    try {
      const { disconnect } = await import("@/lib/meli.server");
      await disconnect(context.userId);
      return { ok: true };
    } catch (e) {
      const { toFailure } = await import("@/lib/meli.server");
      return toFailure(e);
    }
  });

type SearchInput = {
  q?: string;
  category?: string;
  sort?: string;
  sellerId?: string;
  offset?: number;
  limit?: number;
};

const ID_RE = /^[A-Z]{3}\d+$/;

/** Searches Mercado Livre listings with the user's own token. */
export const meliSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SearchInput): Required<SearchInput> => ({
    q: typeof d?.q === "string" ? d.q.trim().slice(0, 120) : "",
    category: typeof d?.category === "string" && ID_RE.test(d.category) ? d.category : "",
    sort: typeof d?.sort === "string" && /^[a-z_]{1,30}$/.test(d.sort) ? d.sort : "",
    sellerId: typeof d?.sellerId === "string" && /^\d{1,15}$/.test(d.sellerId) ? d.sellerId : "",
    offset: Math.max(0, Math.min(Number(d?.offset) || 0, 1000)),
    limit: Math.max(1, Math.min(Number(d?.limit) || 24, 50)),
  }))
  .handler(
    async ({ data, context }): Promise<Result<{ items: MeliSearchItem[]; total: number }>> => {
      try {
        const { meliGet } = await import("@/lib/meli.server");
        const p = new URLSearchParams({ offset: String(data.offset), limit: String(data.limit) });
        if (data.q) p.set("q", data.q);
        if (data.category) p.set("category", data.category);
        if (data.sort) p.set("sort", data.sort);
        if (data.sellerId) p.set("seller_id", data.sellerId);
        if (!data.q && !data.category && !data.sellerId) p.set("category", "MLB1000");
        const r = await meliGet<{ results?: MeliSearchItem[]; paging?: { total?: number } }>(
          context.userId,
          `/sites/MLB/search?${p.toString()}`,
        );
        // Mercado Livre caps search paging at offset 1000
        return { ok: true, items: r.results ?? [], total: Math.min(r.paging?.total ?? 0, 1000) };
      } catch (e) {
        const { toFailure } = await import("@/lib/meli.server");
        return toFailure(e);
      }
    },
  );

/**
 * Saves a Mercado Livre listing into the shared catalog cache (`products`).
 * The data is re-fetched from the official API on the server, so users can
 * never inject arbitrary products into the shared catalog.
 */
export const meliSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { itemId: string }) => {
    const itemId = typeof d?.itemId === "string" ? d.itemId.trim().toUpperCase() : "";
    if (!ID_RE.test(itemId)) throw new Error("ID de anúncio inválido");
    return { itemId };
  })
  .handler(async ({ data, context }): Promise<Result<{ productId: string }>> => {
    try {
      const { meliGet } = await import("@/lib/meli.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const item = await meliGet<{
        id: string;
        title: string;
        price: number;
        original_price: number | null;
        category_id: string;
        thumbnail: string;
        pictures?: { secure_url?: string; url?: string }[];
        permalink: string;
        sold_quantity?: number;
        status?: string;
        shipping?: { free_shipping?: boolean };
        condition?: string;
      }>(context.userId, `/items/${data.itemId}`);

      const image =
        item.pictures?.[0]?.secure_url ?? item.pictures?.[0]?.url ?? item.thumbnail ?? null;
      const { data: saved, error } = await supabaseAdmin
        .from("products")
        .upsert(
          {
            external_id: item.id,
            title: item.title,
            price: item.price,
            original_price: item.original_price ?? null,
            category: item.category_id ?? "Geral",
            image_url: image?.replace(/^http:/, "https:") ?? null,
            permalink: item.permalink,
            sold_quantity: item.sold_quantity ?? 0,
            free_shipping: item.shipping?.free_shipping ?? false,
            is_new: item.condition === "new",
            source: "mercadolivre",
            active: item.status ? item.status === "active" : true,
          },
          { onConflict: "external_id" },
        )
        .select("id")
        .single();
      if (error || !saved)
        return { ok: false, kind: "db", message: "Não foi possível salvar o produto no catálogo" };
      return { ok: true, productId: saved.id };
    } catch (e) {
      const { toFailure } = await import("@/lib/meli.server");
      return toFailure(e);
    }
  });
