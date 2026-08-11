import Link from 'next/link';
import type { Category, SiteSettings } from '@/lib/types';

export function Footer({ categories, settings }: { categories: Category[]; settings: SiteSettings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-navy-100 bg-navy-900 text-navy-100">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold text-white">SmartLar</p>
          <p className="mt-2 text-sm text-navy-200">{settings.tagline}</p>
          <p className="mt-4 text-sm text-navy-300">
            Entregas em {settings.delivery_areas.join(' e ')}.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Comprar</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-orange-300" href="/produtos">
                Todos os produtos
              </Link>
            </li>
            {categories.slice(0, 4).map((category) => (
              <li key={category.id}>
                <Link className="hover:text-orange-300" href={`/categorias/${category.slug}`}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Ajuda</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-orange-300" href="/rastrear-pedido">
                Seguir a minha encomenda
              </Link>
            </li>
            <li>
              <Link className="hover:text-orange-300" href="/carrinho">
                Carrinho
              </Link>
            </li>
            <li>
              <Link className="hover:text-orange-300" href="/checkout">
                Finalizar compra
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Pagamento</p>
          <ul className="space-y-2 text-sm text-navy-200">
            {settings.mpesa_enabled && settings.mpesa_number ? <li>M-Pesa: {settings.mpesa_number}</li> : null}
            {settings.emola_enabled && settings.emola_number ? <li>e-Mola: {settings.emola_number}</li> : null}
          </ul>
          {settings.contact_whatsapp ? (
            <p className="mt-4 text-sm text-navy-200">WhatsApp: {settings.contact_whatsapp}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-navy-800">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} SmartLar. Todos os direitos reservados.</p>
          <p>Maputo • Matola</p>
        </div>
      </div>
    </footer>
  );
}
