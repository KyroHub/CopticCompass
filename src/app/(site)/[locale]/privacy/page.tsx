import StructuredData from "@/components/StructuredData";
import { LegalDocumentPageClient } from "@/features/legal/components/LegalDocumentPageClient";
import { getPrivacyDocument } from "@/features/legal/lib/legalDocuments";
import { createBreadcrumbStructuredData } from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getLocalizedHomePath, getPrivacyPath } from "@/lib/locale";
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
  const document = getPrivacyDocument(resolvedLocale);

  return createLocalizedPageMetadata({
    title: document.title,
    description: document.description,
    path: "/privacy",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized privacy-policy page with breadcrumb structured data.
 */
export default async function LocalizedPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const document = getPrivacyDocument(resolvedLocale);

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
            path: getPrivacyPath(resolvedLocale),
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
