'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from './Logo';
import { useCartCount } from '@/lib/cart-store';
import type { Category } from '@/lib/types';

interface Props {
  categories: Category[];
  announcement?: string | null;
}

export function Header({ categories, announcement }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const count = useCartCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setMenuOpen(false);
  }, [searchParams]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/produtos?q=${encodeURIComponent(query)}` : '/produtos');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      {announcement ? (
        <p className="bg-navy-800 px-4 py-2 text-center text-xs font-medium text-white">{announcement}</p>
      ) : (
        <p className="bg-navy-800 px-4 py-2 text-center text-xs font-medium text-white">
          Entregamos em Maputo e Matola • Pagamento por M-Pesa ou e-Mola
        </p>
      )}

      <div className="container-page flex h-16 items-center gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="-ml-2 rounded-lg p-2 text-navy-700 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Logo compact />

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 md:block" role="search">
          <label htmlFor="pesquisa" className="sr-only">
            Pesquisar produtos
          </label>
          <div className="relative">
            <input
              id="pesquisa"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Pesquisar produtos"
              className="field py-2.5 pl-10 text-sm"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </div>
        </form>

        <Link
          href="/carrinho"
          className="relative ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-navy-800 hover:bg-navy-50 md:ml-4"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.6L21 8H6" />
            <circle cx="10" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
          <span className="hidden text-sm font-semibold sm:inline">Carrinho</span>
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
              {count}
            </span>
          )}
          <span className="sr-only">{count} artigos no carrinho</span>
        </Link>
      </div>

      <nav
        id="menu-principal"
        className={`border-t border-navy-100 lg:border-t-0 ${menuOpen ? 'block' : 'hidden'} lg:block`}
        aria-label="Navegação principal"
      >
        <div className="container-page flex flex-col gap-1 py-3 text-sm font-medium text-navy-700 lg:h-11 lg:flex-row lg:items-center lg:gap-6 lg:py-0">
          <form onSubmit={submitSearch} className="mb-2 md:hidden" role="search">
            <label htmlFor="pesquisa-mobile" className="sr-only">
              Pesquisar produtos
            </label>
            <input
              id="pesquisa-mobile"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Pesquisar produtos"
              className="field py-2.5 text-sm"
            />
          </form>

          <Link className="py-2 hover:text-orange-600 lg:py-0" href="/produtos">
            Produtos
          </Link>
          {categories.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href={`/categorias/${category.slug}`}
              className="py-2 hover:text-orange-600 lg:py-0"
            >
              {category.name}
            </Link>
          ))}
          <Link className="py-2 hover:text-orange-600 lg:py-0" href="/produtos?promocoes=1">
            Promoções
          </Link>
          <Link className="py-2 hover:text-orange-600 lg:ml-auto lg:py-0" href="/rastrear-pedido">
            Seguir encomenda
          </Link>
        </div>
      </nav>
    </header>
  );
}
