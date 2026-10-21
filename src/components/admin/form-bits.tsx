"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export const initialActionState: ActionState = { ok: false, message: "" };

/**
 * Form state for an admin server action. Submits through a transition instead of
 * the form's `action` prop, because React resets every uncontrolled field after an
 * `action` prop submission — even a failed one — which wiped what the
 * administrator had typed whenever validation or the network failed.
 *
 * Also ignores a second submit while one is still running, asks `confirm` first
 * when given, and with `resetOnSuccess` clears the form after a successful save
 * (for "add" forms).
 */
export function useAdminForm(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  { confirm, resetOnSuccess = false }: { confirm?: string; resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  };

  return { state, pending, formProps: { ref, onSubmit } };
}

export function SubmitButton({
  children,
  className,
  pendingLabel = "Saving…",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  /** From useAdminForm; without it the button follows the form's own `action` status. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className={cn("btn btn-primary btn-sm", className)}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-botanical" : "text-danger")}>
      {state.message}
    </p>
  );
}

export function FieldError({ state, name, id }: { state: ActionState; name: string; id?: string }) {
  const message = state.fieldErrors?.[name];
  return message ? (
    <p id={id} className="mt-1 text-xs text-danger">
      {message}
    </p>
  ) : null;
}

/** Submit button that asks for confirmation before a destructive action. */
export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={cn("text-xs font-medium text-danger hover:underline", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
