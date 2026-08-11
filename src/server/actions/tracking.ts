'use server';

import { findOrderForTracking } from '@/server/orders-read';
import { rateLimit } from '@/lib/rate-limit';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/status';
import { formatMzn } from '@/lib/money';
import { formatMaputoDateTime } from '@/lib/whatsapp/message';

export interface TrackedOrder {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: string;
  items: { name: string; quantity: number; subtotal: string }[];
  delivery: string;
}

export interface TrackResult {
  ok: boolean;
  message?: string;
  order?: TrackedOrder;
}

export async function trackOrderAction(orderNumber: string, phone: string): Promise<TrackResult> {
  const limit = rateLimit(`track:${phone}`, 10, 60_000);
  if (!limit.allowed) {
    return { ok: false, message: `Demasiadas consultas. Aguarde ${limit.retryAfterSeconds} segundos.` };
  }

  if (!orderNumber.trim() || !phone.trim()) {
    return { ok: false, message: 'Escreva o número do pedido e o telefone usado na compra.' };
  }

  const order = await findOrderForTracking(orderNumber, phone);
  if (!order) {
    return { ok: false, message: 'Não encontrámos nenhum pedido com esses dados. Verifique o número e o telefone.' };
  }

  return {
    ok: true,
    order: {
      orderNumber: order.order_number,
      createdAt: formatMaputoDateTime(order.created_at),
      status: ORDER_STATUS_LABELS[order.order_status],
      paymentStatus: PAYMENT_STATUS_LABELS[order.payment_status],
      paymentMethod: PAYMENT_METHOD_LABELS[order.payment_method],
      total: formatMzn(order.total_cents),
      items: order.order_items.map((item) => ({
        name: item.product_name_snapshot,
        quantity: item.quantity,
        subtotal: formatMzn(item.subtotal_cents),
      })),
      delivery: `${order.customers?.neighborhood ?? ''}, ${order.customers?.city ?? ''}`,
    },
  };
}
