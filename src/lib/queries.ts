import { createAnonSupabase } from './supabase/server';
import type { Category, Product, SiteSettings } from './types';

const PRODUCT_COLUMNS =
  'id, name, slug, sku, short_description, description, category_id, price_cents, compare_at_price_cents, images, stock, is_active, is_featured, is_new, sales_count, created_at, categories(name, slug)';

export const DEFAULT_SETTINGS: SiteSettings = {
  store_name: 'SmartLar',
  tagline: 'Inovação • Conforto • Para o seu lar.',
  contact_whatsapp: null,
  contact_email: null,
  mpesa_number: process.env.MPESA_NUMBER ?? '858910700',
  emola_number: process.env.EMOLA_NUMBER ?? '870253638',
  mpesa_enabled: true,
  emola_enabled: true,
  cod_enabled: true,
  delivery_fee_cents: 0,
  free_delivery_threshold_cents: null,
  delivery_areas: ['Maputo', 'Matola'],
  announcement: null,
};

function normalize(row: any): Product {
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    categories: Array.isArray(row.categories) ? (row.categories[0] ?? null) : (row.categories ?? null),
  } as Product;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createAnonSupabase();
  if (!supabase) return DEFAULT_SETTINGS;

  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data } as SiteSettings;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createAnonSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, position, is_active')
    .eq('is_active', true)
    .order('position', { ascending: true });

  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createAnonSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, position, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  return (data as Category) ?? null;
}

interface ProductQuery {
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  isNew?: boolean;
  onSale?: boolean;
  bestSellers?: boolean;
  search?: string;
  limit?: number;
  excludeId?: string;
}

export async function getProducts(options: ProductQuery = {}): Promise<Product[]> {
  const supabase = createAnonSupabase();
  if (!supabase) return [];

  let query = supabase.from('products').select(PRODUCT_COLUMNS).eq('is_active', true);

  if (options.categoryId) query = query.eq('category_id', options.categoryId);
  if (options.featured) query = query.eq('is_featured', true);
  if (options.isNew) query = query.eq('is_new', true);
  if (options.onSale) query = query.not('compare_at_price_cents', 'is', null);
  if (options.excludeId) query = query.neq('id', options.excludeId);
  if (options.search) {
    const term = options.search.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,short_description.ilike.%${term}%`);
  }

  query = options.bestSellers
    ? query.order('sales_count', { ascending: false })
    : query.order('created_at', { ascending: false });

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(normalize);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createAnonSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  return data ? normalize(data) : null;
}

export async function getAllProductSlugs(): Promise<{ slug: string; created_at: string }[]> {
  const supabase = createAnonSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('products').select('slug, created_at').eq('is_active', true);
  return (data ?? []) as { slug: string; created_at: string }[];
}
