import type { Metadata } from 'next';

import { CheckoutForm } from '@/components/CheckoutForm';
import { getSiteSettings } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Finalizar compra',
  description: 'Conclua a sua encomenda SmartLar com pagamento por M-Pesa ou e-Mola.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Finalizar compra</h1>
      <p className="mt-1 text-sm text-navy-500">Preencha os dados de entrega e escolha como vai pagar.</p>

      <div className="mt-8">
        <CheckoutForm settings={settings} />
      </div>
    </div>
  );
}
