'use server';

import { redirect } from 'next/navigation';

import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isAdminEmail } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export interface LoginState {
  error?: string;
}

export async function signInAdmin(formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase ainda não está configurado neste ambiente.' };
  }

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();
  const password = (formData.get('password') as string) ?? '';

  if (!email || !password) return { error: 'Preencha o e-mail e a palavra-passe.' };

  const limit = rateLimit(`login:${email}`, 5, 5 * 60_000);
  if (!limit.allowed) {
    return { error: `Demasiadas tentativas. Aguarde ${limit.retryAfterSeconds} segundos.` };
  }

  if (!isAdminEmail(email)) {
    logger.warn('admin_login_denied', { email });
    return { error: 'Esta conta não tem acesso ao painel.' };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn('admin_login_failed', { email });
    return { error: 'E-mail ou palavra-passe incorretos.' };
  }

  logger.info('admin_login', { email });
  redirect('/admin');
}

export async function signOutAdmin() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
