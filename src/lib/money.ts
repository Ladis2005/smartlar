/**
 * Todos os preços circulam no sistema como inteiros em centavos de metical.
 * 2.099,00 MT = 209900. Isto evita erros de arredondamento em vírgula flutuante.
 */

export const CURRENCY = 'MZN';

export function formatMzn(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  const units = Math.floor(abs / 100);
  const rest = abs % 100;

  const grouped = units.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = rest === 0 ? '' : `,${rest.toString().padStart(2, '0')}`;

  return `${negative ? '-' : ''}${grouped}${decimals} MT`;
}

/** Valor decimal usado pelo Meta Pixel / Conversions API (ex.: 2099.00). */
export function toMajorUnits(cents: number): number {
  return Math.round(cents) / 100;
}

export function centsFromInput(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100);
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function discountPercent(priceCents: number, compareAtCents?: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
