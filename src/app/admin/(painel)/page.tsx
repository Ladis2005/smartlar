import Link from 'next/link';

import { getDashboardStats, listOrders } from '@/server/admin-data';
import { getWhatsAppConfigStatus } from '@/lib/whatsapp/provider';
import { getEmailConfigStatus } from '@/lib/email/provider';
import { formatMzn } from '@/lib/money';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_STATUS_LABELS } from '@/lib/status';
import { formatMaputoDateTime } from '@/lib/whatsapp/message';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [stats, latest] = await Promise.all([getDashboardStats(), listOrders({ limit: 8 })]);
  const whatsapp = getWhatsAppConfigStatus();
  const email = getEmailConfigStatus();

  const cards = [
    { label: 'Pedidos hoje', value: String(stats.ordersToday) },
    { label: 'Pedidos pendentes', value: String(stats.pendingOrders) },
    { label: 'Pedidos pagos', value: String(stats.paidOrders) },
    { label: 'Vendas hoje', value: formatMzn(stats.salesTodayCents) },
    { label: 'Vendas do mês', value: formatMzn(stats.salesMonthCents) },
    { label: 'Ticket médio', value: formatMzn(stats.averageTicketCents) },
  ];

  return (
    <div className="space-y-8">
      {!whatsapp.configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">WhatsApp API não configurada.</p>
          <p className="mt-1">
            Em falta: {whatsapp.missing.join(', ')}. Os pedidos continuam a ser guardados normalmente; as
            notificações ficam marcadas como falhadas e podem ser reenviadas depois de configurar.
          </p>
        </div>
      ) : null}

      {!email.configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Notificação por e-mail não configurada.</p>
          <p className="mt-1">
            Em falta: {email.missing.join(', ')}. Os pedidos continuam a ser guardados normalmente; as
            notificações ficam marcadas como falhadas e podem ser reenviadas depois de configurar.
          </p>
        </div>
      ) : null}

      {stats.failedNotifications > 0 ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          {stats.failedNotifications} notificação(ões) por enviar. Abra o pedido para reenviar por WhatsApp ou e-mail.
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{card.label}</p>
            <p className="mt-2 text-xl font-extrabold text-navy-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-orange-600">
            Ver todos →
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="card px-4 py-8 text-center text-sm text-navy-500">Ainda não há pedidos.</p>
        ) : (
          <ul className="space-y-2">
            {latest.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/pedidos/${order.id}`} className="card flex flex-wrap items-center gap-3 p-4">
                  <span className="font-semibold text-navy-900">#{order.order_number}</span>
                  <span className="text-sm text-navy-600">{order.customers?.name}</span>
                  <span className={`badge ${ORDER_STATUS_TONE[order.order_status]}`}>
                    {ORDER_STATUS_LABELS[order.order_status]}
                  </span>
                  <span className="text-xs text-navy-500">{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
                  <span className="ml-auto text-sm font-bold text-navy-900">{formatMzn(order.total_cents)}</span>
                  <span className="w-full text-xs text-navy-400">{formatMaputoDateTime(order.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
