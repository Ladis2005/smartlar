import { NextResponse } from 'next/server';

import { retryFailedNotifications } from '@/lib/whatsapp/notify';
import { hasServiceRole } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retenta as notificações que falharam. Pode ser chamada por um Vercel Cron.
 * Protegida por CRON_SECRET quando essa variável existir.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });
  }

  const result = await retryFailedNotifications();
  logger.info('notification_retry_run', result);
  return NextResponse.json({ ok: true, ...result });
}
