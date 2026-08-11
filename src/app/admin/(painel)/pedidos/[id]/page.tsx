import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderActions } from '@/components/admin/OrderActions';
import { getOrderDetail, getOrderLogs } from '@/server/admin-data';
import { getReceiptUrl } from '@/server/actions/orders';
import { formatMzn } from '@/lib/money';
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
} from '@/lib/status';
import { formatMaputoDateTime } from '@/lib/whatsapp/message';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrderDetail(params.id);
  if (!order) notFound();

  const logs = await getOrderLogs(order.id);
  const payment = order.payments?.[0];
  const adminNotifications = order.notifications?.filter((item) => item.audience !== 'customer') ?? [];
  const receiptUrl = payment?.receipt_url ? await getReceiptUrl(payment.receipt_url) : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/pedidos" className="text-sm font-medium text-navy-500 hover:text-orange-600">
        ← Voltar aos pedidos
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold text-navy-900">#{order.order_number}</h1>
        <span className={`badge ${ORDER_STATUS_TONE[order.order_status]}`}>
          {ORDER_STATUS_LABELS[order.order_status]}
        </span>
        <span className={`badge ${PAYMENT_STATUS_TONE[order.payment_status]}`}>
          {PAYMENT_STATUS_LABELS[order.payment_status]}
        </span>
        <span className="text-sm text-navy-500">{formatMaputoDateTime(order.created_at)}</span>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy-500">Ações</h2>
        <OrderActions
          orderId={order.id}
          status={order.order_status}
          paymentConfirmed={order.payment_status === 'paid'}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Cliente</h2>
          <dl className="mt-3 space-y-1 text-sm text-navy-700">
            <div>
              <dt className="inline font-medium">Nome: </dt>
              <dd className="inline">{order.customers?.name}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Telefone: </dt>
              <dd className="inline">{order.customers?.phone}</dd>
            </div>
            {order.customers?.alternative_phone ? (
              <div>
                <dt className="inline font-medium">Alternativo: </dt>
                <dd className="inline">{order.customers.alternative_phone}</dd>
              </div>
            ) : null}
          </dl>

          <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-navy-500">Endereço</h2>
          <p className="mt-2 text-sm text-navy-700">
            {order.customers?.province}
            <br />
            {order.customers?.city} — {order.customers?.neighborhood}
            <br />
            {order.customers?.address_reference}
          </p>

          {order.notes ? (
            <p className="mt-4 rounded-xl bg-navy-50 p-3 text-sm text-navy-700">
              <span className="font-medium">Observações: </span>
              {order.notes}
            </p>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Pagamento</h2>
          <dl className="mt-3 space-y-1 text-sm text-navy-700">
            <div>
              <dt className="inline font-medium">Método: </dt>
              <dd className="inline">{PAYMENT_METHOD_LABELS[order.payment_method]}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Estado: </dt>
              <dd className="inline">{PAYMENT_STATUS_LABELS[order.payment_status]}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Número usado: </dt>
              <dd className="inline">{payment?.payer_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Referência: </dt>
              <dd className="inline">{payment?.transaction_reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Comprovativo: </dt>
              <dd className="inline">
                {receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-orange-600 hover:underline"
                  >
                    Abrir (link válido 10 minutos)
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>

          <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-navy-500">Notificações</h2>
          {adminNotifications.length > 0 ? (
            <div className="mt-2 space-y-3">
              {adminNotifications.map((notification) => (
                <div key={notification.id} className="text-sm text-navy-700">
                  <p className="font-medium text-navy-900">
                    {NOTIFICATION_CHANNEL_LABELS[notification.channel] ?? notification.channel}
                  </p>
                  <p>
                    Estado: <strong>{NOTIFICATION_STATUS_LABELS[notification.status]}</strong> • tentativas:{' '}
                    {notification.attempts}
                  </p>
                  {notification.sent_at ? <p>Enviada em {formatMaputoDateTime(notification.sent_at)}</p> : null}
                  {notification.last_error ? (
                    <p className="mt-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{notification.last_error}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-navy-500">Sem registo de notificação.</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Produtos</h2>
        <ul className="mt-3 divide-y divide-navy-50">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-medium text-navy-900">{item.product_name_snapshot}</span>
              <span className="text-navy-500">
                {item.quantity} × {formatMzn(item.unit_price_cents)}
              </span>
              <span className="ml-auto font-semibold text-navy-900">{formatMzn(item.subtotal_cents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-navy-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-600">Subtotal</dt>
            <dd className="font-semibold">{formatMzn(order.subtotal_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-navy-600">Entrega</dt>
            <dd className="font-semibold">{formatMzn(order.delivery_fee_cents)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-bold text-navy-900">Total</dt>
            <dd className="font-extrabold text-navy-900">{formatMzn(order.total_cents)}</dd>
          </div>
        </dl>
      </section>

      {logs.length > 0 ? (
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Histórico</h2>
          <ul className="mt-3 space-y-2 text-sm text-navy-600">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap gap-2">
                <span className="text-xs text-navy-400">{formatMaputoDateTime(log.created_at)}</span>
                <span>{log.detail ?? log.event}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
