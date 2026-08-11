import type { Metadata } from 'next';
import Link from 'next/link';

import { PurchaseTracker } from '@/components/PurchaseTracker';
import { getOrderForConfirmation } from '@/server/orders-read';
import { getSiteSettings } from '@/lib/queries';
import { formatMzn } from '@/lib/money';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/status';
import { formatMaputoDateTime } from '@/lib/whatsapp/message';

export const metadata: Metadata = {
  title: 'Pedido confirmado',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  params: { orderNumber: string };
  searchParams: { t?: string };
}

export default async function OrderConfirmedPage({ params, searchParams }: Props) {
  const order = await getOrderForConfirmation(params.orderNumber, searchParams.t);
  const settings = await getSiteSettings();

  if (!order) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-navy-900">Não conseguimos abrir este pedido</h1>
          <p className="mt-2 text-sm text-navy-600">
            O endereço pode estar incompleto. Consulte o estado da sua encomenda com o número e o telefone que usou.
          </p>
          <Link href="/rastrear-pedido" className="btn-primary mt-6 inline-flex">
            Seguir encomenda
          </Link>
        </div>
      </div>
    );
  }

  const paymentNumber =
    order.payment_method === 'mpesa'
      ? settings.mpesa_number
      : order.payment_method === 'emola'
        ? settings.emola_number
        : null;
  const isCod = order.payment_method === 'cod';
  const payment = order.payments?.[0];

  return (
    <div className="container-page py-10">
      <PurchaseTracker orderNumber={order.order_number} token={order.purchase_event_id} />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card p-6 text-center">
          <span className="badge bg-emerald-100 text-emerald-800">Pedido registado</span>
          <h1 className="mt-3 text-2xl font-extrabold text-navy-900">Obrigado pela sua compra!</h1>
          <p className="mt-2 text-sm text-navy-600">
            O seu pedido <strong>#{order.order_number}</strong> foi registado em{' '}
            {formatMaputoDateTime(order.created_at)}.
          </p>
          <p className="mt-1 text-sm text-navy-600">
            Guarde este número. Entraremos em contacto pelo {order.customers?.phone} para combinar a entrega.
          </p>
        </div>

        {order.payment_status !== 'paid' ? (
          <div className="card border-orange-200 bg-orange-50 p-6">
            {isCod ? (
              <>
                <h2 className="text-base font-bold text-navy-900">
                  Pague {formatMzn(order.total_cents)} na entrega
                </h2>
                <p className="mt-2 text-sm text-navy-700">
                  Vai pagar em dinheiro, diretamente ao entregador, no momento em que receber a encomenda.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-navy-900">
                  Falta pagar {formatMzn(order.total_cents)} por {PAYMENT_METHOD_LABELS[order.payment_method]}
                </h2>
                {paymentNumber ? (
                  <>
                    <p className="mt-2 text-sm text-navy-700">Efetue o pagamento para:</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-wide text-navy-900">{paymentNumber}</p>
                  </>
                ) : null}
                <p className="mt-3 text-sm text-navy-700">
                  Estado do pagamento: <strong>{PAYMENT_STATUS_LABELS[order.payment_status]}</strong>. Confirmamos
                  manualmente assim que o valor entrar.
                </p>
              </>
            )}
          </div>
        ) : null}

        <div className="card p-6">
          <h2 className="text-base font-bold text-navy-900">Resumo</h2>

          <ul className="mt-4 space-y-3">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-navy-700">
                  {item.product_name_snapshot} × {item.quantity}
                </span>
                <span className="font-semibold text-navy-900">{formatMzn(item.subtotal_cents)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-navy-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-600">Subtotal</dt>
              <dd className="font-semibold text-navy-900">{formatMzn(order.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-600">Entrega</dt>
              <dd className="font-semibold text-navy-900">
                {order.delivery_fee_cents > 0 ? formatMzn(order.delivery_fee_cents) : 'A combinar'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-navy-100 pt-3 text-base">
              <dt className="font-bold text-navy-900">Total</dt>
              <dd className="font-extrabold text-navy-900">{formatMzn(order.total_cents)}</dd>
            </div>
          </dl>
        </div>

        <div className="card grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Entrega</h2>
            <p className="mt-2 text-sm text-navy-600">
              {order.customers?.name}
              <br />
              {order.customers?.neighborhood}, {order.customers?.city}
              <br />
              {order.customers?.address_reference}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900">Estado</h2>
            <p className="mt-2 text-sm text-navy-600">
              Pedido: {ORDER_STATUS_LABELS[order.order_status]}
              <br />
              Pagamento: {PAYMENT_STATUS_LABELS[order.payment_status]}
              {payment?.transaction_reference ? (
                <>
                  <br />
                  Referência: {payment.transaction_reference}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/produtos" className="btn-outline sm:flex-1">
            Continuar a comprar
          </Link>
          <Link href="/rastrear-pedido" className="btn-navy sm:flex-1">
            Seguir a encomenda
          </Link>
        </div>
      </div>
    </div>
  );
}
