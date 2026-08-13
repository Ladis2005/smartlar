import 'server-only';

import { createAdminSupabase } from '../supabase/admin';
import { logger } from '../logger';
import { toInternationalPhone } from '../validation';
import type { OrderWithRelations } from '../types';
import {
  buildAdminOrderMessage,
  buildCustomerOrderMessage,
  type NotificationOrderData,
} from './message';
import {
  NOT_CONFIGURED_ERROR,
  getAdminWhatsAppNumber,
  getWhatsAppProvider,
} from './provider';
import { getAdminNotificationEmail, getEmailProvider } from '../email/provider';
import { sendPushToAdmins } from '../push/provider';
import { formatMzn } from '../money';

export interface NotifyResult {
  status: 'sent' | 'failed';
  error?: string;
  notificationId?: string;
}

const ORDER_SELECT =
  'id, order_number, subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, order_status, notes, created_at, customers(*), order_items(*), payments(*)';

async function loadOrder(orderId: string): Promise<OrderWithRelations | null> {
  const supabase = createAdminSupabase();
  const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle();
  return (data as unknown as OrderWithRelations) ?? null;
}

export function toNotificationData(order: OrderWithRelations): NotificationOrderData {
  const payment = order.payments?.[0];
  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    items: (order.order_items ?? []).map((item) => ({
      name: item.product_name_snapshot,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    })),
    totalCents: order.total_cents,
    deliveryFeeCents: order.delivery_fee_cents,
    customer: {
      name: order.customers?.name ?? 'Cliente',
      phone: order.customers?.phone ?? '',
    },
    delivery: {
      province: order.customers?.province,
      city: order.customers?.city ?? '',
      neighborhood: order.customers?.neighborhood ?? '',
      reference: order.customers?.address_reference ?? '',
    },
    payment: {
      method: order.payment_method,
      status: order.payment_status,
      payerPhone: payment?.payer_phone ?? null,
      reference: payment?.transaction_reference ?? null,
    },
  };
}

/**
 * Envia (ou reenvia) a notificação de encomenda ao administrador.
 * A encomenda já existe na base de dados antes desta função ser chamada: se o
 * envio falhar, o pedido mantém-se intacto e fica marcado para reenvio.
 */
