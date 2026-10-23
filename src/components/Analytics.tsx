"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/**
 * Vercel Analytics wrapper that never reports paste URLs. Paste IDs are
 * treated as private: the path itself should not leave the browser.
 */
export default function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        try {
          const path = new URL(event.url, window.location.origin).pathname;
          if (path === "/p" || path.startsWith("/p/")) {
            return null;
          }
        } catch {
          // Ignore malformed URLs and let Analytics handle the event.
        }
        return event;
      }}
    />
  );
}
