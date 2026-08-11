import Link from 'next/link';

import { listOrders } from '@/server/admin-data';
import { formatMzn } from '@/lib/money';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/status';
import { formatMaputoDateTime } from '@/lib/whatsapp/message';
import type { OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Novo' },
  { value: 'payment_pending', label: 'Pagamento pendente' },
  { value: 'confirmed', label: 'Pago / confirmado' },
  { value: 'preparing', label: 'Em preparação' },
  { value: 'out_for_delivery', label: 'Em entrega' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string };
}) {
  const status = (FILTERS.find((filter) => filter.value === searchParams.estado)?.value || undefined) as
    | OrderStatus
    | undefined;

  const orders = await listOrders({ status, search: searchParams.q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-navy-900">Pedidos</h1>
        <p className="text-sm text-navy-500">{orders.length} resultado(s)</p>
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/pedidos">
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Pesquisar por número, nome ou telefone"
          className="field max-w-sm py-2.5 text-sm"
        />
        {searchParams.estado ? <input type="hidden" name="estado" value={searchParams.estado} /> : null}
        <button type="submit" className="btn-navy py-2.5 text-sm">
          Pesquisar
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value) params.set('estado', filter.value);
          if (searchParams.q) params.set('q', searchParams.q);
          const active = (searchParams.estado ?? '') === filter.value;

          return (
            <Link
              key={filter.label}
              href={`/admin/pedidos${params.toString() ? `?${params.toString()}` : ''}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active ? 'bg-navy-800 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-navy-500">Nenhum pedido encontrado.</p>
      ) : (
        <>
          {/* Tabela em ecrãs largos */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-500">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Produtos</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/60">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/admin/pedidos/${order.id}`} className="text-navy-900 hover:text-orange-600">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.customers?.name}</td>
                    <td className="px-4 py-3">{order.customers?.phone}</td>
                    <td className="px-4 py-3 text-navy-600">
                      {order.order_items.reduce((total, item) => total + item.quantity, 0)} artigo(s)
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatMzn(order.total_cents)}</td>
                    <td className="px-4 py-3 text-navy-600">
                      {PAYMENT_METHOD_LABELS[order.payment_method]}
                      <br />
                      <span className="text-xs">{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ORDER_STATUS_TONE[order.order_status]}`}>
                        {ORDER_STATUS_LABELS[order.order_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500">{formatMaputoDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartões no telemóvel */}
          <ul className="space-y-2 lg:hidden">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/pedidos/${order.id}`} className="card block p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-navy-900">#{order.order_number}</span>
                    <span className={`badge ${ORDER_STATUS_TONE[order.order_status]}`}>
                      {ORDER_STATUS_LABELS[order.order_status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-navy-700">
                    {order.customers?.name} • {order.customers?.phone}
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    {PAYMENT_METHOD_LABELS[order.payment_method]} —{' '}
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </p>
                  <p className="mt-2 text-base font-bold text-navy-900">{formatMzn(order.total_cents)}</p>
                  <p className="mt-1 text-xs text-navy-400">{formatMaputoDateTime(order.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
