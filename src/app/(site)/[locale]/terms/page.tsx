import StructuredData from "@/components/StructuredData";
import { LegalDocumentPageClient } from "@/features/legal/components/LegalDocumentPageClient";
import { getTermsDocument } from "@/features/legal/lib/legalDocuments";
import { createBreadcrumbStructuredData } from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getLocalizedHomePath, getTermsPath } from "@/lib/locale";
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
  const document = getTermsDocument(resolvedLocale);

  return createLocalizedPageMetadata({
    title: document.title,
    description: document.description,
    path: "/terms",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized terms-of-service page with breadcrumb structured data.
 */
export default async function LocalizedTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const document = getTermsDocument(resolvedLocale);

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
            path: getTermsPath(resolvedLocale),
          },
        ])}
      />
      <LegalDocumentPageClient
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
