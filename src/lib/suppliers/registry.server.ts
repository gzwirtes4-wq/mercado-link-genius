// Server-only registry of supplier adapters.
//
// No adapter is registered yet: CJdropshipping and the national suppliers
// (Dropify, DSLite, Hubiss, Dimona, Laquila, Vavi…) need their official API
// documentation and credentials verified first. To add one:
//   1. create src/lib/suppliers/<slug>.server.ts exporting a SupplierAdapter
//   2. add it to ADAPTERS below
//   3. insert a row in public.suppliers with the same slug (active = false
//      until it is tested)
import type { SupplierAdapter } from "./types";

const ADAPTERS: SupplierAdapter[] = [];

export function listAdapters() {
  return ADAPTERS.map((a) => ({
    slug: a.slug,
    name: a.name,
    origin: a.origin,
    configured: a.requiredEnv.every((k) => Boolean(process.env[k])),
  }));
}

export function getAdapter(slug: string): SupplierAdapter | null {
  return ADAPTERS.find((a) => a.slug === slug) ?? null;
}
