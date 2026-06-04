import { getCookiesPath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { redirectToPreferredLocale } from "@/lib/publicLocaleRedirects";

import type { Metadata } from "next";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Cookie Policy Redirect",
  description:
    "Redirects visitors to the primary localized cookie policy route.",
});

/**
 * Redirects the legacy cookie-policy route to the preferred localized destination.
 */
export default async function LegacyCookiesRedirectPage() {
  return redirectToPreferredLocale(getCookiesPath);
}
