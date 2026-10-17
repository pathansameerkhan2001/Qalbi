import "server-only";
import { clientKey, createServerWriteClient, isServerWriteConfigured } from "@/lib/supabase/server";

/**
 * Stores a copy of a validated form submission via record_enquiry_checked()
 * (server key only, rate-limited in the database; visitors can never read
 * enquiries). Returns false when not configured, rate-limited or failed —
 * the caller then relies on email/webhook delivery.
 */
export async function recordEnquiry(
  kind: "custom-skincare" | "contact",
  name: string,
  email: string,
  phone: string,
  subject: string,
  details: Record<string, string>,
): Promise<boolean> {
  if (!isServerWriteConfigured()) return false;
  try {
    const { error } = await createServerWriteClient().rpc("record_enquiry_checked", {
      p_client: await clientKey(),
      p_kind: kind,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_subject: subject,
      p_details: details,
    });
    if (error) {
      // Never log submission contents. Rate limiting is expected, not a server fault.
      if (!error.message.startsWith("rate_limited")) console.error(`[enquiries] could not store ${kind} enquiry:`, error.code);
      return false;
    }
    return true;
  } catch {
    console.error(`[enquiries] could not store ${kind} enquiry`);
    return false;
  }
}
