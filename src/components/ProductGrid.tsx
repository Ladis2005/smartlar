import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
