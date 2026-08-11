import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductGallery } from '@/components/ProductGallery';
import { ProductPurchase } from '@/components/ProductPurchase';
import { ProductGrid } from '@/components/ProductGrid';
import { SectionHeader } from '@/components/SectionHeader';
import { Price } from '@/components/Price';
import { ViewContentTracker } from '@/components/ViewContentTracker';
import { getAllProductSlugs, getProductBySlug, getProducts } from '@/lib/queries';
import { toMajorUnits, CURRENCY } from '@/lib/money';

export const revalidate = 120;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Produto não encontrado' };

  return {
    title: product.name,
    description: product.short_description ?? product.description?.slice(0, 155) ?? undefined,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.short_description ?? undefined,
      images: product.images.length ? [{ url: product.images[0] }] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getProducts({
    categoryId: product.category_id ?? undefined,
    excludeId: product.id,
    limit: 4,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.images,
    brand: { '@type': 'Brand', name: 'SmartLar' },
    offers: {
      '@type': 'Offer',
      price: toMajorUnits(product.price_cents).toFixed(2),
      priceCurrency: CURRENCY,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/produto/${product.slug}`,
    },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewContentTracker id={product.id} name={product.name} priceCents={product.price_cents} />

      <nav className="mb-6 text-xs text-navy-500" aria-label="Caminho">
        <Link href="/" className="hover:text-orange-600">
          Início
        </Link>
        <span className="px-1.5">/</span>
        <Link href="/produtos" className="hover:text-orange-600">
          Produtos
        </Link>
        {product.categories ? (
          <>
            <span className="px-1.5">/</span>
            <Link href={`/categorias/${product.categories.slug}`} className="hover:text-orange-600">
              {product.categories.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{product.name}</h1>
          {product.short_description ? (
            <p className="mt-3 text-sm leading-relaxed text-navy-600">{product.short_description}</p>
          ) : null}

          <div className="mt-5">
            <Price priceCents={product.price_cents} compareAtCents={product.compare_at_price_cents} size="lg" />
          </div>

          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          <div className="mt-6 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-700">
            <p className="font-semibold text-navy-900">Entrega disponível em Maputo e Matola.</p>
            <p className="mt-1 text-navy-600">Pagamento por M-Pesa ou e-Mola, confirmado por nós antes do envio.</p>
          </div>

          {product.description ? (
            <section className="mt-8">
              <h2 className="text-base font-bold text-navy-900">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-600">{product.description}</p>
            </section>
          ) : null}

          {product.sku ? <p className="mt-6 text-xs text-navy-400">Referência: {product.sku}</p> : null}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeader title="Também pode gostar" href="/produtos" />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
