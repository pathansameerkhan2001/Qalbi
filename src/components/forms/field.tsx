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

export function FormStatus({ status }: { status: { ok: boolean; message: string } | null }) {
  if (!status) return null;
  return (
    <div
      role={status.ok ? "status" : "alert"}
      className={cn(
        "rounded-[3px] border px-4 py-3 text-sm",
        status.ok ? "border-botanical/30 bg-botanical/10 text-forest" : "border-danger/30 bg-danger/5 text-danger",
      )}
    >
      {status.message}
    </div>
  );
}
