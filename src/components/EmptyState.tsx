import Link from 'next/link';

interface Props {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-base font-semibold text-navy-900">{title}</p>
      <p className="max-w-md text-sm text-navy-500">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
