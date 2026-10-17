"use client";

import { useActionState } from "react";
import { updateOrderAction } from "@/lib/admin/actions";
import { ActionMessage, initialActionState, SubmitButton } from "@/components/admin/form-bits";

const statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;

export function OrderStatusForm({ id, status, paymentStatus, paymentMethod }: { id: string; status: string; paymentStatus: string; paymentMethod: "COD" | "PHONE" }) {
  const [state, action] = useActionState(updateOrderAction, initialActionState);
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="order-status" className="label">
          Order status
        </label>
        <select id="order-status" name="status" defaultValue={status} className="field capitalize">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">Cancelling returns reserved stock to inventory.</p>
      </div>
      <div>
        <label htmlFor="payment-status" className="label">
          Payment status
        </label>
        <select id="payment-status" name="payment_status" defaultValue={paymentStatus} className="field capitalize">
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          {paymentMethod === "COD" ? "Mark as paid only after the cash has been collected on delivery." : "Mark as paid only after you have verified the customer's payment."}
        </p>
      </div>
      <ActionMessage state={state} />
      <SubmitButton className="w-full">Save changes</SubmitButton>
    </form>
  );
}
