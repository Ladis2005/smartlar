import Link from 'next/link';

import { ProductImage } from '@/components/ProductImage';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { listAdminProducts } from '@/server/admin-data';
import { formatMzn } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-navy-900">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn-primary py-2.5 text-sm">
          Adicionar produto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-navy-500">
          Ainda não há produtos. Comece por adicionar o primeiro.
        </p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-navy-50">
                <ProductImage src={product.images[0]} alt={product.name} sizes="56px" />
              </div>

              <div className="min-w-0 flex-1">
                <Link href={`/admin/produtos/${product.id}`} className="font-semibold text-navy-900 hover:text-orange-600">
                  {product.name}
                </Link>
                <p className="text-xs text-navy-500">
                  {product.categories?.name ?? 'Sem categoria'} • stock {product.stock}
                  {product.is_featured ? ' • destaque' : ''}
                  {product.is_active ? '' : ' • oculto'}
                </p>
              </div>

              <p className="font-bold text-navy-900">{formatMzn(product.price_cents)}</p>

              <ProductRowActions id={product.id} isActive={product.is_active} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
