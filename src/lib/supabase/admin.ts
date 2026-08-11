import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/**
 * Cliente com service role. Ignora RLS, por isso só pode ser importado em código
 * de servidor (server actions, route handlers). A chave nunca chega ao navegador.
 */
let cached: SupabaseClient | null = null;

export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminSupabase(): SupabaseClient {
  if (cached) return cached;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      'Supabase não configurado no servidor. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  cached = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
