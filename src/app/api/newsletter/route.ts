import { newsletterSchema, type FormApiResponse } from "@/lib/validation/forms";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { deliverNewsletterSignup, deliveryStatus } from "@/lib/server/delivery";

const json = (body: FormApiResponse, status: number) => Response.json(body, { status });

export async function POST(request: Request) {
  if (!rateLimit(`newsletter:${clientIp(request)}`, 5, 10 * 60 * 1000).allowed) {
    return json({ ok: false, code: "rate-limited", message: "Too many attempts. Please try again later." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "validation", message: "Invalid request." }, 400);
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Please enter a valid email." }, 400);
  }
  if (parsed.data.company || parsed.data.elapsedMs < 1500) {
    return json({ ok: false, code: "spam", message: "We couldn't accept this submission." }, 400);
  }

  if (!deliveryStatus.newsletter) {
    return json(
      { ok: false, code: "not-configured", message: "Newsletter sign-up is not available yet. Follow us on Instagram for updates." },
      503,
    );
  }

  try {
    const saved = await deliverNewsletterSignup(parsed.data.email);
    if (!saved) {
      return json({ ok: false, code: "delivery-failed", message: "We couldn't save your subscription. Please try again." }, 502);
    }
  } catch {
    console.error("[newsletter] subscription delivery error");
    return json({ ok: false, code: "delivery-failed", message: "We couldn't save your subscription. Please try again." }, 502);
  }

  return json({ ok: true, message: "Thank you for subscribing to QALBI Naturals." }, 200);
}
