import { discountPercent, formatMzn } from '@/lib/money';

interface Props {
  priceCents: number;
  compareAtCents?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-3xl',
};

export function Price({ priceCents, compareAtCents, size = 'md' }: Props) {
  const off = discountPercent(priceCents, compareAtCents);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-extrabold text-navy-900 ${sizes[size]}`}>{formatMzn(priceCents)}</span>
      {off !== null && compareAtCents ? (
        <>
          <span className="text-sm text-navy-400 line-through">{formatMzn(compareAtCents)}</span>
          <span className="badge bg-orange-100 text-orange-700">-{off}%</span>
        </>
      ) : null}
    </div>
  );
}
