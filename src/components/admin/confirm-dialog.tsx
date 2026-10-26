"use client";

import { useEffect, useId, useRef } from "react";
import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { ActionMessage, SubmitButton, useAdminForm } from "./form-bits";

/**
 * A button that opens a confirmation dialog (native <dialog>: focus is kept
 * inside, Escape cancels) and runs a server action only when the
 * administrator confirms. Cancel closes it without sending anything. The
 * result — the server's own message — is shown next to the button.
 */
export function ConfirmDialogButton({
  action,
  fields,
  trigger,
  triggerClassName,
  title,
  children,
  confirmLabel,
  pendingLabel = "Working…",
  danger = false,
  disabled = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden form fields sent to the action. */
  fields: Record<string, string>;
  trigger: React.ReactNode;
  triggerClassName?: string;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { state, pending, formProps } = useAdminForm(action);

  // Close once the action has answered (its message then shows beside the button).
  useEffect(() => {
    if (!pending && state.message) dialog.current?.close();
  }, [pending, state]);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={disabled} onClick={() => dialog.current?.showModal()} className={cn("inline-flex items-center gap-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40", danger ? "text-danger hover:underline" : "text-forest hover:underline", triggerClassName)}>
        {trigger}
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[3px] border border-line bg-ivory p-0 text-ink shadow-xl backdrop:bg-ink/50">
        <form {...formProps} className="space-y-4 p-5">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="font-serif text-xl">
            {title}
          </h2>
          <div className="space-y-2 text-sm text-muted">{children}</div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-outline btn-sm" autoFocus>
              Cancel
            </button>
            <SubmitButton pending={pending} pendingLabel={pendingLabel} className={danger ? "bg-danger hover:bg-danger/90" : undefined}>
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </dialog>
      {state.message && !pending && (
        <span className="max-w-xs text-xs">
          <ActionMessage state={state} />
        </span>
      )}
    </span>
  );
}
