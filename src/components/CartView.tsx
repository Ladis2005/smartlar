'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ProductImage } from './ProductImage';
import { QuantityStepper } from './QuantityStepper';
import { useCartStore } from '@/lib/cart-store';
import { cartCount, cartSubtotal, contentIds } from '@/lib/cart';
import { formatMzn } from '@/lib/money';
import { trackInitiateCheckout } from '@/lib/pixel';

export function CartView({ deliveryFeeCents = 0 }: { deliveryFeeCents?: number }) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);

  if (!hydrated) {
    return <div className="card h-40 animate-pulse bg-navy-50" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="text-base font-semibold text-navy-900">O carrinho está vazio</p>
        <p className="max-w-sm text-sm text-navy-500">Escolha os produtos que quer receber em casa.</p>
        <Link href="/produtos" className="btn-primary mt-2">
          Ver produtos
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const total = subtotal + deliveryFeeCents;

  function goToCheckout() {
    trackInitiateCheckout({
      contentIds: contentIds(items),
      valueCents: subtotal,
      numItems: cartCount(items),
    });
    router.push('/checkout');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.productId} className="card flex gap-4 p-4">
            <Link
              href={`/produto/${item.slug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-50"
            >
              <ProductImage src={item.image} alt={item.name} sizes="80px" />
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/produto/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-navy-900">
                {item.name}
              </Link>
              <p className="mt-1 text-sm font-bold text-navy-900">{formatMzn(item.priceCents)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <QuantityStepper
                  value={item.quantity}
                  max={Math.max(1, item.stock)}
                  onChange={(quantity) => setQuantity(item.productId, quantity)}
                  label={`Quantidade de ${item.name}`}
                />
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  className="text-sm font-medium text-navy-500 underline-offset-2 hover:text-orange-600 hover:underline"
                >
                  Remover
                </button>
                <span className="ml-auto text-sm font-semibold text-navy-900">
                  {formatMzn(item.priceCents * item.quantity)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card sticky top-32 space-y-4 p-5">
        <h2 className="text-base font-bold text-navy-900">Resumo</h2>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-600">Subtotal</dt>
            <dd className="font-semibold text-navy-900">{formatMzn(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-navy-600">Entrega</dt>
            <dd className="font-semibold text-navy-900">
              {deliveryFeeCents > 0 ? formatMzn(deliveryFeeCents) : 'A combinar'}
            </dd>
          </div>
          <div className="flex justify-between border-t border-navy-100 pt-3 text-base">
            <dt className="font-bold text-navy-900">Total</dt>
            <dd className="font-extrabold text-navy-900">{formatMzn(total)}</dd>
          </div>
        </dl>

        <button type="button" onClick={goToCheckout} className="btn-primary w-full">
          Finalizar compra
        </button>
        <Link href="/produtos" className="btn-outline w-full">
          Continuar a comprar
        </Link>
      </aside>
    </div>
  );
}
