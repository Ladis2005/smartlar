import Link from 'next/link';

import { ProductGrid } from '@/components/ProductGrid';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { getCategories, getProducts } from '@/lib/queries';

export const revalidate = 60;

export default async function HomePage() {
  const [featured, bestSellers, novelties, onSale, categories] = await Promise.all([
    getProducts({ featured: true, limit: 8 }),
    getProducts({ bestSellers: true, limit: 4 }),
    getProducts({ isNew: true, limit: 4 }),
    getProducts({ onSale: true, limit: 4 }),
    getCategories(),
  ]);

  const catalogEmpty = featured.length + bestSellers.length + novelties.length === 0;

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900">
        <div className="container-page grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">
              Inovação • Conforto • Para o seu lar
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              Tudo o que a sua casa precisa.
            </h1>
            <p className="mt-4 max-w-lg text-base text-navy-200">
              Eletrodomésticos, cozinha, organização e limpeza escolhidos para o dia a dia moçambicano.
              Entrega em Maputo e Matola, pagamento por M-Pesa ou e-Mola.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/produtos" className="btn-primary sm:w-auto">
                Ver produtos
              </Link>
              <Link
                href="/produtos?promocoes=1"
                className="btn border border-navy-600 text-white hover:bg-navy-800"
              >
                Ver promoções
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 text-sm text-navy-100">
            {[
              ['Entrega em 24-48h', 'Maputo e Matola'],
              ['Pagamento local', 'M-Pesa e e-Mola'],
              ['Produtos testados', 'Escolhidos um a um'],
              ['Atendimento próximo', 'Falamos consigo por WhatsApp'],
            ].map(([title, detail]) => (
              <li key={title} className="rounded-2xl border border-navy-700 bg-navy-800 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-navy-300">{detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page space-y-14 py-12">
        {catalogEmpty ? (
          <EmptyState
            title="O catálogo ainda está vazio"
            description="Ligue o Supabase, execute supabase/schema.sql e supabase/seed.sql, ou adicione os primeiros produtos em /admin/produtos."
            actionHref="/admin/produtos"
            actionLabel="Ir para a gestão de produtos"
          />
        ) : null}

        {featured.length > 0 && (
          <section>
            <SectionHeader
              title="Produtos em destaque"
              description="A seleção da SmartLar desta semana."
              href="/produtos"
            />
            <ProductGrid products={featured} priorityCount={2} />
          </section>
        )}

        {bestSellers.length > 0 && (
          <section>
            <SectionHeader title="Mais vendidos" description="O que sai todos os dias." href="/produtos" />
            <ProductGrid products={bestSellers} />
          </section>
        )}

        {novelties.length > 0 && (
          <section>
            <SectionHeader title="Novidades" description="Acabaram de chegar." href="/produtos" />
            <ProductGrid products={novelties} />
          </section>
        )}

        {onSale.length > 0 && (
          <section>
            <SectionHeader title="Promoções" description="Preços com desconto, enquanto durar o stock." href="/produtos?promocoes=1" />
            <ProductGrid products={onSale} />
          </section>
        )}

        {categories.length > 0 && (
          <section>
            <SectionHeader title="Categorias" description="Encontre mais depressa o que procura." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  className="card flex min-h-24 flex-col justify-end p-4 transition hover:border-orange-300"
                >
                  <span className="text-sm font-semibold text-navy-900">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
