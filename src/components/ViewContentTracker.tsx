'use client';

import { useEffect } from 'react';

import { trackViewContent } from '@/lib/pixel';

/** Dispara ViewContent uma vez, quando a página do produto abre. */
export function ViewContentTracker({ id, name, priceCents }: { id: string; name: string; priceCents: number }) {
  useEffect(() => {
    trackViewContent({ id, name, priceCents });
  }, [id, name, priceCents]);

  return null;
}
