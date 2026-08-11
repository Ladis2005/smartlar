'use server';

import { headers } from 'next/headers';

import { createAdminSupabase, hasServiceRole } from '@/lib/supabase/admin';
import { sendServerEvent, isCapiConfigured } from '@/lib/meta-capi';
import { logger } from '@/lib/logger';

export interface PurchaseClaim {
  shouldTrack: boolean;
  eventId?: string;
  valueCents?: number;
  contentIds?: string[];
  numItems?: number;
}

/**
 * Reserva o evento Purchase para esta encomenda. A base de dados só devolve
 * "true" na primeira chamada (purchase_tracked_at passa de NULL a agora), por
 * isso um refresh de /pedido-confirmado nunca dispara Purchase duas vezes.
 * O mesmo event_id é usado no Pixel e na Conversions API, para deduplicação.
 */
export async function claimPurchaseEvent(orderNumber: string, token: string): Promise<PurchaseClaim> {
  if (!hasServiceRole() || !orderNumber || !token) return { shouldTrack: false };

  const supabase = createAdminSupabase();
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, total_cents, purchase_event_id, purchase_tracked_at, order_items(product_id, quantity), customers(name, phone, city)')
    .eq('order_number', orderNumber.toUpperCase())
    .eq('purchase_event_id', token)
    .maybeSingle();

  if (!order) return { shouldTrack: false };

  const { data: claimed } = await supabase.rpc('claim_purchase_event', {
    p_order_number: order.order_number,
  });

  if (!claimed) return { shouldTrack: false };

  const items = (order.order_items ?? []) as { product_id: string | null; quantity: number }[];
  const contentIds = items.map((item) => item.product_id).filter((id): id is string => Boolean(id));
  const numItems = items.reduce((total, item) => total + item.quantity, 0);

  if (isCapiConfigured()) {
    const customer = (Array.isArray(order.customers) ? order.customers[0] : order.customers) as
      | { name?: string; phone?: string; city?: string }
      | null;
    const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const result = await sendServerEvent({
      eventName: 'Purchase',
      eventId: order.purchase_event_id,
      eventSourceUrl: `${origin}/pedido-confirmado/${order.order_number}`,
      valueCents: order.total_cents,
      contentIds,
      numItems,
      user: { phone: customer?.phone, name: customer?.name, city: customer?.city },
    });
    if (result.ok) {
      await supabase.from('orders').update({ capi_sent_at: new Date().toISOString() }).eq('id', order.id);
    }
  }

  logger.info('purchase_event_claimed', { orderNumber: order.order_number });

  return {
    shouldTrack: true,
    eventId: order.purchase_event_id,
    valueCents: order.total_cents,
    contentIds,
    numItems,
  };
}
