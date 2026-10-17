"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types/commerce";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return <div className="aspect-[4/5] rounded-[3px] border border-line bg-sand" aria-label={`No image available for ${title}`} />;
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-[3px] border border-line bg-sand">
        <Image src={current.url} alt={current.alt} fill preload sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto lg:w-20 lg:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-[3px] border bg-sand lg:size-20",
                  i === active ? "border-forest" : "border-line opacity-80 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
