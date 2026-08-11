import type { Metadata } from 'next';

import { TrackOrderForm } from '@/components/TrackOrderForm';

export const metadata: Metadata = {
  title: 'Seguir encomenda',
  description: 'Consulte o estado da sua encomenda SmartLar com o número do pedido e o telefone usado na compra.',
  alternates: { canonical: '/rastrear-pedido' },
};

export default function TrackOrderPage() {
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Seguir encomenda</h1>
        <p className="mt-1 text-sm text-navy-500">
          Indique o número do pedido e o telefone que usou na compra.
        </p>

        <div className="mt-8">
          <TrackOrderForm />
        </div>
      </div>
    </div>
  );
}
