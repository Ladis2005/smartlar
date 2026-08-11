import { formatMzn } from '../money';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../status';
import type { PaymentMethod, PaymentStatus } from '../types';

export interface NotificationOrderData {
  orderNumber: string;
  createdAt: Date | string;
  items: { name: string; quantity: number; unitPriceCents?: number }[];
  totalCents: number;
  deliveryFeeCents?: number;
  customer: { name: string; phone: string };
  delivery: { city: string; neighborhood: string; reference: string; province?: string };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    payerPhone?: string | null;
    reference?: string | null;
  };
}

/** Data e hora no fuso de Moçambique: 09/08/2026 21:30 */
export function formatMaputoDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/** Mensagem enviada ao administrador quando entra uma encomenda nova. */
export function buildAdminOrderMessage(order: NotificationOrderData): string {
  const lines: string[] = [];

  lines.push('🔔 NOVO PEDIDO — SMARTLAR');
  lines.push('');
  lines.push(`Pedido: #${order.orderNumber}`);
  lines.push('');

  lines.push(order.items.length > 1 ? '🛒 Produtos:' : '🛒 Produto:');
  for (const item of order.items) {
    lines.push(`• ${item.name} × ${item.quantity}`);
  }
  lines.push('');

  if (order.deliveryFeeCents && order.deliveryFeeCents > 0) {
    lines.push(`🚚 Entrega: ${formatMzn(order.deliveryFeeCents)}`);
  }
  lines.push('💰 Total:');
  lines.push(formatMzn(order.totalCents));
  lines.push('');

  lines.push('👤 CLIENTE');
  lines.push(`Nome: ${order.customer.name}`);
  lines.push(`Telefone: ${order.customer.phone}`);
  lines.push('');

  lines.push('📍 ENTREGA');
  if (order.delivery.province) lines.push(`Província: ${order.delivery.province}`);
  lines.push(`Cidade: ${order.delivery.city}`);
  lines.push(`Bairro: ${order.delivery.neighborhood}`);
  lines.push(`Referência: ${order.delivery.reference}`);
  lines.push('');

  lines.push('💳 PAGAMENTO');
  lines.push(`Método: ${PAYMENT_METHOD_LABELS[order.payment.method]}`);
  lines.push(`Estado: ${PAYMENT_STATUS_LABELS[order.payment.status]}`);
  if (order.payment.payerPhone) lines.push(`Número usado: ${order.payment.payerPhone}`);
  if (order.payment.reference) lines.push(`Referência: ${order.payment.reference}`);
  lines.push('');

  lines.push('📅 Data:');
  lines.push(formatMaputoDateTime(order.createdAt));

  return lines.join('\n');
}

/** Mensagem de confirmação para o cliente (só é enviada quando o template estiver configurado). */
export function buildCustomerOrderMessage(order: NotificationOrderData): string {
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? '';
  return [
    `Olá ${firstName} 👋`,
    '',
    'Recebemos a sua encomenda SmartLar.',
    '',
    `Pedido: #${order.orderNumber}`,
    `Total: ${formatMzn(order.totalCents)}`,
    '',
    'Estamos a confirmar o seu pedido.',
    '',
    'Obrigado por comprar na SmartLar 🏠',
  ].join('\n');
}
