'use client';

import { useState } from 'react';

import { ProductImage } from './ProductImage';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const gallery = images.length ? images : [''];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-navy-100 bg-navy-50">
        <ProductImage src={gallery[active]} alt={name} priority sizes="(max-width: 1024px) 100vw, 520px" />
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setActive(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                index === active ? 'border-orange-500' : 'border-navy-100'
              }`}
              aria-label={`Ver fotografia ${index + 1} de ${name}`}
            >
              <ProductImage src={image} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
