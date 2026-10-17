import { z } from "zod";

/** Shared between client (React Hook Form) and server (route handlers). */

export const productCategoryOptions = [
  "Serums",
  "Face Creams & Moisturisers",
  "Lip Care",
  "Face Wash & Cleansers",
  "Toners & Face Mists",
  "Face Masks & Exfoliators",
  "Eye Care",
  "Body Care",
  "Not sure yet",
] as const;

export const skincareGoalOptions = [
  "Hydration",
  "Brightness & radiance",
  "Even-looking tone",
  "Calming & comfort",
  "Oil balance",
  "Fine lines & firmness",
  "Gentle daily care",
  "Something else",
] as const;

export const contactPreferenceOptions = ["email", "whatsapp", "phone"] as const;

/** Anti-spam fields carried by every public form. */
const spamFields = {
  /** Honeypot: must stay empty. Hidden from people, often filled by bots. */
  company: z.string().max(0, "Invalid submission").optional().default(""),
  /** Milliseconds the form was open before submit. */
  elapsedMs: z.number().int().nonnegative().optional().default(0),
};

const nameField = z.string().trim().min(2, "Please enter your name").max(80, "Name is too long");
const emailField = z.string().trim().toLowerCase().email("Please enter a valid email address").max(254);
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone or WhatsApp number");

export const customEnquirySchema = z
  .object({
    name: nameField,
    category: z.enum(productCategoryOptions, { message: "Please choose a category" }),
    goal: z.enum(skincareGoalOptions, { message: "Please choose a skincare goal" }),
    sensitivities: z.string().trim().max(300, "Please keep this under 300 characters").optional().default(""),
    notes: z.string().trim().max(1000, "Please keep this under 1000 characters").optional().default(""),
    contactPreference: z.enum(contactPreferenceOptions),
    email: z.union([emailField, z.literal("")]).optional().default(""),
    phone: z.union([phoneField, z.literal("")]).optional().default(""),
    consent: z.literal(true, { message: "Please agree so we can respond to your enquiry" }),
    ...spamFields,
  })
  .superRefine((data, ctx) => {
    if (data.contactPreference === "email" && !data.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Please enter your email address" });
    }
    if (data.contactPreference !== "email" && !data.phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Please enter your phone or WhatsApp number" });
    }
  });

export const contactSchema = z.object({
  name: nameField,
  email: emailField,
  subject: z.string().trim().min(3, "Please add a subject").max(120, "Subject is too long"),
  message: z.string().trim().min(10, "Please write a little more").max(2000, "Please keep this under 2000 characters"),
  consent: z.literal(true, { message: "Please agree so we can reply to you" }),
  ...spamFields,
});

export const newsletterSchema = z.object({
  email: emailField,
  ...spamFields,
});

export const enquiryRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("custom-skincare"), data: customEnquirySchema }),
  z.object({ type: z.literal("contact"), data: contactSchema }),
]);

export type CustomEnquiryInput = z.input<typeof customEnquirySchema>;
export type CustomEnquiry = z.output<typeof customEnquirySchema>;
export type ContactInput = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;
export type NewsletterInput = z.input<typeof newsletterSchema>;

/** Response contract for /api/enquiries and /api/newsletter. */
export type FormApiResponse =
  | { ok: true; message: string }
  | { ok: false; code: "validation" | "not-configured" | "rate-limited" | "delivery-failed" | "spam"; message: string; fieldErrors?: Record<string, string> };
