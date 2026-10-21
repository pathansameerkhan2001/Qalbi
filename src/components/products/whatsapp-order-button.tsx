"use client";

import { orderRequestWhatsAppMessage, whatsappUrl, type WhatsAppRequestItem } from "@/lib/checkout/whatsapp";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

/**
 * Opens WhatsApp with a prefilled order request. Nothing is sent by the website:
 * the customer sees the message in WhatsApp, adds their name and address, and
 * decides whether to send it.
 */
export function WhatsAppOrderButton({
  digits,
  items,
  estimatedTotal,
  label = "Order on WhatsApp",
  className,
}: {
  digits: string;
  items: WhatsAppRequestItem[];
  estimatedTotal: string | null;
  label?: string;
  className?: string;
}) {
  if (!/^[1-9][0-9]{9,14}$/.test(digits) || items.length === 0) {
    return <p className="text-xs text-muted">WhatsApp ordering is unavailable: no business WhatsApp number is set in Store Settings.</p>;
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <a href={whatsappUrl(digits, orderRequestWhatsAppMessage(items, estimatedTotal))} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
        <WhatsAppIcon className="size-4" /> {label}
        <span className="sr-only"> (opens WhatsApp)</span>
      </a>
      <p className="text-xs leading-relaxed text-muted">Opens WhatsApp with the product details filled in. Add your name and delivery address, then send it yourself — we&apos;ll confirm the total and payment.</p>
    </div>
  );
}
