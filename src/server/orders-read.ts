import 'server-only';

import { createAdminSupabase, hasServiceRole } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/validation';
import type { OrderWithRelations } from '@/lib/types';

const ORDER_SELECT =
  'id, order_number, customer_id, subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, order_status, notes, purchase_event_id, purchase_tracked_at, created_at, updated_at, customers(*), order_items(*), payments(*)';

/**
 * Página de confirmação. O número do pedido é sequencial, por isso não basta
 * para autorizar: exigimos também o token (purchase_event_id), que é um UUID.
 */
export async function getOrderForConfirmation(
  orderNumber: string,
  token: string | undefined,
): Promise<OrderWithRelations | null> {
  if (!hasServiceRole() || !token) return null;

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_number', orderNumber.toUpperCase())
    .eq('purchase_event_id', token)
    .maybeSingle();

  return (data as unknown as OrderWithRelations) ?? null;
}

/** Consulta pública em /rastrear-pedido: número do pedido + telefone do cliente. */
export async function findOrderForTracking(
  orderNumber: string,
  phone: string,
): Promise<OrderWithRelations | null> {
  if (!hasServiceRole()) return null;

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_number', orderNumber.trim().toUpperCase())
    .maybeSingle();

  const order = (data as unknown as OrderWithRelations) ?? null;
  if (!order) return null;
  if (normalizePhone(order.customers?.phone ?? '') !== normalizePhone(phone)) return null;

  return order;
}
