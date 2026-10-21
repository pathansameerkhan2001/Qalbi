import { SiteChrome } from "@/components/layout/site-chrome";
import { NotFoundContent } from "@/components/layout/not-found-content";

/** Unmatched URLs: rendered outside the storefront layout, so it brings its own header and footer. */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
