'use client';

import { CURRENCY, toMajorUnits } from './money';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...args: unknown[]) => void };
    _fbq?: unknown;
  }
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

export function isPixelEnabled(): boolean {
  return Boolean(PIXEL_ID);
}

type EventOptions = { eventID?: string };

function track(event: string, data: Record<string, unknown>, options?: EventOptions) {
  if (typeof window === 'undefined' || !window.fbq || !isPixelEnabled()) return;
  window.fbq('track', event, data, options);
}

export function trackPageView() {
  track('PageView', {});
}

export interface PixelProduct {
  id: string;
  name: string;
  priceCents: number;
}

export function trackViewContent(product: PixelProduct) {
  track('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: toMajorUnits(product.priceCents),
    currency: CURRENCY,
  });
}

export function trackAddToCart(product: PixelProduct, quantity: number) {
  track('AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: toMajorUnits(product.priceCents * quantity),
    currency: CURRENCY,
    num_items: quantity,
  });
}

export function trackInitiateCheckout(params: {
  contentIds: string[];
  valueCents: number;
  numItems: number;
}) {
  track('InitiateCheckout', {
    content_ids: params.contentIds,
    content_type: 'product',
    value: toMajorUnits(params.valueCents),
    currency: CURRENCY,
    num_items: params.numItems,
  });
}

export function trackPurchase(params: {
  eventId: string;
  contentIds: string[];
  valueCents: number;
  numItems: number;
}) {
  track(
    'Purchase',
    {
      content_ids: params.contentIds,
      content_type: 'product',
      value: toMajorUnits(params.valueCents),
      currency: CURRENCY,
      num_items: params.numItems,
    },
    // Mesmo event_id usado pela Conversions API: a Meta remove o duplicado.
    { eventID: params.eventId },
  );
}