export async function notifyAdminNewOrder(orderId: string): Promise<NotifyResult> {
  const supabase = createAdminSupabase();
  const order = await loadOrder(orderId);
  if (!order) return { status: 'failed', error: 'Encomenda não encontrada.' };

  const data = toNotificationData(order);
  const body = buildAdminOrderMessage(data);
  const recipient = getAdminWhatsAppNumber();
  const provider = getWhatsAppProvider();

  // Uma encomenda tem um único registo de notificação para o administrador:
  // cada tentativa incrementa o contador em vez de criar linhas novas.
  const { data: existing } = await supabase
    .from('notifications')
    .select('id, attempts')
    .eq('order_id', order.id)
    .eq('audience', 'admin')
    .maybeSingle();

  let notificationId = existing?.id as string | undefined;
  const attempts = (existing?.attempts ?? 0) + 1;

  if (!notificationId) {
    const { data: created } = await supabase
      .from('notifications')
      .insert({
        order_id: order.id,
        channel: 'whatsapp',
        audience: 'admin',
        recipient,
        payload_preview: body.slice(0, 1000),
        status: 'pending',
        attempts: 0,
      })
      .select('id')
      .single();
    notificationId = created?.id as string | undefined;
  }

  const finish = async (status: 'sent' | 'failed', error?: string, messageId?: string) => {
    if (notificationId) {
      await supabase
        .from('notifications')
        .update({
          status,
          attempts,
          recipient,
          payload_preview: body.slice(0, 1000),
          last_error: error ?? null,
          provider_message_id: messageId ?? null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', notificationId);
    }
    await supabase.from('activity_logs').insert({
      order_id: order.id,
      event: status === 'sent' ? 'notification_sent' : 'notification_failed',
      detail: status === 'sent' ? 'Notificação WhatsApp enviada ao administrador' : error ?? 'Falha desconhecida',
    });
  };

  if (!recipient) {
    const error = 'ADMIN_WHATSAPP_NUMBER não está definido.';
    logger.warn('notification_not_configured', { orderNumber: order.order_number, reason: error });
    await finish('failed', error);
    return { status: 'failed', error, notificationId };
  }

  if (!provider.isConfigured()) {
    const error = `${NOT_CONFIGURED_ERROR} Em falta: ${provider.missingConfig().join(', ')}`;
    logger.warn('notification_not_configured', { orderNumber: order.order_number, reason: error });
    await finish('failed', error);
    return { status: 'failed', error, notificationId };
  }

  const templateName = process.env.WHATSAPP_ADMIN_TEMPLATE_NAME;
  const result = templateName
    ? await provider.sendTemplate(recipient, templateName, [order.order_number, body])
    : await provider.sendText(recipient, body);

  if (result.ok) {
    logger.info('notification_sent', { orderNumber: order.order_number, channel: 'whatsapp' });
    await finish('sent', undefined, result.messageId);
    return { status: 'sent', notificationId };
  }

  logger.warn('notification_failed', { orderNumber: order.order_number, reason: result.error });
  await finish('failed', result.error);
  return { status: 'failed', error: result.error, notificationId };
}

/**
 * Envia (ou reenvia) a notificação de encomenda nova ao administrador, por
 * e-mail. Segue o mesmo padrão de um-registo-por-encomenda que a notificação
 * de WhatsApp: cada tentativa incrementa o contador em vez de criar linhas novas.
 */
export async function notifyAdminNewOrderByEmail(orderId: string): Promise<NotifyResult> {
  const supabase = createAdminSupabase();
  const order = await loadOrder(orderId);
  if (!order) return { status: 'failed', error: 'Encomenda não encontrada.' };

  const data = toNotificationData(order);
  const body = buildAdminOrderMessage(data);
  const subject = `🔔 Novo pedido #${order.order_number} — SmartLar`;
  const recipient = getAdminNotificationEmail();
  const provider = getEmailProvider();

  const { data: existing } = await supabase
    .from('notifications')
    .select('id, attempts')
    .eq('order_id', order.id)
    .eq('audience', 'admin')
    .eq('channel', 'email')
    .maybeSingle();

  let notificationId = existing?.id as string | undefined;
  const attempts = (existing?.attempts ?? 0) + 1;

  if (!notificationId) {
    const { data: created } = await supabase
      .from('notifications')
      .insert({
        order_id: order.id,
        channel: 'email',
        audience: 'admin',
        recipient,
        payload_preview: body.slice(0, 1000),
        status: 'pending',
        attempts: 0,
      })
      .select('id')
      .single();
    notificationId = created?.id as string | undefined;
  }

  const finish = async (status: 'sent' | 'failed', error?: string, messageId?: string) => {
    if (notificationId) {
      await supabase
        .from('notifications')
        .update({
          status,
          attempts,
          recipient,
          payload_preview: body.slice(0, 1000),
          last_error: error ?? null,
          provider_message_id: messageId ?? null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', notificationId);
    }
    await supabase.from('activity_logs').insert({
      order_id: order.id,
      event: status === 'sent' ? 'notification_sent' : 'notification_failed',
      detail: status === 'sent' ? 'Notificação por e-mail enviada ao administrador' : error ?? 'Falha desconhecida',
    });
  };

  if (!recipient) {
    const error = 'ADMIN_NOTIFICATION_EMAIL não está definido.';
    logger.warn('notification_not_configured', { orderNumber: order.order_number, reason: error, channel: 'email' });
    await finish('failed', error);
    return { status: 'failed', error, notificationId };
  }

  if (!provider.isConfigured()) {
    const error = `Email API não configurada. Em falta: ${provider.missingConfig().join(', ')}`;
    logger.warn('notification_not_configured', { orderNumber: order.order_number, reason: error, channel: 'email' });
    await finish('failed', error);
    return { status: 'failed', error, notificationId };
  }

  const result = await provider.send(recipient, subject, body);

  if (result.ok) {
    logger.info('notification_sent', { orderNumber: order.order_number, channel: 'email' });
    await finish('sent', undefined, result.messageId);
    return { status: 'sent', notificationId };
  }

  logger.warn('notification_failed', { orderNumber: order.order_number, reason: result.error, channel: 'email' });
  await finish('failed', result.error);
  return { status: 'failed', error: result.error, notificationId };
}

/** Notifica todos os dispositivos (telemóvel/navegador) subscritos via push. */
export async function notifyAdminNewOrderByPush(orderId: string): Promise<NotifyResult> {
  const supabase = createAdminSupabase();
  const order = await loadOrder(orderId);
  if (!order) return { status: 'failed', error: 'Encomenda não encontrada.' };

  const data = toNotificationData(order);
  const body = formatMzn(data.totalCents);

  const { data: existing } = await supabase
    .from('notifications')
    .select('id, attempts')
    .eq('order_id', order.id)
    .eq('audience', 'admin')
    .eq('channel', 'push')
    .maybeSingle();

  let notificationId = existing?.id as string | undefined;
  const attempts = (existing?.attempts ?? 0) + 1;

  if (!notificationId) {
    const { data: created } = await supabase
      .from('notifications')
      .insert({
        order_id: order.id,
        channel: 'push',
        audience: 'admin',
        payload_preview: body,
        status: 'pending',
        attempts: 0,
      })
      .select('id')
      .single();
    notificationId = created?.id as string | undefined;
  }

  const result = await sendPushToAdmins('🔔 Novo pedido', body, `/admin/pedidos/${order.id}`);

  if (notificationId) {
    await supabase
      .from('notifications')
      .update({
        status: result.ok ? 'sent' : 'failed',
        attempts,
        payload_preview: body,
        last_error: result.ok ? null : result.error,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq('id', notificationId);
  }

  if (result.ok) {
    logger.info('notification_sent', { orderNumber: order.order_number, channel: 'push' });
    return { status: 'sent', notificationId };
  }

  logger.warn('notification_failed', { orderNumber: order.order_number, reason: result.error, channel: 'push' });
  return { status: 'failed', error: result.error, notificationId };
}

/**
 * Confirmação para o cliente. Fica desativada enquanto
 * WHATSAPP_CUSTOMER_TEMPLATE_NAME não estiver preenchido — a Meta só permite
 * iniciar conversas com um template aprovado.
 */
export async function notifyCustomerOrderReceived(orderId: string): Promise<NotifyResult> {
  const templateName = process.env.WHATSAPP_CUSTOMER_TEMPLATE_NAME;
  const provider = getWhatsAppProvider();

  if (!templateName || !provider.isConfigured()) {
    return { status: 'failed', error: 'Mensagens ao cliente ainda não configuradas.' };
  }

  const supabase = createAdminSupabase();
  const order = await loadOrder(orderId);
  if (!order?.customers?.phone) return { status: 'failed', error: 'Encomenda sem telefone.' };

  const data = toNotificationData(order);
  const to = toInternationalPhone(order.customers.phone);

  const { data: created } = await supabase
    .from('notifications')
    .insert({
      order_id: order.id,
      channel: 'whatsapp',
      audience: 'customer',
      recipient: to,
      payload_preview: buildCustomerOrderMessage(data).slice(0, 1000),
      status: 'pending',
    })
    .select('id')
    .single();

  const result = await provider.sendTemplate(to, templateName, [
    data.customer.name.split(/\s+/)[0] ?? '',
    order.order_number,
  ]);

  if (created?.id) {
    await supabase
      .from('notifications')
      .update({
        status: result.ok ? 'sent' : 'failed',
        attempts: 1,
        last_error: result.error ?? null,
        provider_message_id: result.messageId ?? null,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq('id', created.id);
  }

  return result.ok ? { status: 'sent' } : { status: 'failed', error: result.error };
}

function dispatchByChannel(orderId: string, audience: string, channel: string): Promise<NotifyResult> {
  if (audience === 'customer') return notifyCustomerOrderReceived(orderId);
  if (channel === 'email') return notifyAdminNewOrderByEmail(orderId);
  if (channel === 'push') return notifyAdminNewOrderByPush(orderId);
  return notifyAdminNewOrder(orderId);
}

/** Reenvio manual (botão do painel) ou automático (rota de retry). */
export async function resendNotification(notificationId: string): Promise<NotifyResult> {
  const supabase = createAdminSupabase();
  const { data: record } = await supabase
    .from('notifications')
    .select('id, order_id, attempts, audience, channel')
    .eq('id', notificationId)
    .maybeSingle();

  if (!record?.order_id) return { status: 'failed', error: 'Notificação não encontrada.' };

  return dispatchByChannel(record.order_id, record.audience, record.channel);
}

const MAX_ATTEMPTS = 5;

/** Retenta as notificações falhadas mais recentes. Chamada por /api/notifications/retry. */
export async function retryFailedNotifications(limit = 20): Promise<{ retried: number; sent: number }> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('notifications')
    .select('id, order_id, attempts, audience, channel')
    .eq('status', 'failed')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit);

  let sent = 0;
  for (const record of data ?? []) {
    if (!record.order_id) continue;
    const result = await dispatchByChannel(record.order_id, record.audience, record.channel);
    if (result.status === 'sent') sent += 1;
  }

  return { retried: data?.length ?? 0, sent };
}
