'use client';

interface Props {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
}

export function QuantityStepper({ value, max = 99, onChange, label = 'Quantidade' }: Props) {
  return (
    <div className="inline-flex items-center rounded-xl border border-navy-200">
      <button
        type="button"
        className="h-11 w-11 text-lg font-bold text-navy-700 disabled:opacity-40"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="h-11 w-12 border-x border-navy-200 text-center text-base font-semibold text-navy-900 focus:outline-none"
        value={value}
        min={1}
        max={max}
        aria-label={label}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(next) ? Math.min(Math.max(1, next), max) : 1);
        }}
      />
      <button
        type="button"
        className="h-11 w-11 text-lg font-bold text-navy-700 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}
