import type { Metadata } from 'next';

import { CartView } from '@/components/CartView';
import { getSiteSettings } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Carrinho',
  description: 'Reveja os produtos escolhidos antes de finalizar a compra.',
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Carrinho</h1>
      <p className="mt-1 text-sm text-navy-500">Confirme as quantidades antes de continuar.</p>

      <div className="mt-8">
        <CartView deliveryFeeCents={settings.delivery_fee_cents} />
      </div>
    </div>
  );
}
