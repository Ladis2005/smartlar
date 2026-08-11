import type { Metadata } from 'next';

import { ProductGrid } from '@/components/ProductGrid';
import { EmptyState } from '@/components/EmptyState';
import { getProducts } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Todos os produtos',
  description: 'Catálogo completo SmartLar: eletrodomésticos, cozinha, organização, decoração e limpeza.',
  alternates: { canonical: '/produtos' },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { q?: string; promocoes?: string; novidades?: string };
}

export default async function ProductsPage({ searchParams }: Props) {
  const search = searchParams.q?.trim();
  const onSale = searchParams.promocoes === '1';
  const isNew = searchParams.novidades === '1';

  const products = await getProducts({ search, onSale, isNew });

  const title = onSale ? 'Promoções' : isNew ? 'Novidades' : search ? `Resultados para "${search}"` : 'Todos os produtos';

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-navy-500">
        {products.length} {products.length === 1 ? 'produto' : 'produtos'} • entrega em Maputo e Matola
      </p>

      <div className="mt-8">
        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <EmptyState
            title="Não encontrámos produtos"
            description={
              search
                ? 'Experimente pesquisar por outra palavra, por exemplo "panela" ou "aspirador".'
                : 'Ainda não há produtos nesta lista.'
            }
            actionHref="/produtos"
            actionLabel="Ver todo o catálogo"
          />
        )}
      </div>
    </div>
  );
}
