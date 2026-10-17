"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export const initialActionState: ActionState = { ok: false, message: "" };

export function SubmitButton({ children, className, pendingLabel = "Saving…" }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("btn btn-primary btn-sm", className)}>
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
