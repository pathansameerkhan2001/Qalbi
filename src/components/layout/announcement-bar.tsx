import Link from "next/link";
import { Leaf } from "lucide-react";
import { getAnnouncements } from "@/lib/store/content";
import { getCommerceSource } from "@/lib/shopify";

/**
 * Shown only while the preview catalogue (src/data/dev-products.ts) is active:
 * its prices are not confirmed and nothing can be ordered, so visitors are told.
 */
function PreviewNotice() {
  return (
    <p role="note" className="bg-gold-pale px-4 py-1.5 text-center text-[0.72rem] text-ink sm:text-xs">
      Store preview — prices shown are not yet confirmed and online ordering is not open.{" "}
      <Link href="/contact" className="font-medium text-forest underline underline-offset-2">
        Contact us
      </Link>
    </p>
  );
}

export async function AnnouncementBar() {
  const preview = getCommerceSource() === "development-fixtures";
  const announcements = await getAnnouncements();
  if (announcements.length === 0) return preview ? <PreviewNotice /> : null;
  return (
    <>
      {preview && <PreviewNotice />}
      <div className="relative overflow-hidden bg-forest text-[0.7rem] tracking-wide text-ivory/90 sm:text-xs">
        <ul className="relative mx-auto flex h-8 max-w-[1320px] items-center justify-center gap-8 overflow-hidden px-4">
          {announcements.map((message, index) => (
            <li key={message.id} className={index > 0 ? "hidden md:flex" : "flex"}>
              <Leaf aria-hidden className="mr-2 size-3 text-gold-soft" />
              {message.href ? (
                <Link href={message.href} className="hover:text-gold-pale">
                  {message.text}
                </Link>
              ) : (
                <span>{message.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
