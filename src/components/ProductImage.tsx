import Image from 'next/image';

interface Props {
  src?: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/** Mostra a fotografia do produto ou um marcador neutro quando ainda não existe. */
export function ProductImage({ src, alt, priority, sizes = '(max-width: 768px) 50vw, 320px', className }: Props) {
  return (
    <Image
      src={src || '/placeholder.svg'}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className ?? 'object-cover'}
    />
  );
}
