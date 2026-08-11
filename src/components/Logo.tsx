import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="SmartLar — página inicial">
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-base font-black text-white"
      >
        S
        <span className="text-orange-400">L</span>
      </span>
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight text-navy-900">SmartLar</span>
        {!compact && (
          <span className="block text-[11px] font-medium text-navy-400">
            Inovação • Conforto • Para o seu lar.
          </span>
        )}
      </span>
    </Link>
  );
}
