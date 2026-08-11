import type { NotificationStatus, OrderStatus, PaymentMethod, PaymentStatus } from './types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Novo',
  payment_pending: 'Pagamento pendente',
  confirmed: 'Confirmado',
  preparing: 'Em preparação',
  out_for_delivery: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Por pagar',
  awaiting_confirmation: 'Aguardando confirmação',
  paid: 'Pago',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  cod: 'Pagamento na entrega',
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: 'Por enviar',
  sent: 'Enviada',
  failed: 'Falhou',
};

export const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-orange-100 text-orange-800',
  payment_pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-navy-100 text-navy-800',
  preparing: 'bg-sky-100 text-sky-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  awaiting_confirmation: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

/** Ordem em que os estados avançam no painel. */
export const ORDER_FLOW: OrderStatus[] = [
  'new',
  'payment_pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];
