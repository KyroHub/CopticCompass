import StructuredData from "@/components/StructuredData";
import DictionaryPageClient from "@/features/dictionary/components/DictionaryPageClient";
import { createDictionaryPageStructuredData } from "@/features/seo/lib/structuredData";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { siteConfig } from "@/lib/site";

import type { Metadata } from "next";

function buildDictionaryDescription(locale: "en" | "nl") {
  if (locale === "nl") {
    return siteConfig.dictionaryEntryCount
      ? `Doorzoek ${siteConfig.dictionaryEntryCount.toLocaleString()} Koptische woordenboeklemma's op Koptisch, Nederlands of Grieks, met dialectvormen, grammaticale details en een ingebouwd virtueel toetsenbord.`
      : "Doorzoek het Koptische woordenboek op Koptisch, Nederlands of Grieks, met dialectvormen, grammaticale details en een ingebouwd virtueel toetsenbord.";
  }

  return siteConfig.dictionaryEntryCount
    ? `Search ${siteConfig.dictionaryEntryCount.toLocaleString()} Coptic-English dictionary entries by Coptic, English, or Greek, with dialect forms, grammatical detail, and a built-in virtual keyboard.`
    : "Search the Coptic-English dictionary by Coptic, English, or Greek, with dialect forms, grammatical detail, and a built-in virtual keyboard.";
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
        ? "Koptisch woordenboek"
        : "Coptic-English Dictionary",
    description: buildDictionaryDescription(resolvedLocale),
    path: "/dictionary",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized dictionary landing page with its structured data.
 */
export default async function DictionaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return (
    <>
      <StructuredData
        data={createDictionaryPageStructuredData(resolvedLocale)}
      />
      <DictionaryPageClient />
    </>
  );
}
