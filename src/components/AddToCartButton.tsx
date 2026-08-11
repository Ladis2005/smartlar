'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCartStore } from '@/lib/cart-store';
import { trackAddToCart } from '@/lib/pixel';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  quantity?: number;
  compact?: boolean;
  buyNow?: boolean;
}

export function AddToCartButton({ product, quantity = 1, compact = false, buyNow = false }: Props) {
  const add = useCartStore((state) => state.add);
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  function handleClick() {
    if (outOfStock) return;

    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: product.price_cents,
      image: product.images[0] ?? null,
      stock: product.stock,
      quantity,
    });

    trackAddToCart(
      { id: product.id, name: product.name, priceCents: product.price_cents },
      quantity,
    );

    if (buyNow) {
      router.push('/checkout');
      return;
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  if (outOfStock) {
    return (
      <button type="button" className={compact ? 'btn-outline w-full py-2.5 text-xs' : 'btn-outline w-full'} disabled>
        Esgotado
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        buyNow
          ? 'btn-navy w-full'
          : compact
            ? 'btn-primary w-full py-2.5 text-xs'
            : 'btn-primary w-full'
      }
    >
      {buyNow ? 'Comprar agora' : added ? 'Adicionado ✓' : 'Adicionar ao carrinho'}
    </button>
  );
}
