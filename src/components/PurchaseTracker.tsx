'use client';

import { useEffect, useRef } from 'react';

import { trackPurchase } from '@/lib/pixel';
import { shouldFirePurchase } from '@/lib/purchase-guard';
import { claimPurchaseEvent } from '@/server/actions/purchase';

/**
 * Dispara Purchase uma única vez por encomenda.
 * Três travões: a marca local no sessionStorage, a referência do componente e,
 * o mais importante, a reserva na base de dados (purchase_tracked_at).
 */
export function PurchaseTracker({ orderNumber, token }: { orderNumber: string; token: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const storageKey = `smartlar-purchase-${orderNumber}`;
    let alreadyMarkedLocally = false;
    try {
      alreadyMarkedLocally = Boolean(window.sessionStorage.getItem(storageKey));
    } catch {
      // sessionStorage indisponível: a base de dados continua a garantir a unicidade.
    }
    if (alreadyMarkedLocally) return;

    claimPurchaseEvent(orderNumber, token)
      .then((claim) => {
        if (!shouldFirePurchase({ dbClaimed: claim.shouldTrack, alreadyMarkedLocally }) || !claim.eventId) return;

        trackPurchase({
          eventId: claim.eventId,
          contentIds: claim.contentIds ?? [],
          valueCents: claim.valueCents ?? 0,
          numItems: claim.numItems ?? 0,
        });

        try {
          window.sessionStorage.setItem(storageKey, '1');
        } catch {
          // Sem sessionStorage o evento continua protegido pelo servidor.
        }
      })
      .catch(() => undefined);
  }, [orderNumber, token]);

  return null;
}
