import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · QALBI Admin" },
  robots: { index: false, follow: false },
};

/** Admin pages read the session on every request; they are never prerendered. */
export const instant = false;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-cream text-ink">{children}</div>;
}
