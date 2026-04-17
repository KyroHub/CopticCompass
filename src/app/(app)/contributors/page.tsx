import { getContributorsPath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { redirectToPreferredLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Contributors Redirect",
  description:
    "Redirects visitors to the primary localized contributors route.",
});

/**
 * Redirects the legacy contributors route to the preferred localized destination.
 */
export default async function LegacyContributorsRedirectPage() {
  return redirectToPreferredLocale(getContributorsPath);
}
