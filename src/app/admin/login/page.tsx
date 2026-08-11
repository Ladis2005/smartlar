import type { Metadata } from 'next';

import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/Logo';
import { getAdminEmails } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Entrar no painel',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  const configured = getAdminEmails().length > 0;

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <h1 className="mb-1 text-center text-xl font-extrabold text-navy-900">Painel SmartLar</h1>
        <p className="mb-6 text-center text-sm text-navy-500">Acesso reservado à equipa da loja.</p>

        {!configured ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhum administrador definido. Preencha ADMIN_EMAILS no .env.local e crie o utilizador em
            Supabase → Authentication → Users.
          </p>
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
