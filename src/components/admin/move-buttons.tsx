"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { ActionState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { ActionMessage, useAdminForm } from "./form-bits";

type MoveAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** "Move up" / "Move down" for a row of an ordered list. The action receives `id` and `direction`. */
export function MoveButtons({ id, action, first, last, disabled = false }: { id: string; action: MoveAction; first: boolean; last: boolean; disabled?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <MoveButton id={id} action={action} direction="up" disabled={disabled || first} />
      <MoveButton id={id} action={action} direction="down" disabled={disabled || last} />
    </span>
  );
}

function MoveButton({ id, action, direction, disabled }: { id: string; action: MoveAction; direction: "up" | "down"; disabled: boolean }) {
  const { state, pending, formProps } = useAdminForm(action);
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <form {...formProps} className="contents">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button type="submit" disabled={disabled || pending} aria-label={`Move ${direction}`} title={`Move ${direction}`} className="rounded p-1.5 text-forest hover:bg-sand disabled:opacity-30">
        <Icon className={cn("size-4", pending && "animate-pulse")} aria-hidden />
      </button>
      {!state.ok && state.message && (
        <span className="w-full">
          <ActionMessage state={state} />
        </span>
      )}
    </form>
  );
}
