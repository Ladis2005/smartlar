'use client';

import { useState } from 'react';

import { trackOrderAction, type TrackedOrder } from '@/server/actions/tracking';

export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setOrder(null);

    const result = await trackOrderAction(orderNumber, phone);
    if (result.ok && result.order) setOrder(result.order);
    else setMessage(result.message ?? 'Não foi possível consultar o pedido.');

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="orderNumber">
            Número do pedido
          </label>
          <input
            id="orderNumber"
            className="field"
            placeholder="SL-000125"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="trackPhone">
            Telefone usado na compra
          </label>
          <input
            id="trackPhone"
            className="field"
            inputMode="tel"
            placeholder="84XXXXXXX"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'A consultar…' : 'Consultar pedido'}
        </button>

        {message ? (
          <p role="status" className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-700">
            {message}
          </p>
        ) : null}
      </form>

      {order ? (
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-navy-900">#{order.orderNumber}</h2>
            <span className="badge bg-navy-100 text-navy-800">{order.status}</span>
          </div>

          <p className="text-sm text-navy-600">Registado em {order.createdAt}</p>

          <ul className="space-y-2 border-t border-navy-100 pt-4 text-sm">
            {order.items.map((item) => (
              <li key={item.name} className="flex justify-between gap-4">
                <span className="text-navy-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold text-navy-900">{item.subtotal}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-navy-100 pt-4 text-sm text-navy-700">
            <p>
              Pagamento: {order.paymentMethod} — <strong>{order.paymentStatus}</strong>
            </p>
            <p className="mt-1">Entrega: {order.delivery}</p>
            <p className="mt-3 text-base font-extrabold text-navy-900">Total: {order.total}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
