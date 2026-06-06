import StructuredData from "@/components/StructuredData";
import { AnalyticsConsentPreference } from "@/features/legal/components/AnalyticsConsentPreference";
import { LegalDocumentPageClient } from "@/features/legal/components/LegalDocumentPageClient";
import { getCookiesDocument } from "@/features/legal/lib/legalDocuments";
import { createBreadcrumbStructuredData } from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getCookiesPath, getLocalizedHomePath } from "@/lib/locale";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const document = getCookiesDocument(resolvedLocale);

  return createLocalizedPageMetadata({
    title: document.title,
    description: document.description,
    path: "/cookies",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized cookie-policy page with breadcrumb structured data.
 */
export default async function LocalizedCookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const document = getCookiesDocument(resolvedLocale);

  return (
    <>
      <StructuredData
        data={createBreadcrumbStructuredData([
          {
            name: getTranslation(resolvedLocale, "nav.home"),
            path: getLocalizedHomePath(resolvedLocale),
          },
          {
            name: document.title,
            path: getCookiesPath(resolvedLocale),
          },
        ])}
      />
      <LegalDocumentPageClient
        afterSections={<AnalyticsConsentPreference />}
        document={document}
        breadcrumbItems={[
          {
            label: getTranslation(resolvedLocale, "nav.home"),
            href: getLocalizedHomePath(resolvedLocale),
          },
          { label: document.title },
        ]}
      />
    </>
  );
}
