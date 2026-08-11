import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/** Cliente ligado à sessão (cookies). Usado na autenticação do painel. */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem escrever cookies; o middleware trata da renovação.
        }
      },
    },
  });
}

/** Cliente anónimo, sem sessão. Leitura do catálogo público (protegido por RLS). */
export function createAnonSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
