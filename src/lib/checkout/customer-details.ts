import { z } from "zod";

/**
 * Delivery details collected in the bag before the WhatsApp order handoff.
 * Shared by the bag form (browser, instant field messages) and the server
 * action that builds the message (validated again there). QALBI delivers in
 * India only, so the PIN code is the six-digit Indian format (no leading 0).
 */
export const customerDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your full name")
    .min(2, "Please enter your full name")
    .max(80, "Please keep your name under 80 characters")
    .transform((v) => v.replace(/\s+/g, " ")),
  address: z
    .string()
    .trim()
    .min(1, "Please enter your delivery address")
    .min(10, "Please enter your full delivery address (house, street, area, city)")
    .max(400, "Please keep the address under 400 characters")
    .transform((v) =>
      v
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join("\n"),
    ),
  pinCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().min(1, "Please enter your PIN code").regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit PIN code")),
});

export type CustomerDetailsInput = z.input<typeof customerDetailsSchema>;
export type CustomerDetails = z.output<typeof customerDetailsSchema>;
export type CustomerDetailsErrors = Partial<Record<keyof CustomerDetails, string>>;

/** First message per field, for showing under each input. */
export function customerDetailsErrors(error: z.ZodError): CustomerDetailsErrors {
  const errors: CustomerDetailsErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof CustomerDetails | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
