import Link from 'next/link';

interface Props {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({ title, description, href, linkLabel = 'Ver tudo' }: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="mt-1 text-sm text-navy-500">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-semibold text-orange-600 hover:text-orange-700">
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}
