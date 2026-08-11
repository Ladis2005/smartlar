'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { notifyAdminNewOrder, notifyAdminNewOrderByEmail } from '@/lib/whatsapp/notify';
import { ORDER_STATUS_LABELS } from '@/lib/status';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const ALLOWED_STATUS: OrderStatus[] = [
  'new',
  'payment_pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

function refresh(orderId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!ALLOWED_STATUS.includes(status)) return { ok: false, message: 'Estado inválido.' };

  const supabase = createAdminSupabase();
  const { error } = await supabase.from('orders').update({ order_status: status }).eq('id', orderId);
  if (error) return { ok: false, message: 'Não foi possível guardar o novo estado.' };

  // Cancelar devolve o stock reservado.
  if (status === 'cancelled') {
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    for (const item of items ?? []) {
      if (item.product_id) {
        await supabase.rpc('restore_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      }
    }
    await supabase.from('orders').update({ payment_status: 'cancelled' }).eq('id', orderId);
  }

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    event: 'status_changed',
    detail: `Estado alterado para "${ORDER_STATUS_LABELS[status]}" por ${session.email}`,
  });

  logger.info('order_status_changed', { orderId, status, by: session.email });
  refresh(orderId);
  return { ok: true, message: `Estado atualizado para ${ORDER_STATUS_LABELS[status]}.` };
}

export async function confirmPayment(orderId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = createAdminSupabase();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid' as PaymentStatus, order_status: 'confirmed' })
    .eq('id', orderId);

  if (error) return { ok: false, message: 'Não foi possível confirmar o pagamento.' };

  await supabase
    .from('payments')
    .update({ status: 'paid', confirmed_at: now, confirmed_by: session.email })
    .eq('order_id', orderId);

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    event: 'payment_confirmed',
    detail: `Pagamento confirmado por ${session.email}`,
  });

  logger.info('payment_confirmed', { orderId, by: session.email });
  refresh(orderId);
  return { ok: true, message: 'Pagamento confirmado.' };
}

export async function markPaymentFailed(orderId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = createAdminSupabase();

  await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId);
  await supabase.from('payments').update({ status: 'failed' }).eq('order_id', orderId);
  await supabase.from('activity_logs').insert({
    order_id: orderId,
    event: 'payment_failed',
    detail: `Pagamento marcado como não recebido por ${session.email}`,
  });

  refresh(orderId);
  return { ok: true, message: 'Pagamento marcado como não recebido.' };
}

export async function resendOrderNotification(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await notifyAdminNewOrder(orderId);
  refresh(orderId);

  return result.status === 'sent'
    ? { ok: true, message: 'Notificação enviada para o WhatsApp do administrador.' }
    : { ok: false, message: result.error ?? 'Não foi possível enviar a notificação.' };
}

export async function resendOrderNotificationEmail(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await notifyAdminNewOrderByEmail(orderId);
  refresh(orderId);

  return result.status === 'sent'
    ? { ok: true, message: 'Notificação enviada para o e-mail do administrador.' }
    : { ok: false, message: result.error ?? 'Não foi possível enviar a notificação.' };
}

/** Link temporário para ver o comprovativo guardado no bucket privado. */
export async function getReceiptUrl(path: string): Promise<string | null> {
  await requireAdmin();
  if (!path) return null;

  if (path.startsWith('http')) return path;

  const supabase = createAdminSupabase();
  const { data } = await supabase.storage.from('comprovativos').createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
