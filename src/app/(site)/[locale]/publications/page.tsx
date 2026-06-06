import StructuredData from "@/components/StructuredData";
import PublicationsPageClient from "@/features/publications/components/PublicationsPageClient";
import { publications } from "@/features/publications/lib/publications";
import {
  createBreadcrumbStructuredData,
  createPublicationsStructuredData,
} from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getLocalizedHomePath, getPublicationsPath } from "@/lib/locale";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

function buildPublicationsDescription(locale: "en" | "nl") {
  return locale === "nl"
    ? "Blader door boeken, naslagwerken en onderzoeksmaterialen binnen Coptic Compass, waaronder publicaties van Kyrillos Wannes over de Koptische taal en taalkunde."
    : "Browse books, reference works, and research materials on Coptic Compass, including publications by Kyrillos Wannes on Coptic language and linguistics.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return createLocalizedPageMetadata({
    title:
      resolvedLocale === "nl"
        ? "Koptische publicaties en onderzoek"
        : "Coptic Publications and Research",
    description: buildPublicationsDescription(resolvedLocale),
    path: "/publications",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized publications index with breadcrumb and catalog
 * structured data.
 */
export default async function PublicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return (
    <>
      <StructuredData
        data={[
          createBreadcrumbStructuredData([
            {
              name: getTranslation(resolvedLocale, "nav.home"),
              path: getLocalizedHomePath(resolvedLocale),
            },
            {
              name: getTranslation(resolvedLocale, "nav.publications"),
              path: getPublicationsPath(resolvedLocale),
            },
          ]),
          ...createPublicationsStructuredData(publications, resolvedLocale),
        ]}
      />
      <PublicationsPageClient />
    </>
  );
}
