import { describe, it, expect, beforeEach } from 'vitest';

import { rateLimit, resetRateLimits } from '@/lib/rate-limit';
import { shouldFirePurchase } from '@/lib/purchase-guard';

describe('proteção contra pedidos repetidos', () => {
  beforeEach(() => resetRateLimits());

  it('deixa passar até ao limite e depois trava', () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(rateLimit('checkout:1.2.3.4', 3).allowed).toBe(true);
    }

    const blocked = rateLimit('checkout:1.2.3.4', 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('conta cada cliente separadamente', () => {
    rateLimit('checkout:1.1.1.1', 1);
    expect(rateLimit('checkout:1.1.1.1', 1).allowed).toBe(false);
    expect(rateLimit('checkout:2.2.2.2', 1).allowed).toBe(true);
  });

  it('volta a permitir depois da janela terminar', () => {
    expect(rateLimit('checkout:3.3.3.3', 1, 1).allowed).toBe(true);
    const blocked = rateLimit('checkout:3.3.3.3', 1, 1);
    expect(blocked.allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit('checkout:3.3.3.3', 1, 1).allowed).toBe(true);
        resolve();
      }, 5);
    });
  });
});

describe('proteção contra Purchase duplicado', () => {
  it('dispara na primeira vez', () => {
    expect(shouldFirePurchase({ dbClaimed: true, alreadyMarkedLocally: false })).toBe(true);
  });

  it('não dispara quando o servidor já tinha registado o evento', () => {
    expect(shouldFirePurchase({ dbClaimed: false, alreadyMarkedLocally: false })).toBe(false);
  });

  it('não dispara num refresh da página de confirmação', () => {
    expect(shouldFirePurchase({ dbClaimed: true, alreadyMarkedLocally: true })).toBe(false);
    expect(shouldFirePurchase({ dbClaimed: false, alreadyMarkedLocally: true })).toBe(false);
  });
});
