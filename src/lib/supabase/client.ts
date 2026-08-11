'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/** Cliente do navegador. Usa apenas a chave anónima — nunca a service role. */
export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
