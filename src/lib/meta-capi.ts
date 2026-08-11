import 'server-only';

import { CURRENCY, toMajorUnits } from './money';
import { logger } from './logger';

export interface ServerEventInput {
  eventName: 'Purchase' | 'InitiateCheckout' | 'ViewContent' | 'AddToCart';
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  valueCents: number;
  contentIds: string[];
  numItems?: number;
  /** Dados do cliente. São enviados sempre em hash SHA-256, como a Meta exige. */
  user?: { phone?: string | null; name?: string | null; city?: string | null };
}

export function isCapiConfigured(): boolean {
  return Boolean(process.env.META_CAPI_ACCESS_TOKEN && (process.env.META_CAPI_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID));
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Envia um evento pelo servidor. O event_id é o mesmo que o Pixel do navegador
 * usa, o que permite à Meta juntar os dois envios e contar apenas uma conversão.
 * Enquanto META_CAPI_ACCESS_TOKEN estiver vazio, esta função não faz nada.
 */
export async function sendServerEvent(input: ServerEventInput): Promise<{ ok: boolean; error?: string }> {
  if (!isCapiConfigured()) {
    return { ok: false, error: 'Conversions API não configurada.' };
  }

  const pixelId = process.env.META_CAPI_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const userData: Record<string, string[]> = {};

  if (input.user?.phone) userData.ph = [await sha256(input.user.phone.replace(/\D/g, ''))];
  if (input.user?.name) userData.fn = [await sha256(input.user.name.split(/\s+/)[0] ?? '')];
  if (input.user?.city) userData.ct = [await sha256(input.user.city.replace(/\s/g, ''))];

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_id: input.eventId,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_source_url: input.eventSourceUrl,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: CURRENCY,
          value: toMajorUnits(input.valueCents),
          content_ids: input.contentIds,
          content_type: 'product',
          num_items: input.numItems,
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${process.env.META_CAPI_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = body.error?.message ?? `HTTP ${response.status}`;
      logger.warn('capi_event_failed', { event: input.eventName, reason: message });
      return { ok: false, error: message };
    }

    logger.info('capi_event_sent', { event: input.eventName, eventId: input.eventId });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.warn('capi_event_error', { event: input.eventName, reason: message });
    return { ok: false, error: message };
  }
}
