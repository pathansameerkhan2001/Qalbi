import "server-only";

/**
 * Delivery providers for form submissions.
 *
 * - Email via Resend (RESEND_API_KEY + FORMS_FROM_EMAIL, delivered to FORMS_TO_EMAIL)
 * - Generic HTTPS webhook (e.g. a CRM, Zapier, Make or Google Apps Script endpoint)
 *
 * A submission is reported as delivered only if at least one configured
 * provider accepted it.
 */

const resendKey = process.env.RESEND_API_KEY ?? "";
const fromEmail = process.env.FORMS_FROM_EMAIL ?? "";
const toEmail = process.env.FORMS_TO_EMAIL || "qalbinaturals@gmail.com";
const enquiryWebhook = process.env.ENQUIRY_WEBHOOK_URL ?? "";
const newsletterWebhook = process.env.NEWSLETTER_WEBHOOK_URL ?? "";
const webhookSecret = process.env.FORMS_WEBHOOK_SECRET ?? "";

export const deliveryStatus = {
  enquiries: Boolean((resendKey && fromEmail) || enquiryWebhook),
  newsletter: Boolean(newsletterWebhook || (resendKey && fromEmail)),
};

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendEmail(subject: string, fields: Record<string, string>, replyTo?: string): Promise<boolean> {
  if (!resendKey || !fromEmail) return false;
  const rows = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#66695f;vertical-align:top">${escape(k)}</td><td style="padding:6px 12px;white-space:pre-wrap">${escape(v)}</td></tr>`)
    .join("");
  const text = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      reply_to: replyTo || undefined,
      html: `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows}</table>`,
      text,
    }),
  });
  return res.ok;
}

async function postWebhook(url: string, payload: unknown): Promise<boolean> {
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "X-Qalbi-Signature": webhookSecret } : {}),
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

async function settle(tasks: Promise<boolean>[]): Promise<boolean> {
  const results = await Promise.allSettled(tasks);
  return results.some((r) => r.status === "fulfilled" && r.value);
}

export async function deliverEnquiry(
  kind: "custom-skincare" | "contact",
  subject: string,
  fields: Record<string, string>,
  replyTo?: string,
): Promise<boolean> {
  return settle([
    sendEmail(subject, fields, replyTo),
    postWebhook(enquiryWebhook, { kind, submittedAt: new Date().toISOString(), fields }),
  ]);
}

export async function deliverNewsletterSignup(email: string): Promise<boolean> {
  if (newsletterWebhook) {
    return settle([postWebhook(newsletterWebhook, { email, source: "website", submittedAt: new Date().toISOString() })]);
  }
  return settle([sendEmail("New newsletter subscriber", { Email: email, Source: "Website footer" })]);
}
