import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { isVercelObservabilityEnabled } from "@/lib/vercelMonitoring";

/**
 * Mounts Vercel Analytics and Speed Insights only when the current runtime can
 * actually report production data.
 */
export function ObservabilityScripts() {
  if (!isVercelObservabilityEnabled()) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
