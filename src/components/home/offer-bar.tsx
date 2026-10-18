import { getSetting } from "@/lib/store/settings";
import { OfferBarView } from "./offer-bar-view";

/** Slim announcement bar directly after the hero, managed in /admin/offer-bar. */
export async function OfferBar() {
  const settings = await getSetting("offer_bar");
  if (!settings?.enabled) return null;
  return <OfferBarView messages={settings.messages} animate={settings.animate} />;
}
