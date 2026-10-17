import Image from "next/image";
import { images } from "@/data/images";
import { Container } from "@/components/ui/container";
import { CustomEnquiryForm } from "@/components/forms/custom-enquiry-form";

export function CustomSkincareSection({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <section aria-labelledby="custom-heading" id="customised" className="py-10 sm:py-14">
      <Container>
        <div className="grid overflow-hidden rounded-[3px] border border-line bg-sand lg:grid-cols-[1fr_1.15fr]">
          <div className="grid sm:grid-cols-[0.9fr_1fr] lg:grid-cols-1 xl:grid-cols-[0.85fr_1fr]">
            <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-72 lg:aspect-[16/10] lg:min-h-0 xl:aspect-auto">
              <Image src={images.customised.src} alt={images.customised.alt} fill sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 45vw, (min-width: 640px) 45vw, 100vw" className="object-cover" preload={Heading === "h1"} />
            </div>
            <div className="flex flex-col justify-center px-5 py-7 sm:px-8 lg:py-8 xl:py-14 xl:pl-6">
              <p className="eyebrow mb-3">Customised Skincare</p>
              <Heading id="custom-heading" className="text-h2 text-ink">
                Make Your Skincare Personal
              </Heading>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">
                Tell us about your skin goals and we&apos;ll help you create a personalised skincare routine.
              </p>
            </div>
          </div>
          <div className="border-t border-line bg-ivory p-5 sm:p-8 lg:border-l lg:border-t-0">
            <CustomEnquiryForm idPrefix={Heading === "h1" ? "custom-page" : "custom-home"} />
          </div>
        </div>
      </Container>
    </section>
  );
}
