import type { Metadata } from "next";
import { ClipboardList, MessagesSquare, PackageCheck } from "lucide-react";
import { CustomSkincareSection } from "@/components/home/custom-skincare-section";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Customised Skincare",
  description: "Tell us about your skin goals and QALBI Naturals will help you create a personalised skincare routine.",
};

const steps = [
  { icon: ClipboardList, title: "Share your goals", text: "Tell us your preferred category, skin goals and any ingredient sensitivities." },
  { icon: MessagesSquare, title: "We get in touch", text: "We'll contact you by your preferred method to understand your needs." },
  { icon: PackageCheck, title: "Confirm before you buy", text: "Requests depend on available formulations and are confirmed before purchase." },
];

export default function CustomisedSkincarePage() {
  return (
    <>
      <CustomSkincareSection as="h1" />
      <section aria-labelledby="how-heading" className="pb-14">
        <Container>
          <h2 id="how-heading" className="mb-6 text-center text-h2 text-ink">How It Works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-[3px] border border-line bg-ivory p-6 text-center">
                <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <Icon className="size-5" strokeWidth={1.3} aria-hidden />
                </span>
                <p className="eyebrow text-[0.65rem]">Step {i + 1}</p>
                <h3 className="mt-1 font-serif text-xl text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
