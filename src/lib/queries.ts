import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  permalink: string | null;
  rating: number;
  reviews_count: number;
  sold_quantity: number;
  free_shipping: boolean;
  is_new: boolean;
  source: string;
  description: string | null;
  created_at: string;
};

export type UserProduct = {
  id: string;
  product_id: string;
  status: string;
  created_at: string;
  products: Product | null;
};

export type AffiliateLink = {
  id: string;
  product_id: string;
  url: string;
  clicks: number;
  created_at: string;
};

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sold_quantity", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Product[];
};

export const fetchMyProducts = async (userId: string): Promise<UserProduct[]> => {
  const { data, error } = await supabase
    .from("user_products")
    .select("id, product_id, status, created_at, products(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UserProduct[];
};

export const fetchMyLinks = async (userId: string): Promise<AffiliateLink[]> => {
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("id, product_id, url, clicks, created_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as AffiliateLink[];
};

export const fetchIntegration = async (userId: string) => {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "mercado_livre")
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("ordered_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchCommissions = async (userId: string) => {
  const { data, error } = await supabase
    .from("commissions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchTickets = async (userId: string, all = false) => {
  let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
  if (!all) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};
