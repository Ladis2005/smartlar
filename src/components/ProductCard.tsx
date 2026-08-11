import Link from 'next/link';

import { Price } from './Price';
import { ProductImage } from './ProductImage';
import { AddToCartButton } from './AddToCartButton';
import type { Product } from '@/lib/types';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const outOfStock = product.stock <= 0;

  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <Link href={`/produto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-navy-50">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          priority={priority}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.is_new && <span className="badge bg-navy-800 text-white">Novidade</span>}
          {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents ? (
            <span className="badge bg-orange-500 text-white">Promoção</span>
          ) : null}
        </div>
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-navy-900/85 py-1.5 text-center text-xs font-semibold text-white">
            Esgotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-orange-600">
          {product.name}
        </Link>
        {product.short_description ? (
          <p className="line-clamp-2 text-xs text-navy-500">{product.short_description}</p>
        ) : null}
        <div className="mt-auto pt-2">
          <Price priceCents={product.price_cents} compareAtCents={product.compare_at_price_cents} />
          <div className="mt-3">
            <AddToCartButton product={product} compact />
          </div>
        </div>
      </div>
    </article>
  );
}
