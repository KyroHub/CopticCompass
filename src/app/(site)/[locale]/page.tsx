import StructuredData from "@/components/StructuredData";
import HomePageClient from "@/features/home/components/HomePageClient";
import { createWebSiteStructuredData } from "@/features/seo/lib/structuredData";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { siteConfig } from "@/lib/site";

import type { Metadata } from "next";

function buildHomeDescription(locale: "en" | "nl") {
  if (locale === "nl") {
    return siteConfig.dictionaryEntryCount
      ? `Verken Coptic Compass, een betrouwbaar digitaal Koptologieplatform voor lezen, onderzoek en Koptisch taalwerk. Bevat ${siteConfig.dictionaryEntryCount.toLocaleString()} doorzoekbare woordenboeklemma's, grammaticalessen, publicaties en begeleide tools.`
      : "Verken Coptic Compass, een betrouwbaar digitaal Koptologieplatform voor lezen, onderzoek en Koptisch taalwerk.";
  }

  return siteConfig.dictionaryEntryCount
    ? `Explore Coptic Compass, a trusted digital Coptology platform for reading, research, and Coptic language work. Includes ${siteConfig.dictionaryEntryCount.toLocaleString()} searchable dictionary entries, grammar lessons, publications, and guided tools.`
    : "Explore Coptic Compass, a trusted digital Coptology platform for reading, research, and Coptic language work.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return createLocalizedPageMetadata({
    title: "Coptic Compass",
    description: buildHomeDescription(resolvedLocale),
    path: "/",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized home page together with website structured data.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return (
    <>
      <StructuredData data={createWebSiteStructuredData(resolvedLocale)} />
      <HomePageClient />
    </>
  );
}
