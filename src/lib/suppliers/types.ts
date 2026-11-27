// Standard shape every supplier integration must produce. Adapters translate
// the supplier's own API payload into this, and the sync service stores it in
// `public.supplier_products` / `public.supplier_product_variants`.
//
// Rule: never fill a field the supplier did not provide. Unknown = null.

export type SupplierOrigin = "nacional" | "internacional";

export type NormalizedVariant = {
  externalId: string;
  sku: string | null;
  attributes: Record<string, string>; // e.g. { cor: "azul", tamanho: "M" }
  costPrice: number | null;
  stock: number | null;
  image: string | null;
};

export type NormalizedProduct = {
  externalId: string;
  sku: string | null;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  images: string[];
  costPrice: number | null;
  currency: string | null; // ISO 4217, e.g. "USD", "BRL"
  stock: number | null;
  weightGrams: number | null;
  dimensionsCm: { l: number; w: number; h: number } | null;
  shipsFrom: string | null;
  shipsToBrazil: boolean | null;
  deliveryDays: { min: number; max: number } | null;
  supplierUrl: string | null;
  variants: NormalizedVariant[];
  raw: unknown; // original payload, kept for re-normalization
};

export type SupplierSearchParams = {
  query?: string;
  category?: string;
  page: number; // 1-based
  pageSize: number;
};

export type SupplierAdapter = {
  /** Matches `public.suppliers.slug`. */
  slug: string;
  name: string;
  origin: SupplierOrigin;
  /** Official API documentation that this adapter was written against. */
  docsUrl: string;
  /** Server env vars the adapter needs (names only). */
  requiredEnv: string[];
  search(
    params: SupplierSearchParams,
  ): Promise<{ items: NormalizedProduct[]; total: number | null }>;
  getProduct(externalId: string): Promise<NormalizedProduct | null>;
};
