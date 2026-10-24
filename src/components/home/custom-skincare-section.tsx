import Image from "next/image";
import { images } from "@/data/images";
import { Container } from "@/components/ui/container";
import { CustomEnquiryForm } from "@/components/forms/custom-enquiry-form";
import { enquiriesOnline } from "@/lib/server/record-enquiry";

export function CustomSkincareSection({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <section aria-labelledby="custom-heading" id="customised" className="py-10 sm:py-14">
      <Container>
        <div className="grid overflow-hidden rounded-2xl border border-gold-soft/35 bg-sand shadow-soft lg:grid-cols-[1fr_1.15fr]">
          {/* Image above the introduction; on desktop the image grows to match the form's height. */}
          <div className="grid sm:grid-cols-[0.9fr_1fr] lg:flex lg:flex-col">
            <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-72 lg:min-h-[20rem] lg:flex-1">
              <Image src={images.customised.src} alt={images.customised.alt} fill sizes="(min-width: 1320px) 600px, (min-width: 1024px) 46vw, (min-width: 640px) 45vw, 100vw" className="object-cover object-[50%_60%]" preload={Heading === "h1"} />
            </div>
            <div className="flex flex-col justify-center px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
              <p className="eyebrow mb-3">Customised Skincare</p>
              <Heading id="custom-heading" className="text-h2 text-forest">
                Make Your Skincare Personal
              </Heading>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/75">
                Tell us about your skin goals and we&apos;ll help you create a personalised skincare routine.
              </p>
            </div>
          </div>
          <div className="border-t border-line bg-ivory p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <CustomEnquiryForm idPrefix={Heading === "h1" ? "custom-page" : "custom-home"} online={enquiriesOnline()} />
          </div>
        </div>
      </Container>
    </section>
  );
}
