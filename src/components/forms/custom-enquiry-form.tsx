"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
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
import { cn, whatsappLink } from "@/lib/utils";
import { Field, FormStatus } from "./field";
import { Honeypot } from "./honeypot";
import { useFormTimer } from "./use-form-timer";

/**
 * Summary used for WhatsApp / email hand-off. Ingredient sensitivities are
 * deliberately excluded so health-related details never end up in a URL.
 */
function summary(values: Partial<CustomEnquiryInput>) {
  return [
    "Hello QALBI Naturals, I would like to enquire about customised skincare.",
    values.name && `Name: ${values.name}`,
    values.category && `Preferred category: ${values.category}`,
    values.goal && `Skincare goal: ${values.goal}`,
    values.notes && `Notes: ${values.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function CustomEnquiryForm({ idPrefix = "custom" }: { idPrefix?: string }) {
  const elapsed = useFormTimer();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [fallback, setFallback] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomEnquiryInput, unknown, CustomEnquiry>({
    resolver: zodResolver(customEnquirySchema),
    defaultValues: { name: "", sensitivities: "", notes: "", contactPreference: "email", email: "", phone: "", company: "" },
  });

  const preference = useWatch({ control, name: "contactPreference" });
  const id = (name: string) => `${idPrefix}-${name}`;
  const describe = (name: string) => ({ "aria-describedby": `${id(name)}-desc` });

  const onSubmit = async (values: CustomEnquiry) => {
    setStatus(null);
    setFallback(false);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom-skincare", data: { ...values, elapsedMs: elapsed() } }),
      });
      const data = (await res.json()) as FormApiResponse;
      if (data.ok) {
        setStatus({ ok: true, message: data.message });
        track({ name: "custom_enquiry_submitted", params: { category: values.category } });
        reset();
        return;
      }
      if (data.code === "validation" && data.fieldErrors) {
        for (const [field, message] of Object.entries(data.fieldErrors)) {
          setError(field as keyof CustomEnquiryInput, { message });
        }
      }
      if (data.code === "not-configured" || data.code === "delivery-failed") setFallback(true);
      setStatus({ ok: false, message: data.message });
    } catch {
      setFallback(true);
      setStatus({ ok: false, message: "We couldn't send your enquiry. Please contact us by email or WhatsApp." });
    }
  };

  const handoffText = summary(getValues());

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-1" aria-describedby={id("intro")}>
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
              <input type="radio" value={value} className="size-4 accent-forest" {...register("contactPreference")} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-x-5 sm:grid-cols-2">
        {preference === "email" ? (
          <Field id={id("email")} label="Email Address" error={errors.email?.message}>
            <input id={id("email")} type="email" autoComplete="email" className="field" aria-invalid={errors.email ? true : undefined} {...describe("email")} {...register("email")} />
          </Field>
        ) : (
          <Field id={id("phone")} label={preference === "whatsapp" ? "WhatsApp Number" : "Phone Number"} error={errors.phone?.message}>
            <input id={id("phone")} type="tel" autoComplete="tel" className="field" placeholder="+91" aria-invalid={errors.phone ? true : undefined} {...describe("phone")} {...register("phone")} />
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full sm:flex-1">
          {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {isSubmitting ? "Sending…" : "Submit Enquiry"}
          {!isSubmitting && <ArrowRight className="size-4" aria-hidden />}
        </button>
        {preference === "whatsapp" && (
          <button
            type="button"
            className="btn btn-outline w-full sm:w-auto"
            onClick={handleSubmit((values) => {
              window.open(whatsappLink(summary(values)), "_blank", "noopener,noreferrer");
            })}
          >
            <WhatsAppIcon className="size-4" /> Continue on WhatsApp
          </button>
        )}
      </div>

      <div className="space-y-3 pt-3">
        <FormStatus status={status} />
        {fallback && (
          <div className={cn("flex flex-col gap-2 sm:flex-row")}>
            <a href={whatsappLink(handoffText)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <WhatsAppIcon className="size-4" /> WhatsApp {brandConfig.whatsappNumber}
            </a>
            <a
              href={`${brandConfig.emailUrl}?subject=${encodeURIComponent("Customised skincare enquiry")}&body=${encodeURIComponent(handoffText)}`}
              className="btn btn-outline btn-sm"
            >
              <Mail className="size-4" aria-hidden /> {brandConfig.email}
            </a>
          </div>
        )}
        <p id={id("intro")} className="text-xs leading-relaxed text-muted">
          Customised skincare requests depend on available formulations and require confirmation before purchase. Ingredient sensitivities are only sent to QALBI through this form and are never added to WhatsApp or email links.
        </p>
      </div>
    </form>
  );
}
