import type { IngredientIcon } from "@/types/content";

/**
 * Fine line botanical icons for ingredient cards (48 × 48 grid, stroke only,
 * drawn in currentColor). Decorative: always rendered with aria-hidden.
 */
const paths: Record<IngredientIcon, React.ReactNode> = {
  saffron: (
    <>
      <path d="M24 30c-7-2-10-10-8-18 4 3 6 7 8 12" />
      <path d="M24 30c7-2 10-10 8-18-4 3-6 7-8 12" />
      <path d="M24 30c-4-6-4-14 0-21 4 7 4 15 0 21Z" />
      <path d="M24 23l-4-9M24 23l4-9" />
      <path d="M24 30v12M24 38c-4-2-7-5-8-9M24 36c4-2 6-5 7-8" />
    </>
  ),
  rose: (
    <>
      <path d="M14 22c0-8 6-12 10-12 6 0 10 5 10 11 0 8-5 13-10 13-6 0-10-5-10-12Z" />
      <path d="M24 16c-4 0-5 5-2 7s7-1 5-5" />
      <path d="M19 26c3 4 9 3 11-2" />
      <path d="M24 34v8M24 39c3-3 7-3 9-1-3 2-6 2-9 1Z" />
    </>
  ),
  coconut: (
    <>
      <path d="M23 22c-1-7 3-12 8-12s8 4 8 9" />
      <circle cx="29" cy="15" r=".8" />
      <circle cx="33" cy="15" r=".8" />
      <circle cx="31" cy="18" r=".8" />
      <path d="M8 26h32c0 8-7 14-16 14S8 34 8 26Z" />
      <path d="M12 26c0 6 5 10 12 10s12-4 12-10" />
    </>
  ),
  aloe: (
    <>
      <path d="M24 40c-2-10-4-20 0-32 3 12 3 22 0 32Z" />
      <path d="M22 40c-6-6-11-14-12-22 6 6 10 13 12 22Z" />
      <path d="M26 40c6-6 11-14 12-22-6 6-10 13-12 22Z" />
      <path d="M15 40h18" />
    </>
  ),
  turmeric: (
    <>
      <path d="M18 30c-1-4 2-7 6-6l8-1c1-4 5-6 8-4 2 2 1 5-2 6 2 1 3 4 1 6-2 1-4 0-5-1l-10 3c-3 1-5-1-6-3Z" />
      <path d="M24 24.5c-.8 2-.6 4 .5 6M32 23c-.6 2 0 4 1.5 5.5" />
      <path d="M27 23.5c-1-3 0-6 3-8.5" />
      <circle cx="12" cy="34" r="6" />
      <circle cx="12" cy="34" r="2.5" />
    </>
  ),
  neem: (
    <>
      <path d="M24 42V12" />
      <path d="M24 34c-5 0-9-3-10-7 5 0 8 3 10 7ZM24 34c5 0 9-3 10-7-5 0-8 3-10 7Z" />
      <path d="M24 26c-5 0-9-3-10-7 5 0 8 3 10 7ZM24 26c5 0 9-3 10-7-5 0-8 3-10 7Z" />
      <path d="M24 18c-4 0-7-3-8-6 4 0 7 2 8 6ZM24 18c4 0 7-3 8-6-4 0-7 2-8 6Z" />
      <path d="M24 12c-2-2-2-5 0-7 2 2 2 5 0 7Z" />
    </>
  ),
  cardamom: (
    <>
      <path d="M24 8c7 5 9 16 6 25-2 5-4 7-6 8-2-1-4-3-6-8-3-9-1-20 6-25Z" />
      <path d="M24 8c-2 10-2 22 0 33M24 8c3 9 4 20 2 31" />
      <path d="M24 8l1-3" />
    </>
  ),
  leaf: (
    <>
      <path d="M12 36C12 20 22 10 38 10c0 16-10 26-26 26Z" />
      <path d="M12 36l16-16" />
    </>
  ),
};

export function BotanicalIcon({ name, className }: { name: IngredientIcon; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" className={className}>
      {paths[name] ?? paths.leaf}
    </svg>
  );
}

/** Small sprig used as a section ornament (as in the ingredients heading). */
export function SprigOrnament({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`ornament ${className ?? ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M12 20V10M12 14c-3 0-5-2-6-5 3 0 5 2 6 5ZM12 14c3 0 5-2 6-5-3 0-5 2-6 5ZM12 10c-1.5-1.5-1.5-4 0-6 1.5 2 1.5 4.5 0 6Z" />
      </svg>
    </span>
  );
}
