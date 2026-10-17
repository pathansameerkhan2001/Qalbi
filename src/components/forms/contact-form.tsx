"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { contactSchema, type ContactInput, type ContactMessage, type FormApiResponse } from "@/lib/validation/forms";
import { brandConfig } from "@/data/brand";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@/lib/utils";
import { Field, FormStatus } from "./field";
import { Honeypot } from "./honeypot";
import { useFormTimer } from "./use-form-timer";

export function ContactForm() {
  const elapsed = useFormTimer();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [fallback, setFallback] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput, unknown, ContactMessage>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", company: "" },
  });

  const describe = (name: string) => ({ "aria-describedby": `contact-${name}-desc` });

  const onSubmit = async (values: ContactMessage) => {
    setStatus(null);
    setFallback(false);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact", data: { ...values, elapsedMs: elapsed() } }),
      });
      const data = (await res.json()) as FormApiResponse;
      if (data.ok) {
        setStatus({ ok: true, message: data.message });
        track({ name: "contact_submitted", params: {} });
        reset();
        return;
      }
      if (data.code === "validation" && data.fieldErrors) {
        for (const [field, message] of Object.entries(data.fieldErrors)) setError(field as keyof ContactInput, { message });
      }
      if (data.code === "not-configured" || data.code === "delivery-failed") setFallback(true);
      setStatus({ ok: false, message: data.message });
    } catch {
      setFallback(true);
      setStatus({ ok: false, message: "We couldn't send your message. Please contact us by email or WhatsApp." });
    }
  };

  const v = getValues();
  const mailto = `${brandConfig.emailUrl}?subject=${encodeURIComponent(v.subject || "Website enquiry")}&body=${encodeURIComponent(v.message || "")}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-1">
      <Honeypot registration={register("company")} />
      <div className="grid gap-x-5 sm:grid-cols-2">
        <Field id="contact-name" label="Name" error={errors.name?.message}>
          <input id="contact-name" autoComplete="name" className="field" aria-invalid={errors.name ? true : undefined} {...describe("name")} {...register("name")} />
        </Field>
        <Field id="contact-email" label="Email" error={errors.email?.message}>
          <input id="contact-email" type="email" autoComplete="email" className="field" aria-invalid={errors.email ? true : undefined} {...describe("email")} {...register("email")} />
        </Field>
      </div>
      <Field id="contact-subject" label="Subject" error={errors.subject?.message}>
        <input id="contact-subject" className="field" aria-invalid={errors.subject ? true : undefined} {...describe("subject")} {...register("subject")} />
      </Field>
      <Field id="contact-message" label="Message" error={errors.message?.message}>
        <textarea id="contact-message" rows={5} className="field resize-y" aria-invalid={errors.message ? true : undefined} {...describe("message")} {...register("message")} />
      </Field>
      <label className="flex items-start gap-2.5 pb-3 text-xs leading-relaxed text-muted">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-forest" aria-invalid={errors.consent ? true : undefined} {...register("consent")} />
        <span>
          I agree that QALBI Naturals may use these details only to reply to my message.
          {errors.consent && <span role="alert" className="mt-1 block text-danger">{errors.consent.message}</span>}
        </span>
      </label>
      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full sm:w-auto">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
        {isSubmitting ? "Sending…" : "Send Message"}
        {!isSubmitting && <ArrowRight className="size-4" aria-hidden />}
      </button>
      <div className="space-y-3 pt-4">
        <FormStatus status={status} />
        {fallback && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={mailto} className="btn btn-outline btn-sm">
              <Mail className="size-4" aria-hidden /> Email {brandConfig.email}
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <WhatsAppIcon className="size-4" /> WhatsApp us
            </a>
          </div>
        )}
      </div>
    </form>
  );
}
