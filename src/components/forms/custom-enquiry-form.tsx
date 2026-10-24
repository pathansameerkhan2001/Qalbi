"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle, Mail, Phone } from "lucide-react";
import {
  customEnquirySchema,
  productCategoryOptions,
  skincareGoalOptions,
  type CustomEnquiry,
  type CustomEnquiryInput,
  type FormApiResponse,
} from "@/lib/validation/forms";
import { brandConfig } from "@/data/brand";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@/lib/utils";
import { Field, FormStatus } from "./field";
import { Honeypot } from "./honeypot";
import { useFormTimer } from "./use-form-timer";

type Status = { ok: boolean; message: string; info?: boolean } | null;

const CONSENT_LINE = "Consent: I agree that QALBI Naturals may use these details only to respond to my enquiry.";

/** The enquiry as the visitor will send it themselves (WhatsApp or email): every answer they gave, labelled. */
function enquiryMessage(v: CustomEnquiry, opening: string) {
  const contact =
    v.contactPreference === "email" ? `Email: ${v.email}` : `${v.contactPreference === "whatsapp" ? "WhatsApp" : "Phone"}: ${v.phone}`;
  return [
    opening,
    "",
    `Name: ${v.name}`,
    `Preferred product category: ${v.category}`,
    `Skincare goal: ${v.goal}`,
    v.sensitivities ? `Ingredient sensitivities: ${v.sensitivities}` : null,
    v.notes ? `Additional notes: ${v.notes}` : null,
    `Contact preference: ${v.contactPreference === "email" ? "Email" : v.contactPreference === "whatsapp" ? "WhatsApp" : "Phone call"}`,
    contact,
    "",
    CONSENT_LINE,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

const mailtoLink = (v: CustomEnquiry, opening: string) =>
  `${brandConfig.emailUrl}?subject=${encodeURIComponent(`Customised skincare enquiry — ${v.name}`)}&body=${encodeURIComponent(enquiryMessage(v, opening))}`;

const EMAIL_OPENING = "Hello QALBI Naturals, I would like to enquire about customised skincare.";
const WHATSAPP_OPENING = "Hello QALBI Naturals, I would like to enquire about customised skincare.";
const CALLBACK_OPENING = "Hello QALBI Naturals, I would like a call back about customised skincare.";

/**
 * Customised skincare enquiry. The contact preference decides what Submit does:
 *
 * - Email: with an enquiry backend (`online`), POST /api/enquiries; otherwise
 *   the prepared email is shown for review, then opened in the visitor's
 *   email app addressed to QALBI.
 * - WhatsApp: the prepared message is shown for review, then QALBI's chat
 *   opens with it — nothing is received until the visitor presses Send there.
 * - Phone: with a backend, a call-back request is stored / delivered;
 *   otherwise a review step offers a call to QALBI or the same enquiry by
 *   WhatsApp or email.
 *
 * No answer (ingredient sensitivities included) leaves the page in a link
 * before the visitor has seen the prepared message; links are opened by the
 * visitor's own click, so browsers never block them. Success is only
 * reported when the server confirms it, and a request in flight blocks a
 * second submit.
 */
export function CustomEnquiryForm({ idPrefix = "custom", online = false }: { idPrefix?: string; online?: boolean }) {
  const elapsed = useFormTimer();
  const [status, setStatus] = useState<Status>(null);
  const [callReview, setCallReview] = useState<CustomEnquiry | null>(null);
  const [sending, setSending] = useState(false);
  // Blocks a second POST before `sending` has re-rendered (e.g. a double click).
  const inFlight = useRef(false);
  // The prepared WhatsApp / email message, shown for review before anything is opened.
  const [review, setReview] = useState<{ values: CustomEnquiry; channel: "whatsapp" | "email" } | null>(null);
  const reviewHeading = useRef<HTMLParagraphElement>(null);
  const {
    register,
    control,
    reset,
    getValues,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<CustomEnquiryInput, unknown, CustomEnquiry>({
    resolver: zodResolver(customEnquirySchema),
    defaultValues: { name: "", sensitivities: "", notes: "", contactPreference: "email", email: "", phone: "", company: "" },
  });

  const preference = useWatch({ control, name: "contactPreference" });
  const id = (name: string) => `${idPrefix}-${name}`;
  const describe = (name: string) => ({ "aria-describedby": `${id(name)}-desc` });

  // Move focus to the review so keyboard and screen-reader users land on the prepared message.
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);

  async function post(values: CustomEnquiry) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom-skincare", data: { ...values, elapsedMs: elapsed() } }),
      });
      const data = (await res.json()) as FormApiResponse;
      if (data.ok) {
        setStatus({ ok: true, message: values.contactPreference === "phone" ? `Thank you — your call-back request has been received. We'll call you on ${values.phone}.` : data.message });
        track({ name: "custom_enquiry_submitted", params: { category: values.category } });
        reset();
        return;
      }
      if (data.code === "validation" && data.fieldErrors) {
        for (const [field, message] of Object.entries(data.fieldErrors)) setError(field as keyof CustomEnquiryInput, { message });
      }
      // The enquiry did not arrive: offer the same details by email / WhatsApp / phone.
      if (data.code === "not-configured" || data.code === "delivery-failed") setCallReview(values);
      setStatus({ ok: false, message: data.message });
    } catch {
      setCallReview(values);
      setStatus({ ok: false, message: "We couldn't send your enquiry. Please use one of the options below." });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setStatus(null);
    setCallReview(null);
    setReview(null);
    const parsed = customEnquirySchema.safeParse(getValues());
    if (!parsed.success) {
      // Show every message (and focus the first) without losing anything typed. The schema checks
      // the chosen contact field only once the rest is valid, so flag a missing one here too.
      const { contactPreference, email, phone } = getValues();
      void trigger(undefined, { shouldFocus: true }).then(() => {
        if (contactPreference === "email" && !email?.trim()) setError("email", { message: "Please enter your email address" });
        if (contactPreference !== "email" && !phone?.trim()) setError("phone", { message: "Please enter your phone or WhatsApp number" });
      });
      return;
    }
    clearErrors();
    const values = parsed.data;
    if (values.company) return; // honeypot

    if (values.contactPreference === "whatsapp") {
      setReview({ values, channel: "whatsapp" });
      return;
    }
    if (online) {
      void post(values);
      return;
    }
    if (values.contactPreference === "email") {
      setReview({ values, channel: "email" });
      return;
    }
    // Phone without a backend: nothing can be stored, so offer honest next steps.
    setCallReview(values);
  }

  const submitLabel =
    preference === "whatsapp" ? "Review WhatsApp Message" : preference === "phone" ? (online ? "Request a Call Back" : "Review & Contact QALBI") : online ? "Send Enquiry" : "Review Email";

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-1" aria-describedby={id("intro")}>
      <Honeypot registration={register("company")} />
      <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
        <Field id={id("category")} label="Preferred Product Category" error={errors.category?.message}>
          <select id={id("category")} defaultValue="" className="field" aria-invalid={errors.category ? true : undefined} {...describe("category")} {...register("category")}>
            <option value="" disabled>
              Select category
            </option>
            {productCategoryOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id={id("goal")} label="Your Skincare Goals" error={errors.goal?.message}>
          <select id={id("goal")} defaultValue="" className="field" aria-invalid={errors.goal ? true : undefined} {...describe("goal")} {...register("goal")}>
            <option value="" disabled>
              Select goal
            </option>
            {skincareGoalOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id={id("sensitivities")} label="Ingredient Sensitivities" optional error={errors.sensitivities?.message}>
          <input id={id("sensitivities")} className="field" placeholder="e.g. Fragrance, Essential Oils" {...describe("sensitivities")} {...register("sensitivities")} />
        </Field>
        <Field id={id("notes")} label="Additional Notes" optional error={errors.notes?.message} className="sm:row-span-2">
          <textarea id={id("notes")} rows={4} className="field min-h-[7.2rem] resize-y" placeholder="Tell us more about your requirements" {...describe("notes")} {...register("notes")} />
        </Field>
        <Field id={id("name")} label="Your Name" error={errors.name?.message}>
          <input id={id("name")} className="field" autoComplete="name" aria-invalid={errors.name ? true : undefined} {...describe("name")} {...register("name")} />
        </Field>
      </div>

      <fieldset className="pt-1">
        <legend className="label">Contact Preference</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              ["email", "Email"],
              ["whatsapp", "WhatsApp"],
              ["phone", "Phone"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                value={value}
                className="size-4 accent-forest"
                {...register("contactPreference", {
                  onChange: () => {
                    setStatus(null);
                    setCallReview(null);
                    setReview(null);
                  },
                })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-x-5 sm:grid-cols-2">
        {/* Keyed so switching swaps the input element itself: a reused <input> kept showing the other field's text. */}
        {preference === "email" ? (
          <Field key="email" id={id("email")} label="Email Address" error={errors.email?.message}>
            <input id={id("email")} type="email" autoComplete="email" className="field" aria-invalid={errors.email ? true : undefined} {...describe("email")} {...register("email")} />
          </Field>
        ) : (
          <Field key="phone" id={id("phone")} label={preference === "whatsapp" ? "WhatsApp Number" : "Phone Number"} error={errors.phone?.message}>
            <input id={id("phone")} type="tel" autoComplete="tel" inputMode="tel" className="field" placeholder="+91" aria-invalid={errors.phone ? true : undefined} {...describe("phone")} {...register("phone")} />
          </Field>
        )}
      </div>

      <label className="flex items-start gap-2.5 pb-3 text-xs leading-relaxed text-muted">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-forest" aria-invalid={errors.consent ? true : undefined} {...register("consent")} />
        <span>
          I agree that QALBI Naturals may use these details only to respond to my enquiry. Please don&apos;t share medical information beyond what&apos;s needed.
          {errors.consent && <span role="alert" className="mt-1 block text-danger">{errors.consent.message}</span>}
        </span>
      </label>

      <button type="submit" disabled={sending} aria-busy={sending || undefined} className="btn btn-primary w-full">
        {sending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          <>
            {preference === "whatsapp" && <WhatsAppIcon className="size-4" />}
            {submitLabel}
            {preference !== "whatsapp" && <ArrowRight className="size-4" aria-hidden />}
          </>
        )}
      </button>

      <div className="space-y-3 pt-3">
        <FormStatus status={status} />
        {review && (
          <div className="rounded-[3px] border border-gold-soft/50 bg-sand p-4 text-sm text-ink" role="region" aria-label="Review your message">
            <p ref={reviewHeading} tabIndex={-1} className="font-medium text-forest outline-none">
              Review your {review.channel === "whatsapp" ? "WhatsApp message" : "email"} — nothing has been sent yet
            </p>
            <p className="mt-1 text-xs text-muted">
              {review.channel === "whatsapp" ? `It opens in WhatsApp addressed to QALBI Naturals (${brandConfig.whatsappNumber}). We receive it only once you press Send there.` : `It opens in your email app addressed to ${brandConfig.email}. We receive it only once you press Send there.`}
            </p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-[3px] border border-line bg-ivory p-3 font-sans text-xs leading-relaxed text-ink" aria-label="Prepared message">
              {enquiryMessage(review.values, review.channel === "whatsapp" ? WHATSAPP_OPENING : EMAIL_OPENING)}
            </pre>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {review.channel === "whatsapp" ? (
                <a href={whatsappLink(enquiryMessage(review.values, WHATSAPP_OPENING))} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <WhatsAppIcon className="size-4" /> Open WhatsApp to send
                </a>
              ) : (
                <a href={mailtoLink(review.values, EMAIL_OPENING)} className="btn btn-primary btn-sm">
                  <Mail className="size-4" aria-hidden /> Open email to send
                </a>
              )}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setReview(null)}>
                Edit enquiry
              </button>
            </div>
            {review.channel === "email" && <p className="mt-2 text-xs text-muted">No email app? Write to {brandConfig.email} and paste the message above.</p>}
          </div>
        )}
        {callReview && (
          <div className="rounded-[3px] border border-gold-soft/50 bg-sand p-4 text-sm text-ink" role="region" aria-label="Your enquiry and how to send it">
            <p className="font-medium text-forest">{status ? "Send the same enquiry another way" : "Your call-back enquiry is ready — nothing has been sent yet"}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted">
              <dt>Name</dt>
              <dd className="text-ink">{callReview.name}</dd>
              <dt>Category</dt>
              <dd className="text-ink">{callReview.category}</dd>
              <dt>Goal</dt>
              <dd className="text-ink">{callReview.goal}</dd>
              {callReview.phone && (
                <>
                  <dt>Your number</dt>
                  <dd className="text-ink">{callReview.phone}</dd>
                </>
              )}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Call QALBI Naturals now, or send these details by WhatsApp or email so we can call you back on your number.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a href={brandConfig.phoneUrl} className="btn btn-primary btn-sm">
                <Phone className="size-4" aria-hidden /> Call {brandConfig.whatsappNumber}
              </a>
              <a href={whatsappLink(enquiryMessage(callReview, callReview.contactPreference === "phone" ? CALLBACK_OPENING : WHATSAPP_OPENING))} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                <WhatsAppIcon className="size-4" /> Send on WhatsApp
              </a>
              <a href={mailtoLink(callReview, callReview.contactPreference === "phone" ? CALLBACK_OPENING : EMAIL_OPENING)} className="btn btn-outline btn-sm">
                <Mail className="size-4" aria-hidden /> Send by email
              </a>
            </div>
          </div>
        )}
        <p id={id("intro")} className="text-xs leading-relaxed text-muted">
          Customised skincare requests depend on available formulations and require confirmation before purchase. When you choose WhatsApp or email, your answers are shown here as a message for you to review first; nothing is shared until you open it and press Send.
        </p>
      </div>
    </form>
  );
}
