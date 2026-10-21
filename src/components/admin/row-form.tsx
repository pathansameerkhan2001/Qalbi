"use client";

import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { ActionMessage, SubmitButton, useAdminForm } from "./form-bits";

/** Small self-contained form with its own pending/result state (one per editable row). */
export function RowForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel,
  className,
  variant = "primary",
  confirm,
  resetOnSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  /** "danger" renders a quiet red text button (for deletes); "quiet" a small outline button. */
  variant?: "primary" | "danger" | "quiet";
  /** Asks for confirmation before submitting. */
  confirm?: string;
  /** Clears the fields after a successful save (forms that add a new row). */
  resetOnSuccess?: boolean;
}) {
  const { state, pending, formProps } = useAdminForm(action, { confirm, resetOnSuccess });
  return (
    <form {...formProps} className={className}>
      {children}
      <div className={cn("flex flex-wrap items-center gap-3 sm:col-span-full", variant === "danger" && "flex-row-reverse")}>
        {variant === "danger" ? (
          <button type="submit" disabled={pending} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">
            {pending ? (pendingLabel ?? "Deleting…") : submitLabel}
          </button>
        ) : variant === "quiet" ? (
          <button type="submit" disabled={pending} className="btn btn-outline btn-sm disabled:opacity-50">
            {pending ? (pendingLabel ?? "Saving…") : submitLabel}
          </button>
        ) : (
          <SubmitButton pending={pending} pendingLabel={pendingLabel}>
            {submitLabel}
          </SubmitButton>
        )}
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
