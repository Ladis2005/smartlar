import 'server-only';

import { redirect } from 'next/navigation';
import { createServerSupabase } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = getAdminEmails();
  // Sem lista definida, ninguém entra: é mais seguro do que abrir o painel.
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}

export interface AdminSession {
  email: string;
  userId: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isAdminEmail(user.email)) return null;
  return { email: user.email ?? '', userId: user.id };
}

/** Usar no topo de todas as páginas e ações de /admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
