"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Header search: opens an accessible dialog and submits to /search. */
export function SearchDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const router = useRouter();

  const open = () => {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    dialogRef.current?.close();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <button type="button" onClick={open} className="inline-flex size-10 items-center justify-center text-ink transition hover:text-forest" aria-label="Search products">
        <Search className="size-[1.3rem]" strokeWidth={1.6} aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Search products"
        className="fixed inset-x-0 top-0 m-0 w-full max-w-none bg-ivory p-0 shadow-lift backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <form role="search" onSubmit={submit} className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:px-6 sm:py-7">
          <Search aria-hidden className="size-5 shrink-0 text-muted" />
          <label htmlFor="site-search" className="sr-only">
            Search QALBI products
          </label>
          <input
            ref={inputRef}
            id="site-search"
            type="search"
            name="q"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search serums, creams, cleansers…"
            maxLength={100}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 font-serif text-xl text-ink placeholder:text-muted/70 focus:outline-none sm:text-2xl"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()} className="inline-flex size-10 items-center justify-center text-muted hover:text-ink" aria-label="Close search">
            <X className="size-5" aria-hidden />
          </button>
        </form>
      </dialog>
    </>
  );
}
