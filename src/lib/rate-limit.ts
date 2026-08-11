/**
 * Limitador simples em memória, por instância. Chega para travar cliques
 * repetidos e envios em rajada no checkout. Num cenário com várias instâncias,
 * troque o Map por Upstash Redis mantendo a mesma assinatura.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit = 5, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function resetRateLimits() {
  buckets.clear();
}
