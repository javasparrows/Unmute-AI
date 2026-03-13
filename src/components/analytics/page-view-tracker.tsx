"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Invisible client component that tracks page views.
 * Sends a beacon to the ingestion API on every pathname change.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastSentPath = useRef<string | null>(null);

  useEffect(() => {
    // Prevent duplicate sends (React strict-mode double-mount, etc.)
    if (pathname === lastSentPath.current) {
      return;
    }
    lastSentPath.current = pathname;

    const payload = JSON.stringify({ path: pathname });
    const url = "/api/analytics/pageviews";

    // Prefer sendBeacon for reliability on page unload; fall back to fetch
    const sent =
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));

    if (!sent) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently ignore tracking failures
      });
    }
  }, [pathname]);

  return null;
}
