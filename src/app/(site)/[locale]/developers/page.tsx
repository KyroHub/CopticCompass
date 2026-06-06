import StructuredData from "@/components/StructuredData";
import { DevelopersPageClient } from "@/features/developers/components/DevelopersPageClient";
import { createBreadcrumbStructuredData } from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getDevelopersPath, getLocalizedHomePath } from "@/lib/locale";
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

  return createLocalizedPageMetadata({
    title: getTranslation(resolvedLocale, "developers.seoTitle"),
    description: getTranslation(resolvedLocale, "developers.description"),
    path: "/developers",
    locale: resolvedLocale,
  });
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return (
    <>
      <StructuredData
        data={createBreadcrumbStructuredData([
          {
            name: getTranslation(resolvedLocale, "nav.home"),
            path: getLocalizedHomePath(resolvedLocale),
          },
          {
            name: getTranslation(resolvedLocale, "developers.breadcrumbLabel"),
            path: getDevelopersPath(resolvedLocale),
          },
        ])}
      />
      <DevelopersPageClient />
    </>
  );
}
