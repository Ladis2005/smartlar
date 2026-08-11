import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductGrid } from '@/components/ProductGrid';
import { EmptyState } from '@/components/EmptyState';
import { getCategories, getCategoryBySlug, getProducts } from '@/lib/queries';

export const revalidate = 120;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Categoria' };

  return {
    title: category.name,
    description: category.description ?? `Produtos SmartLar da categoria ${category.name}.`,
    alternates: { canonical: `/categorias/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const products = await getProducts({ categoryId: category.id });

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{category.name}</h1>
      {category.description ? <p className="mt-2 max-w-2xl text-sm text-navy-500">{category.description}</p> : null}

      <div className="mt-8">
        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <EmptyState
            title="Ainda sem produtos nesta categoria"
            description="Estamos a preparar novidades. Veja entretanto o resto do catálogo."
            actionHref="/produtos"
            actionLabel="Ver todos os produtos"
          />
        )}
      </div>
    </div>
  );
}
