'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { createAdminSupabase, hasServiceRole } from '@/lib/supabase/admin';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import {
  notifyAdminNewOrder,
  notifyAdminNewOrderByEmail,
  notifyAdminNewOrderByPush,
  notifyCustomerOrderReceived,
} from '@/lib/whatsapp/notify';

export interface CheckoutSuccess {
  ok: true;
  orderNumber: string;
  purchaseEventId: string;
  totalCents: number;
  contentIds: string[];
  numItems: number;
  duplicate: boolean;
  notification: 'sent' | 'failed';
}

export interface CheckoutFailure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export type CheckoutResult = CheckoutSuccess | CheckoutFailure;

function friendlyDbError(message: string): string {
  if (message.startsWith('OUT_OF_STOCK:')) {
    return `Já não temos stock suficiente de "${message.split(':')[1]}". Ajuste a quantidade no carrinho.`;
  }
  if (message.startsWith('PRODUCT_UNAVAILABLE:')) {
    return `O produto "${message.split(':')[1]}" deixou de estar disponível. Remova-o do carrinho para continuar.`;
  }
  if (message.includes('EMPTY_CART')) return 'O carrinho está vazio.';
  if (message.includes('INVALID_QUANTITY')) return 'Quantidade inválida num dos produtos.';
  return 'Não foi possível registar a encomenda. Tente novamente dentro de instantes.';
}

export async function createOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  if (!hasServiceRole()) {
    return {
      ok: false,
      error: 'A loja ainda não está ligada à base de dados. Configure o Supabase no ficheiro .env.local.',
    };
  }

  // Trava rajadas de cliques e tentativas automatizadas.
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  const limit = rateLimit(`checkout:${ip}`, 8, 60_000);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Demasiadas tentativas seguidas. Aguarde ${limit.retryAfterSeconds} segundos e tente de novo.`,
    };
  }

  let data;
  try {
    data = checkoutSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: 'Verifique os campos assinalados.', fieldErrors };
    }
    return { ok: false, error: 'Dados inválidos.' };
  }

  const supabase = createAdminSupabase();

  // A função create_order corre numa única transação: revalida preços na base
  // de dados, verifica o stock, calcula o total no servidor, gera o número do
  // pedido e reserva o stock. O preço enviado pelo navegador é ignorado.
  const { data: result, error } = await supabase.rpc('create_order', {
    payload: {
      idempotency_key: data.idempotencyKey,
      customer: {
        name: data.name,
        phone: data.phone,
        alternative_phone: data.alternativePhone ?? '',
        province: data.province,
        city: data.city,
        neighborhood: data.neighborhood,
        address_reference: data.addressReference,
      },
      items: data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      payment: {
        method: data.paymentMethod,
        payer_phone: data.payerPhone ?? '',
        transaction_reference: data.transactionReference ?? '',
        receipt_url: data.receiptUrl ?? '',
      },
      notes: data.notes ?? '',
    },
  });

  if (error || !result) {
    logger.error('order_create_failed', { reason: error?.message ?? 'sem resposta' });
    return { ok: false, error: friendlyDbError(error?.message ?? '') };
  }

  const order = result as {
    order_id: string;
    order_number: string;
    total_cents: number;
    purchase_event_id: string;
    duplicate: boolean;
  };

  logger.info('order_created', {
    orderNumber: order.order_number,
    totalCents: order.total_cents,
    items: data.items.length,
    paymentMethod: data.paymentMethod,
    duplicate: order.duplicate,
  });

  // Se o cliente indicou referência de pagamento, a encomenda passa a
  // "aguardando confirmação" — quem confirma é o administrador, no painel.
  if (!order.duplicate && (data.transactionReference || data.payerPhone || data.receiptUrl)) {
    await supabase
      .from('orders')
      .update({ payment_status: 'awaiting_confirmation', order_status: 'payment_pending' })
      .eq('id', order.order_id);
    await supabase
      .from('payments')
      .update({ status: 'awaiting_confirmation' })
      .eq('order_id', order.order_id);
    logger.info('payment_submitted', { orderNumber: order.order_number, method: data.paymentMethod });
  }

  // A encomenda já está gravada. A notificação é uma etapa separada: se falhar,
  // o pedido mantém-se e fica disponível para reenvio no painel.
  let notification: 'sent' | 'failed' = 'failed';
  if (!order.duplicate) {
    const [whatsappResult, emailResult, pushResult] = await Promise.all([
      notifyAdminNewOrder(order.order_id),
      notifyAdminNewOrderByEmail(order.order_id),
      notifyAdminNewOrderByPush(order.order_id),
    ]);
    notification =
      whatsappResult.status === 'sent' || emailResult.status === 'sent' || pushResult.status === 'sent'
        ? 'sent'
        : 'failed';
    // Só corre quando existir um template aprovado para o cliente.
    void notifyCustomerOrderReceived(order.order_id).catch(() => undefined);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/pedidos');

  return {
    ok: true,
    orderNumber: order.order_number,
    purchaseEventId: order.purchase_event_id,
    totalCents: order.total_cents,
    contentIds: data.items.map((item) => item.productId),
    numItems: data.items.reduce((total, item) => total + item.quantity, 0),
    duplicate: order.duplicate,
    notification,
  };
}
