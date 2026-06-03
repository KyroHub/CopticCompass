import { getFaqPath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { redirectToPreferredLocale } from "@/lib/publicLocaleRedirects";

import type { Metadata } from "next";

export const metadata: Metadata = createNoIndexMetadata({
  title: "FAQ Redirect",
  description: "Redirects visitors to the primary localized FAQ route.",
});

/**
 * Redirects the legacy FAQ route to the preferred localized destination.
 */
export default async function LegacyFaqRedirectPage() {
  return redirectToPreferredLocale(getFaqPath);
}
