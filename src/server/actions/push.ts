'use server';

import { requireAdmin } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { sendPushToAdmins } from '@/lib/push/provider';

export interface PushActionResult {
  ok: boolean;
  message: string;
}

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribeToPush(subscription: SubscriptionInput): Promise<PushActionResult> {
  const session = await requireAdmin();
  const supabase = createAdminSupabase();

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      admin_email: session.email,
    },
    { onConflict: 'endpoint' },
  );

  if (error) return { ok: false, message: 'Não foi possível ativar as notificações.' };
  return { ok: true, message: 'Notificações ativadas neste dispositivo.' };
}

export async function unsubscribeFromPush(endpoint: string): Promise<PushActionResult> {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { ok: true, message: 'Notificações desativadas neste dispositivo.' };
}

export async function sendTestPush(): Promise<PushActionResult> {
  await requireAdmin();
  const result = await sendPushToAdmins('SmartLar', 'Notificação de teste — está a funcionar!');
  return result.ok
    ? { ok: true, message: `Enviada para ${result.sent} dispositivo(s).` }
    : { ok: false, message: result.error ?? 'Falha ao enviar.' };
}
