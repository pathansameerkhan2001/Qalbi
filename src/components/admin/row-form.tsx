"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { ActionMessage, initialActionState, SubmitButton } from "./form-bits";

/** Small self-contained form with its own pending/result state (one per editable row). */
export function RowForm({
  action,
  children,
  submitLabel = "Save",
  className,
  variant = "primary",
  confirm,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  /** "danger" renders a quiet red text button (for deletes). */
  variant?: "primary" | "danger";
  /** Asks for confirmation before submitting. */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className={cn("flex flex-wrap items-center gap-3 sm:col-span-full", variant === "danger" && "flex-row-reverse")}>
        {variant === "danger" ? <DangerSubmit>{submitLabel}</DangerSubmit> : <SubmitButton>{submitLabel}</SubmitButton>}
        <ActionMessage state={state} />
        {state.fieldErrors && (
          <p className="text-xs text-danger">
            {Object.entries(state.fieldErrors)
              .map(([k, v]) => `${k.replace("_", " ")}: ${v}`)
              .join(" · ")}
          </p>
        )}
      </div>
    </form>
  );
}

function DangerSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">
      {pending ? "Deleting…" : children}
    </button>
  );
}
