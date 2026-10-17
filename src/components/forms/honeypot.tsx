import type { UseFormRegisterReturn } from "react-hook-form";

/** Visually hidden field that real visitors never fill in. */
export function Honeypot({ registration }: { registration: UseFormRegisterReturn }) {
  return (
    <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
      <label>
        Company
        <input type="text" tabIndex={-1} autoComplete="off" {...registration} />
      </label>
    </div>
  );
}
