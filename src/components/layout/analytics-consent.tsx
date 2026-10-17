"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { analyticsId, CONSENT_STORAGE_KEY } from "@/lib/analytics";

type Consent = "granted" | "denied" | null;

/**
 * Loads Google Analytics only when a measurement ID is configured AND the
 * visitor opts in. Renders nothing when analytics is not configured.
 */
export function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!analyticsId) return;
    let stored: Consent = null;
    try {
      const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      stored = value === "granted" || value === "denied" ? value : null;
    } catch {
      stored = null;
    }
    // Reading persisted browser state after mount avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored);
    setReady(true);
  }, []);

  if (!analyticsId || !ready) return null;

  const choose = (value: "granted" | "denied") => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      /* storage unavailable — choice applies to this visit only */
    }
    setConsent(value);
  };

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${analyticsId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === null && (
        <div role="region" aria-label="Analytics consent" className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-[3px] border border-line bg-ivory p-4 text-sm shadow-lift sm:bottom-6 sm:left-6 sm:right-auto">
          <p className="text-ink">
            May we use analytics cookies to understand how our website is used? No personal details are shared.{" "}
            <Link href="/policies/privacy-policy" className="underline underline-offset-4">Privacy policy</Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => choose("granted")}>Accept</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => choose("denied")}>Decline</button>
          </div>
        </div>
      )}
    </>
  );
}
