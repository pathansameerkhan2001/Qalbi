import { z } from "zod";

/** Shared by the checkout form (browser) and placeOrderAction (server). The database re-validates too. */

export const paymentMethods = ["COD", "PHONE"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  PHONE: "Pay by UPI QR",
};

export const indianStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80, "Name is too long"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 -]{7,20}$/, "Please enter a valid mobile number")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Please enter a valid mobile number"),
  email: z.union([z.string().trim().toLowerCase().email("Please enter a valid email address").max(254), z.literal("")]).default(""),
  addressLine1: z.string().trim().min(5, "Please enter your house / street address").max(200, "Address is too long"),
  addressLine2: z.string().trim().max(200, "Address is too long").default(""),
  city: z.string().trim().min(2, "Please enter your city").max(80, "City is too long"),
  state: z.enum(indianStates, { message: "Please choose your state" }),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit PIN code"),
  notes: z.string().trim().max(500, "Please keep notes under 500 characters").default(""),
  paymentMethod: z.enum(paymentMethods, { message: "Please choose a payment option" }),
  idempotencyKey: z.uuid(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
