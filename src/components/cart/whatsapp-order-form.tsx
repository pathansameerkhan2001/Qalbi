"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, LoaderCircle, PencilLine } from "lucide-react";
import { prepareWhatsAppOrderAction } from "@/lib/cart/actions";
import { customerDetailsErrors, customerDetailsSchema, type CustomerDetails, type CustomerDetailsErrors } from "@/lib/checkout/customer-details";
import { track } from "@/lib/analytics";
import { Field, FormStatus } from "@/components/forms/field";
import { WhatsAppIcon } from "@/components/ui/brand-icons";

type Values = Record<keyof CustomerDetails, string>;
const fieldOrder: (keyof CustomerDetails)[] = ["name", "address", "pinCode"];

/**
 * Delivery details + WhatsApp order handoff for the bag. Step 1 validates the
 * details and asks the server to build the message from the verified bag;
 * step 2 shows that message and a link the customer chooses to open. Nothing is
 * sent automatically, and nothing here claims the order has been placed.
 * Details stay in this component's memory only (not stored, logged or tracked).
 */
export function WhatsAppOrderForm({ bagKey }: { bagKey: string }) {
  const [values, setValues] = useState<Values>({ name: "", address: "", pinCode: "" });
  const [errors, setErrors] = useState<CustomerDetailsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // The prepared message belongs to one bag: changing quantities or items invalidates it.
  const [review, setReview] = useState<{ url: string; message: string; bagKey: string } | null>(null);
  const [opened, setOpened] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const current = review && review.bagKey === bagKey ? review : null;

  // Arriving from a product page's "Order on WhatsApp" (/cart#delivery-details): the form renders
  // after the bag loads, so bring it into view here.
  useEffect(() => {
    if (window.location.hash !== "#delivery-details") return;
    formRef.current?.scrollIntoView({ block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("#order-name")?.focus({ preventScroll: true });
  }, []);

  const update = (key: keyof CustomerDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }));
    setReview(null);
  };

  const focusFirstError = (errs: CustomerDetailsErrors) => {
    const first = fieldOrder.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#order-${first}`)?.focus();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const parsed = customerDetailsSchema.safeParse(values);
    if (!parsed.success) {
      const errs = customerDetailsErrors(parsed.error);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await prepareWhatsAppOrderAction(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          focusFirstError(result.fieldErrors);
        }
        return;
      }
      setOpened(false);
      setReview({ url: result.url, message: result.message, bagKey });
    });
  };

  if (current) {
    return (
      <section aria-labelledby="order-review-heading" className="space-y-4">
        <h3 id="order-review-heading" className="font-serif text-xl text-ink">
          Review your WhatsApp message
        </h3>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[3px] border border-line bg-sand/50 p-3 font-sans text-xs leading-relaxed text-ink">{current.message}</pre>
        <p className="text-xs leading-relaxed text-muted">
          WhatsApp opens with this message filled in. <strong className="font-medium text-ink">Nothing is sent until you press send in WhatsApp</strong>, and your order is confirmed
          only when we reply with the final amount and payment details.
        </p>
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setOpened(true);
            track({ name: "whatsapp_clicked", params: { location: "bag_order" } });
          }}
          className="btn btn-primary w-full"
        >
          <WhatsAppIcon className="size-4" /> Continue to WhatsApp
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only"> (opens WhatsApp in a new tab)</span>
        </a>
        {opened && (
          <p role="status" className="text-xs leading-relaxed text-forest">
            WhatsApp should now be open. Please review and send the message there — your order has not been placed until you do and we confirm it.
          </p>
        )}
        <button type="button" onClick={() => setReview(null)} className="inline-flex items-center gap-1.5 text-sm text-forest underline-offset-4 hover:underline">
          <PencilLine className="size-3.5" aria-hidden /> Edit delivery details
        </button>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby="delivery-details-heading" id="delivery-details" className="scroll-mt-28 space-y-4">
      <div>
        <h3 id="delivery-details-heading" className="font-serif text-xl text-ink">
          Delivery details
        </h3>
        <p className="mt-1 text-xs text-muted">We deliver within India. These details are added to your WhatsApp message only.</p>
      </div>
      <Field id="order-name" label="Full name" error={errors.name}>
        <input
          id="order-name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={update("name")}
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          aria-describedby="order-name-desc"
          className="field"
        />
      </Field>
      <Field id="order-address" label="Delivery address" error={errors.address} hint="House / flat, street, area, city and state">
        <textarea
          id="order-address"
          name="address"
          autoComplete="street-address"
          rows={3}
          value={values.address}
          onChange={update("address")}
          maxLength={400}
          aria-invalid={Boolean(errors.address)}
          aria-describedby="order-address-desc"
          className="field min-h-24 resize-y py-2.5"
        />
      </Field>
      <Field id="order-pinCode" label="PIN code" error={errors.pinCode} hint="6 digits, e.g. 560038">
        <input
          id="order-pinCode"
          name="pinCode"
          autoComplete="postal-code"
          inputMode="numeric"
          pattern="[0-9 ]*"
          value={values.pinCode}
          onChange={update("pinCode")}
          maxLength={7}
          aria-invalid={Boolean(errors.pinCode)}
          aria-describedby="order-pinCode-desc"
          className="field max-w-[12rem] tabular-nums"
        />
      </Field>
      <FormStatus status={formError ? { ok: false, message: formError } : null} />
      <button type="submit" disabled={pending} className="btn btn-outline w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <WhatsAppIcon className="size-4" />}
        {pending ? "Preparing your message…" : "Review order for WhatsApp"}
      </button>
    </form>
  );
}
