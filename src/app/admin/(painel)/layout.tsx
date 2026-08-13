import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { signOutAdmin } from '@/server/actions/auth';
import { getRecentActivity } from '@/server/admin-data';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { PushToggle } from '@/components/admin/PushToggle';

export const dynamic = 'force-dynamic';

const links = [
  { href: '/admin', label: 'Resumo' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const activity = await getRecentActivity();

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-navy-100 pb-4">
        <div>
          <p className="text-lg font-extrabold text-navy-900">Painel SmartLar</p>
          <p className="text-xs text-navy-500">Sessão de {session.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <PushToggle />
          <NotificationBell items={activity} />
          <form action={signOutAdmin}>
            <button type="submit" className="btn-ghost text-sm">
              Terminar sessão
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Secções do painel">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-navy-100 px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-300 hover:text-navy-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
