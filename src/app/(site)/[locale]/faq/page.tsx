import StructuredData from "@/components/StructuredData";
import { FaqPageContent } from "@/features/faq/components/FaqPageContent";
import {
  FAQ_BREADCRUMB_LABEL,
  getFaqPageCopy,
  listFaqItems,
} from "@/features/faq/lib/faq";
import {
  createBreadcrumbStructuredData,
  createFaqPageStructuredData,
} from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import { getFaqPath, getLocalizedHomePath } from "@/lib/locale";
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
  const copy = getFaqPageCopy(resolvedLocale);

  return createLocalizedPageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/faq",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized public FAQ page.
 */
export default async function LocalizedFaqPage({
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
              name: FAQ_BREADCRUMB_LABEL,
              path: getFaqPath(resolvedLocale),
            },
          ]),
          createFaqPageStructuredData(
            listFaqItems(resolvedLocale),
            resolvedLocale,
          ),
        ]}
      />
      <FaqPageContent locale={resolvedLocale} />
    </>
  );
}
