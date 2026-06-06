import StructuredData from "@/components/StructuredData";
import { ContributorsPageClient } from "@/features/contributors/components/ContributorsPageClient";
import { createBreadcrumbStructuredData } from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getContributorsPath, getLocalizedHomePath } from "@/lib/locale";
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
    title: getTranslation(resolvedLocale, "contributors.seoTitle"),
    description: getTranslation(resolvedLocale, "contributors.description"),
    path: "/contributors",
    locale: resolvedLocale,
  });
}

export default async function ContributorsPage({
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
            name: getTranslation(
              resolvedLocale,
              "contributors.breadcrumbLabel",
            ),
            path: getContributorsPath(resolvedLocale),
          },
        ])}
      />
      <ContributorsPageClient />
    </>
  );
}
