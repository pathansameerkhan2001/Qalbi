import { brandConfig } from "@/data/brand";
import { GarlandArt } from "@/components/ui/flowers";

/**
 * Runs while the page is being parsed, before the overlay below is painted:
 * a visitor sees the entrance once per browser session (sessionStorage), so
 * every later page and reload opens straight away. Without storage (private
 * modes that block it) it simply plays.
 */
const once = `try{var k="qalbi-entrance";if(sessionStorage.getItem(k))document.documentElement.setAttribute("data-entrance","seen");else sessionStorage.setItem(k,"1")}catch(e){}`;

/**
 * Floral entrance: on an ivory ground a small garland draws itself — stems,
 * then leaves, jasmine and a rose opening from its centre — around the brand
 * name, then the whole layer fades away into the page (about 2 s).
 *
 * CSS only (globals.css, “Florals”): the page underneath renders and loads
 * normally, the layer never takes clicks (pointer-events: none), and it is
 * removed from view by its own animation even if scripts never run. Reduced
 * motion: not shown. Hidden from assistive technology.
 */
export function FloralEntrance() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: once }} />
      <div aria-hidden className="floral-entrance">
        <div className="floral-entrance-inner">
          <GarlandArt className="w-[min(82vw,32rem)]" />
          <p className="floral-entrance-name font-serif text-[clamp(1.9rem,1.4rem+2vw,2.8rem)] leading-none tracking-[0.18em] text-forest">{brandConfig.shortName}</p>
          <p className="floral-entrance-tagline eyebrow mt-3 text-gold-deep">{brandConfig.tagline}</p>
        </div>
      </div>
    </>
  );
}
