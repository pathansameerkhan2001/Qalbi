"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { newsletterSchema, type FormApiResponse, type NewsletterInput } from "@/lib/validation/forms";
import { track } from "@/lib/analytics";
import { Honeypot } from "./honeypot";
import { useFormTimer } from "./use-form-timer";

export function NewsletterForm() {
  const elapsed = useFormTimer();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "", company: "" } });

  const onSubmit = async (values: NewsletterInput) => {
    setStatus(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, elapsedMs: elapsed() }),
      });
      const data = (await res.json()) as FormApiResponse;
      setStatus({ ok: data.ok, message: data.message });
      if (data.ok) {
        reset();
        track({ name: "newsletter_signup", params: { location: "footer" } });
      }
    } catch {
      setStatus({ ok: false, message: "Something went wrong. Please check your connection and try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative">
      <Honeypot registration={register("company")} />
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex">
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby="newsletter-feedback"
          {...register("email")}
          className="min-h-11 min-w-0 flex-1 rounded-l-[3px] border border-ivory/25 bg-ivory px-4 text-sm text-ink placeholder:text-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-12 items-center justify-center rounded-r-[3px] bg-forest-deep text-ivory ring-1 ring-ivory/25 transition hover:bg-botanical disabled:opacity-60"
          aria-label="Subscribe to the newsletter"
        >
          {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
        </button>
      </div>
      <p id="newsletter-feedback" role="status" className="mt-2 min-h-5 text-xs">
        {errors.email ? (
          <span className="text-[#f2c4b8]">{errors.email.message}</span>
        ) : status ? (
          <span className={status.ok ? "text-gold-pale" : "text-[#f2c4b8]"}>{status.message}</span>
        ) : (
          <span className="text-ivory/60">Occasional updates only. Unsubscribe anytime.</span>
        )}
      </p>
    </form>
  );
}
