import Link from "next/link";
import { Leaf } from "lucide-react";
import { getAnnouncements } from "@/lib/store/content";

export async function AnnouncementBar() {
  const announcements = await getAnnouncements();
  if (announcements.length === 0) return null;
  return (
    <div className="bg-forest text-[0.7rem] tracking-wide text-ivory/90 sm:text-xs">
      <ul className="mx-auto flex h-8 max-w-[1320px] items-center justify-center gap-8 overflow-hidden px-4">
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
  );
}
