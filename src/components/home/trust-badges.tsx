import { getTrustBadges } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export async function TrustBadges() {
  const visibleTrustBadges = await getTrustBadges();
  if (visibleTrustBadges.length === 0) return null;
  return (
    <section aria-label="Why QALBI" className="py-4 sm:py-6">
      <Container>
        <ul
          className={cn(
            "grid grid-cols-2 gap-y-5 rounded-[3px] border-y border-line bg-ivory/50 px-2 py-5 sm:grid-cols-4 sm:divide-x sm:divide-line sm:py-6",
            visibleTrustBadges.length > 4 && "lg:grid-cols-6",
          )}
        >
          {visibleTrustBadges.map(({ id, icon: Icon, title, subtitle }) => (
            <li key={id} className="flex flex-col items-center gap-2 px-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-gold/50 text-gold">
                <Icon className="size-5" strokeWidth={1.3} aria-hidden />
              </span>
              <span className="text-[0.78rem] font-medium text-ink sm:text-[0.82rem]">{title}</span>
              <span className="-mt-1.5 text-[0.7rem] text-muted">{subtitle}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
