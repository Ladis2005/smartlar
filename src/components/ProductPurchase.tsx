'use client';

import { useState } from 'react';

import { QuantityStepper } from './QuantityStepper';
import { AddToCartButton } from './AddToCartButton';
import type { Product } from '@/lib/types';

export function ProductPurchase({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const max = Math.max(1, product.stock);

  return (
    <div className="space-y-4">
      {product.stock > 0 ? (
        <div className="flex items-center gap-4">
          <QuantityStepper value={quantity} max={max} onChange={setQuantity} />
          <span className="text-sm text-navy-500">
            {product.stock <= 5 ? `Restam ${product.stock} unidades` : 'Disponível em stock'}
          </span>
        </div>
      ) : (
        <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-600">
          Este produto está esgotado. Fale connosco para saber quando chega mais stock.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AddToCartButton product={product} quantity={quantity} />
        <AddToCartButton product={product} quantity={quantity} buyNow />
      </div>
    </div>
  );
}
