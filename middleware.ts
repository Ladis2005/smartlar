import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Renova a sessão em cada pedido ao painel.
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const isAdmin = Boolean(email && adminEmails().includes(email));

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/admin/login' && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
