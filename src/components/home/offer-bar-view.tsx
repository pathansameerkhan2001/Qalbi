import Link from "next/link";
import { Sparkle } from "lucide-react";
import { isExternalLink } from "@/lib/content/rules";
import { cn } from "@/lib/utils";

export interface OfferMessage {
  id: string;
  text: string;
  href?: string;
}

function Message({ message, hidden }: { message: OfferMessage; hidden?: boolean }) {
  const content = (
    <>
      <Sparkle aria-hidden className="size-3 shrink-0 text-gold" />
      <span>{message.text}</span>
    </>
  );
  const className = "inline-flex items-center gap-2 whitespace-nowrap";
  if (!message.href) return <span className={className}>{content}</span>;
  const linkClass = cn(className, "underline-offset-4 hover:underline focus-visible:underline");
  return isExternalLink(message.href) ? (
    <a href={message.href} target="_blank" rel="noopener noreferrer" className={linkClass} tabIndex={hidden ? -1 : undefined}>
      {content}
    </a>
  ) : (
    <Link href={message.href} className={linkClass} tabIndex={hidden ? -1 : undefined}>
      {content}
    </Link>
  );
}

/**
 * Presentational offer bar (also used for the admin preview). Static messages
 * wrap and centre; the optional scrolling variant duplicates the list for a
 * seamless loop, hides the copy from assistive technology, pauses on hover or
 * focus and is replaced by the static layout for reduced-motion visitors.
 */
export function OfferBarView({ messages, animate }: { messages: OfferMessage[]; animate: boolean }) {
  if (messages.length === 0) return null;
  const scrolling = animate && messages.length > 1;
  return (
    <aside aria-label="Offers and announcements" className="overflow-hidden border-y border-gold-soft/40 bg-gold-pale text-[0.78rem] tracking-wide text-ink sm:text-[0.82rem]">
      {scrolling ? (
        <div className="offer-marquee-viewport py-2.5">
          <ul className="offer-marquee flex w-max items-center">
            {[0, 1].map((copy) =>
              messages.map((m) => (
                <li key={`${copy}-${m.id}`} className="offer-marquee-item px-6" aria-hidden={copy === 1 || undefined} data-copy={copy}>
                  <Message message={m} hidden={copy === 1} />
                </li>
              )),
            )}
          </ul>
        </div>
      ) : (
        <ul className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-8 gap-y-1 px-4 py-2.5 text-center">
          {messages.map((m) => (
            <li key={m.id} className="max-w-full [&>*]:whitespace-normal">
              <Message message={m} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
