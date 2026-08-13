import 'server-only';
import webpush from 'web-push';

import { logger } from '../logger';
import { createAdminSupabase } from '../supabase/admin';

export interface PushSendResult {
  ok: boolean;
  sent: number;
  error?: string;
}

export function missingPushConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) missing.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  if (!process.env.VAPID_PRIVATE_KEY) missing.push('VAPID_PRIVATE_KEY');
  if (!process.env.VAPID_SUBJECT) missing.push('VAPID_SUBJECT');
  return missing;
}

export function isPushConfigured(): boolean {
  return missingPushConfig().length === 0;
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
}

/** Envia uma notificação push a todas as subscrições guardadas (equipa admin). */
export async function sendPushToAdmins(title: string, body: string, url = '/admin'): Promise<PushSendResult> {
  if (!isPushConfigured()) {
    return { ok: false, sent: 0, error: `Push não configurado. Em falta: ${missingPushConfig().join(', ')}` };
  }
  ensureConfigured();

  const supabase = createAdminSupabase();
  const { data: subscriptions } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');

  if (!subscriptions || subscriptions.length === 0) {
    return { ok: false, sent: 0, error: 'Nenhum dispositivo subscrito para notificações push.' };
  }

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  const deadEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // 404/410: subscrição expirada ou revogada pelo navegador — deixa de existir.
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      } else {
        logger.warn('push_send_failed', { reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (deadEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
  }

  return sent > 0
    ? { ok: true, sent }
    : { ok: false, sent: 0, error: 'Não foi possível entregar a notificação a nenhum dispositivo.' };
}
