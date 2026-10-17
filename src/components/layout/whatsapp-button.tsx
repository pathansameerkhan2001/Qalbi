"use client";

import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@/lib/utils";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with QALBI on WhatsApp"
      title="Chat with QALBI on WhatsApp"
      onClick={() => track({ name: "whatsapp_clicked", params: { location: "floating-button" } })}
      className="fixed right-4 z-30 inline-flex size-12 items-center justify-center rounded-full border border-gold-soft/40 bg-forest text-ivory shadow-lift transition hover:bg-botanical sm:right-6 sm:size-[3.25rem]"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <WhatsAppIcon className="size-6" />
    </a>
  );
}
