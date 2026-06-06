import { notFound } from "next/navigation";

import { PageShell, pageShellAccents } from "@/components/PageShell";
import StructuredData from "@/components/StructuredData";
import EntryPageClient from "@/features/dictionary/components/EntryPageClient";
import EntryPageHeader from "@/features/dictionary/components/EntryPageHeader";
import {
  getDictionaryEntryById,
  toDictionaryClientEntry,
} from "@/features/dictionary/lib/dictionary";
import { buildEntryOpenGraphImageUrl } from "@/features/dictionary/lib/entryOpenGraph";
import { buildEntryPreview } from "@/features/dictionary/lib/entryPreview";
import { listPublishedGrammarLessonsForEntry } from "@/features/grammar/lib/grammarContentGraph";
import {
  createBreadcrumbStructuredData,
  createDefinedTermStructuredData,
} from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import {
  createLanguageAlternates,
  getDictionaryPath,
  getEntryPath,
  getLocalizedHomePath,
} from "@/lib/locale";
import { createPageSocialMetadata, createSocialImage } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { siteConfig } from "@/lib/site";

import type { Metadata } from "next";

/**
 * Render dictionary entries on demand so build output stays within deployment
 * limits while entry metadata remains stable and crawlable.
 */
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvePublicLocale(resolvedParams.locale);
  const entry = getDictionaryEntryById(resolvedParams.id);

  if (!entry) {
    return {
      title: locale === "nl" ? "Lemma niet gevonden" : "Entry Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const preview = buildEntryPreview({
    entry,
    language: locale,
  });
  const headword = preview.heading;
  const title =
    locale === "nl"
      ? `${headword} (${preview.partOfSpeechLabel}) - Koptisch woordenboek`
      : `${headword} (${preview.partOfSpeechLabel}) - Coptic Dictionary`;
  const description = preview.description;
  const path = getEntryPath(entry.id, locale);
  const imageUrl = buildEntryOpenGraphImageUrl(entry.id, locale);
  const image = createSocialImage(
    imageUrl,
    locale === "nl"
      ? `${headword} | ${siteConfig.brandName} woordenboeklemma`
      : `${headword} | ${siteConfig.brandName} dictionary entry`,
  );

  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title,
    description,
    alternates: {
      canonical: path,
      languages: createLanguageAlternates(`/entry/${entry.id}`),
    },
    ...createPageSocialMetadata({
      title,
      description,
      path,
      locale,
      images: [image],
    }),
  };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvePublicLocale(resolvedParams.locale);
  const entry = getDictionaryEntryById(resolvedParams.id);

  if (!entry) {
    notFound();
  }

  const preview = buildEntryPreview({
    entry,
    language: locale,
  });
  const headword = preview.heading;
  const description = preview.description;
  const relationTargetEntries =
    entry.relations?.flatMap((relation) => {
      const targetEntry = getDictionaryEntryById(relation.targetId);

      return targetEntry ? ([[targetEntry.id, targetEntry]] as const) : [];
    }) ?? [];
  const displayEntry = toDictionaryClientEntry(
    entry,
    new Map(relationTargetEntries),
  );
  const relatedGrammarLessons = listPublishedGrammarLessonsForEntry(
    String(entry.id),
  );

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashOffset,
      ]}
    >
      <StructuredData
        data={[
          createBreadcrumbStructuredData([
            {
              name: getTranslation(locale, "nav.home"),
              path: getLocalizedHomePath(locale),
            },
            {
              name: getTranslation(locale, "nav.dictionary"),
              path: getDictionaryPath(locale),
            },
            { name: headword, path: getEntryPath(entry.id, locale) },
          ]),
          createDefinedTermStructuredData(entry, locale, {
            description,
            name: headword,
          }),
        ]}
      />

      <EntryPageHeader entryLabel={headword} />
      <EntryPageClient
        initialEntry={displayEntry}
        relatedGrammarLessons={relatedGrammarLessons}
      />
    </PageShell>
  );
}
