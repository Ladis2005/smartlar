'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  confirmPayment,
  markPaymentFailed,
  resendOrderNotification,
  resendOrderNotificationEmail,
  updateOrderStatus,
  type ActionResult,
} from '@/server/actions/orders';
import type { OrderStatus } from '@/lib/types';

interface Props {
  orderId: string;
  status: OrderStatus;
  paymentConfirmed: boolean;
}

export function OrderActions({ orderId, status, paymentConfirmed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      router.refresh();
    });
  }

  const buttons: { label: string; run: () => Promise<ActionResult>; hidden?: boolean; tone?: string }[] = [
    {
      label: 'Confirmar pagamento',
      run: () => confirmPayment(orderId),
      hidden: paymentConfirmed,
      tone: 'btn-primary',
    },
    {
      label: 'Confirmar pedido',
      run: () => updateOrderStatus(orderId, 'confirmed'),
      hidden: status === 'confirmed' || status === 'cancelled',
    },
    { label: 'Preparar pedido', run: () => updateOrderStatus(orderId, 'preparing'), hidden: status === 'preparing' },
    {
      label: 'Saiu para entrega',
      run: () => updateOrderStatus(orderId, 'out_for_delivery'),
      hidden: status === 'out_for_delivery',
    },
    {
      label: 'Marcar como entregue',
      run: () => updateOrderStatus(orderId, 'delivered'),
      hidden: status === 'delivered',
    },
    { label: 'Reenviar WhatsApp', run: () => resendOrderNotification(orderId) },
    { label: 'Reenviar e-mail', run: () => resendOrderNotificationEmail(orderId) },
    {
      label: 'Marcar pagamento como não recebido',
      run: () => markPaymentFailed(orderId),
      hidden: !paymentConfirmed && status === 'cancelled',
    },
    {
      label: 'Cancelar pedido',
      run: () => updateOrderStatus(orderId, 'cancelled'),
      hidden: status === 'cancelled',
      tone: 'btn-outline text-red-700 border-red-200 hover:border-red-400',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {buttons
          .filter((button) => !button.hidden)
          .map((button) => (
            <button
              key={button.label}
              type="button"
              disabled={pending}
              onClick={() => run(button.run)}
              className={`${button.tone ?? 'btn-outline'} py-2.5 text-sm`}
            >
              {button.label}
            </button>
          ))}
      </div>

      {feedback ? (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
