import { describe, it, expect } from 'vitest';

import { centsFromInput, discountPercent, formatMzn, toMajorUnits } from '@/lib/money';

describe('formatação de preços em meticais', () => {
  it('mostra milhares com ponto e sem decimais quando são zero', () => {
    expect(formatMzn(209900)).toBe('2.099 MT');
    expect(formatMzn(74990000)).toBe('749.900 MT');
    expect(formatMzn(0)).toBe('0 MT');
  });

  it('mostra os centavos quando existem', () => {
    expect(formatMzn(209950)).toBe('2.099,50 MT');
    expect(formatMzn(105)).toBe('1,05 MT');
  });

  it('converte texto escrito pelo administrador em centavos', () => {
    expect(centsFromInput('2099,00')).toBe(209900);
    expect(centsFromInput('2.099,50')).toBe(209950);
    expect(centsFromInput('750')).toBe(75000);
    expect(centsFromInput('')).toBe(0);
  });

  it('converte centavos para o formato decimal do Meta Pixel', () => {
    expect(toMajorUnits(209900)).toBe(2099);
    expect(toMajorUnits(209950)).toBe(2099.5);
  });

  it('calcula a percentagem de desconto apenas quando faz sentido', () => {
    expect(discountPercent(209900, 259900)).toBe(19);
    expect(discountPercent(209900, 209900)).toBeNull();
    expect(discountPercent(209900, null)).toBeNull();
  });
});
