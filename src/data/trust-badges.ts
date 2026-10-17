import { FlaskConical, HandHeart, Leaf, MessageCircle, Rabbit, ShieldCheck, Sparkles, Droplets } from "lucide-react";
import type { TrustBadge } from "@/types/content";

/**
 * Trust strip.
 *
 * Certification and formulation claims (`isClaim: true`) are hidden until
 * QALBI confirms them with documentation — flip `verified` to `true` only then.
 * Non-claim badges describe services the site genuinely provides.
 */
export const trustBadges: TrustBadge[] = [
  { id: "halal", title: "Halal Certified", subtitle: "Where applicable", icon: ShieldCheck, isClaim: true, verified: false },
  { id: "paraben-free", title: "Paraben-Free", subtitle: "Clean formulations", icon: Droplets, isClaim: true, verified: false },
  { id: "sulfate-free", title: "Sulfate-Free", subtitle: "Gentle on skin", icon: Leaf, isClaim: true, verified: false },
  { id: "cruelty-free", title: "Cruelty-Free", subtitle: "Never tested on animals", icon: Rabbit, isClaim: true, verified: false },
  {
    id: "transparency",
    title: "Ingredient Transparency",
    subtitle: "Know what's inside",
    icon: FlaskConical,
    isClaim: false,
    verified: true,
  },
  { id: "crafted", title: "Thoughtfully Crafted", subtitle: "Considered rituals", icon: Sparkles, isClaim: false, verified: true },
  {
    id: "personalised",
    title: "Customised Skincare",
    subtitle: "Made to your needs",
    icon: HandHeart,
    isClaim: false,
    verified: true,
  },
  {
    id: "support",
    title: "Personal Support",
    subtitle: "Chat on WhatsApp",
    icon: MessageCircle,
    isClaim: false,
    verified: true,
  },
];

export const visibleTrustBadges = trustBadges.filter((badge) => !badge.isClaim || badge.verified);
