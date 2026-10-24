import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + accessible error/hint wiring. Controls should set aria-describedby={`${id}-desc`}. */
export function Field({ id, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(Optional)</span>}
      </label>
      {children}
      <p id={`${id}-desc`} className={cn("mt-1 text-xs", error ? "text-danger" : "text-muted")} role={error ? "alert" : undefined}>
        {error ?? hint ?? ""}
      </p>
    </div>
  );
}

/** `info`: a neutral next step (e.g. "press Send in WhatsApp"), neither a success nor an error. */
export function FormStatus({ status }: { status: { ok: boolean; message: string; info?: boolean } | null }) {
  if (!status) return null;
  return (
    <div
      role={status.ok || status.info ? "status" : "alert"}
      className={cn(
        "rounded-[3px] border px-4 py-3 text-sm",
        status.info ? "border-gold-soft/50 bg-sand text-ink" : status.ok ? "border-botanical/30 bg-botanical/10 text-forest" : "border-danger/30 bg-danger/5 text-danger",
      )}
    >
      {status.message}
    </div>
  );
}
