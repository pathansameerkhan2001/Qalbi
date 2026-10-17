import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Stores a copy of a validated form submission via the record_enquiry()
 * database function (visitors can insert through it but never read enquiries).
 * Returns false when Supabase is not configured or the call fails.
 */
export async function recordEnquiry(
  kind: "custom-skincare" | "contact",
  name: string,
  email: string,
  phone: string,
  subject: string,
  details: Record<string, string>,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await createPublicClient().rpc("record_enquiry", {
      p_kind: kind,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_subject: subject,
      p_details: details,
    });
    if (error) {
      // Never log submission contents.
      console.error(`[enquiries] could not store ${kind} enquiry:`, error.code);
      return false;
    }
    return true;
  } catch {
    console.error(`[enquiries] could not store ${kind} enquiry`);
    return false;
  }
}
