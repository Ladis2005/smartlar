import 'server-only';

import { createAdminSupabase, hasServiceRole } from '@/lib/supabase/admin';
import type { Category, NotificationRecord, OrderStatus, OrderWithRelations, PaymentMethod, Product, SiteSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/queries';

export interface DashboardStats {
  ordersToday: number;
  pendingOrders: number;
  paidOrders: number;
  salesTodayCents: number;
  salesMonthCents: number;
  averageTicketCents: number;
  failedNotifications: number;
}

function startOfTodayMaputo(): string {
  // Moçambique está em UTC+2 o ano inteiro (CAT), sem horário de verão.
  const now = new Date();
  const maputo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  maputo.setUTCHours(0, 0, 0, 0);
  return new Date(maputo.getTime() - 2 * 60 * 60 * 1000).toISOString();
}

function startOfMonthMaputo(): string {
  const now = new Date();
  const maputo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  maputo.setUTCDate(1);
  maputo.setUTCHours(0, 0, 0, 0);
  return new Date(maputo.getTime() - 2 * 60 * 60 * 1000).toISOString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const empty: DashboardStats = {
    ordersToday: 0,
    pendingOrders: 0,
    paidOrders: 0,
    salesTodayCents: 0,
    salesMonthCents: 0,
    averageTicketCents: 0,
    failedNotifications: 0,
  };

  if (!hasServiceRole()) return empty;

  const supabase = createAdminSupabase();
  const todayStart = startOfTodayMaputo();
  const monthStart = startOfMonthMaputo();

  const [todayOrders, monthOrders, pending, paid, failedNotifications] = await Promise.all([
    supabase.from('orders').select('total_cents, payment_status').gte('created_at', todayStart),
    supabase.from('orders').select('total_cents, payment_status').gte('created_at', monthStart),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('payment_status', ['pending', 'awaiting_confirmation']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);

  const today = todayOrders.data ?? [];
  const month = monthOrders.data ?? [];
  const paidMonth = month.filter((order) => order.payment_status === 'paid');

  const salesToday = today
    .filter((order) => order.payment_status === 'paid')
    .reduce((total, order) => total + (order.total_cents ?? 0), 0);
  const salesMonth = paidMonth.reduce((total, order) => total + (order.total_cents ?? 0), 0);

  return {
    ordersToday: today.length,
    pendingOrders: pending.count ?? 0,
    paidOrders: paid.count ?? 0,
    salesTodayCents: salesToday,
    salesMonthCents: salesMonth,
    averageTicketCents: paidMonth.length ? Math.round(salesMonth / paidMonth.length) : 0,
    failedNotifications: failedNotifications.count ?? 0,
  };
}

const ORDER_LIST_SELECT =
  'id, order_number, total_cents, payment_method, payment_status, order_status, created_at, customers(name, phone, city), order_items(product_name_snapshot, quantity), notifications(status)';

export interface OrderListRow {
  id: string;
  order_number: string;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: OrderWithRelations['payment_status'];
  order_status: OrderStatus;
  created_at: string;
  customers: { name: string; phone: string; city: string } | null;
  order_items: { product_name_snapshot: string; quantity: number }[];
  notifications: { status: string }[];
}

export async function listOrders(options: { status?: OrderStatus; search?: string; limit?: number } = {}) {
  if (!hasServiceRole()) return [] as OrderListRow[];

  const supabase = createAdminSupabase();
  let query = supabase
    .from('orders')
    .select(ORDER_LIST_SELECT)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status) query = query.eq('order_status', options.status);

  const { data } = await query;
  let rows = (data ?? []) as unknown as OrderListRow[];

  // A pesquisa por nome/telefone filtra em memória para evitar joins complexos.
  const term = options.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter(
      (order) =>
        order.order_number.toLowerCase().includes(term) ||
        order.customers?.name.toLowerCase().includes(term) ||
        order.customers?.phone.includes(term.replace(/\D/g, '')),
    );
  }

  return rows;
}

const ORDER_DETAIL_SELECT =
  'id, order_number, customer_id, subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, order_status, notes, purchase_event_id, purchase_tracked_at, created_at, updated_at, customers(*), order_items(*), payments(*), notifications(*)';

export async function getOrderDetail(id: string): Promise<OrderWithRelations | null> {
  if (!hasServiceRole()) return null;

  const supabase = createAdminSupabase();
  const { data } = await supabase.from('orders').select(ORDER_DETAIL_SELECT).eq('id', id).maybeSingle();
  return (data as unknown as OrderWithRelations) ?? null;
}

export async function getOrderLogs(orderId: string) {
  if (!hasServiceRole()) return [];
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('activity_logs')
    .select('id, event, detail, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as { id: string; event: string; detail: string | null; created_at: string }[];
}

export interface ActivityFeedItem {
  id: string;
  event: string;
  created_at: string;
  order_id: string | null;
  order_number: string | null;
  total_cents: number | null;
  customer_name: string | null;
}

const ACTIVITY_FEED_EVENTS = ['order_created', 'payment_confirmed'];

/** Alimenta o sino de notificações do painel: pedidos novos e pagamentos confirmados. */
export async function getRecentActivity(limit = 15): Promise<ActivityFeedItem[]> {
  if (!hasServiceRole()) return [];

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('activity_logs')
    .select('id, event, created_at, order_id, orders(order_number, total_cents, customers(name))')
    .in('event', ACTIVITY_FEED_EVENTS)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    event: row.event,
    created_at: row.created_at,
    order_id: row.order_id,
    order_number: row.orders?.order_number ?? null,
    total_cents: row.orders?.total_cents ?? null,
    customer_name: row.orders?.customers?.name ?? null,
  }));
}

export async function listAdminProducts(): Promise<Product[]> {
  if (!hasServiceRole()) return [];

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .order('created_at', { ascending: false });

  return (data ?? []).map((row: any) => ({
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    categories: Array.isArray(row.categories) ? (row.categories[0] ?? null) : (row.categories ?? null),
  })) as Product[];
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  if (!hasServiceRole()) return null;
  const supabase = createAdminSupabase();
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return { ...data, images: Array.isArray(data.images) ? data.images : [] } as Product;
}

export async function listAdminCategories(): Promise<Category[]> {
  if (!hasServiceRole()) return [];
  const supabase = createAdminSupabase();
  const { data } = await supabase.from('categories').select('*').order('position');
  return (data ?? []) as Category[];
}

export async function getAdminSettings(): Promise<SiteSettings> {
  if (!hasServiceRole()) return DEFAULT_SETTINGS;
  const supabase = createAdminSupabase();
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as SiteSettings;
}

export async function listFailedNotifications(): Promise<NotificationRecord[]> {
  if (!hasServiceRole()) return [];
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as NotificationRecord[];
}
