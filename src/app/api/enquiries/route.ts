import { enquiryRequestSchema, type FormApiResponse } from "@/lib/validation/forms";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { deliverEnquiry, deliveryStatus } from "@/lib/server/delivery";
import { recordEnquiry } from "@/lib/server/record-enquiry";

const MIN_FILL_TIME_MS = 2500;

const json = (body: FormApiResponse, status: number, headers?: HeadersInit) => Response.json(body, { status, headers });

export async function POST(request: Request) {
  const limit = rateLimit(`enquiry:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(
      { ok: false, code: "rate-limited", message: "Too many enquiries in a short time. Please try again later." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "validation", message: "Invalid request." }, 400);
  }

  const parsed = enquiryRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1) ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return json({ ok: false, code: "validation", message: "Please check the highlighted fields.", fieldErrors }, 400);
  }

  const { type, data } = parsed.data;

  // Spam heuristics: honeypot filled or submitted implausibly fast.
  if (data.company || data.elapsedMs < MIN_FILL_TIME_MS) {
    return json({ ok: false, code: "spam", message: "We couldn't accept this submission. Please try again." }, 400);
  }

  // Keep a copy for the admin area (Supabase); counts as received even if email/webhook are not configured.
  const stored =
    type === "custom-skincare"
      ? await recordEnquiry("custom-skincare", data.name, data.email, data.phone, `Customised skincare — ${data.category}`, {
          Category: data.category,
          "Skincare goal": data.goal,
          "Ingredient sensitivities": data.sensitivities,
          Notes: data.notes,
          "Contact preference": data.contactPreference,
        })
      : await recordEnquiry("contact", data.name, data.email, "", data.subject, { Message: data.message });

  if (!deliveryStatus.enquiries && stored) {
    return json(
      {
        ok: true,
        message:
          type === "custom-skincare"
            ? "Thank you — your enquiry has been received. We'll get back to you using your preferred contact method."
            : "Thank you — your message has been received. We'll reply as soon as we can.",
      },
      200,
    );
  }

  if (!deliveryStatus.enquiries) {
    return json(
      {
        ok: false,
        code: "not-configured",
        message: "Online enquiries are not connected yet. Please reach us by email or WhatsApp.",
      },
      503,
    );
  }

  try {
    const delivered =
      type === "custom-skincare"
        ? await deliverEnquiry(
            "custom-skincare",
            `Customised skincare enquiry — ${data.category}`,
            {
              Name: data.name,
              Category: data.category,
              "Skincare goal": data.goal,
              "Ingredient sensitivities": data.sensitivities,
              Notes: data.notes,
              "Contact preference": data.contactPreference,
              Email: data.email,
              "Phone / WhatsApp": data.phone,
            },
            data.email || undefined,
          )
        : await deliverEnquiry(
            "contact",
            `Website message — ${data.subject}`,
            { Name: data.name, Email: data.email, Subject: data.subject, Message: data.message },
            data.email,
          );

    if (!delivered && !stored) {
      return json({ ok: false, code: "delivery-failed", message: "We couldn't send your message. Please try email or WhatsApp." }, 502);
    }
  } catch {
    // Do not log submission contents.
    console.error(`[enquiries] delivery error for ${type}`);
    return json({ ok: false, code: "delivery-failed", message: "We couldn't send your message. Please try email or WhatsApp." }, 502);
  }

  return json(
    {
      ok: true,
      message:
        type === "custom-skincare"
          ? "Thank you — your enquiry has been sent. We'll get back to you using your preferred contact method."
          : "Thank you — your message has been sent. We'll reply as soon as we can.",
    },
    200,
  );
}
