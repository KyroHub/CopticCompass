import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  getDictionaryEntryById,
  getDictionaryEntryRelations,
} from "@/features/dictionary/lib/dictionary";
import { buildEntryOpenGraphPreview } from "@/features/dictionary/lib/entryOpenGraph";
import {
  getPublishedGrammarLessonBundleBySlug,
  listPublishedGrammarLessons,
} from "@/features/grammar/lib/grammarDataset";
import { buildLessonOpenGraphPreview } from "@/features/grammar/lib/lessonOpenGraph";
import { buildPublicationOpenGraphPreview } from "@/features/publications/lib/publicationOpenGraph";
import {
  getPublicationById,
  publications,
} from "@/features/publications/lib/publications";
import {
  getOpenGraphBrandLabel,
  getOpenGraphSectionFooter,
  normalizeOpenGraphCardType,
} from "@/features/seo/lib/openGraph";
import {
  renderEntryOpenGraphCard,
  renderLessonOpenGraphCard,
  renderPublicationOpenGraphCard,
  renderSiteOpenGraphCard,
} from "@/features/seo/lib/openGraphCards";
import { isPublicLocale } from "@/lib/locale";
import { siteConfig } from "@/lib/site";

const antinoouFontPromise = readFile(
  join(process.cwd(), "src/fonts/AntinoouFont-1.0.6/Antinoou.ttf"),
);

/**
 * Renders the generic site card used for the homepage and for unresolved Open
 * Graph resources.
 */
function renderGenericCard(locale: string) {
  const language = isPublicLocale(locale) ? locale : "en";

  return renderSiteOpenGraphCard({
    descriptor:
      language === "nl"
        ? "Koptisch woordenboek, grammatica, publicaties en Shenute AI"
        : siteConfig.descriptor,
    eyebrow:
      language === "nl"
        ? "Digitaal thuis voor Koptologie"
        : "Digital home for Coptology",
    footerLabel: getOpenGraphSectionFooter("site", language),
    stats: [
      {
        label: language === "nl" ? "Woordenboek" : "Dictionary",
        value:
          language === "nl"
            ? `${siteConfig.dictionaryEntryCount.toLocaleString("nl-BE")} lemma's`
            : `${siteConfig.dictionaryEntryCount.toLocaleString("en-US")} entries`,
      },
      {
        label: language === "nl" ? "Grammatica" : "Grammar",
        value:
          language === "nl"
            ? `${listPublishedGrammarLessons().length.toLocaleString("nl-BE")} gepubliceerde lessen`
            : `${listPublishedGrammarLessons().length.toLocaleString("en-US")} published lessons`,
      },
      {
        label: language === "nl" ? "Publicaties" : "Publications",
        value:
          language === "nl"
            ? `${publications.length.toLocaleString("nl-BE")} titels`
            : `${publications.length.toLocaleString("en-US")} titles`,
      },
    ],
    summary:
      language === "nl"
        ? "Doorzoek het woordenboek, volg grammaticallessen en verken publicaties in een rustige Koptische werkruimte."
        : "Search the dictionary, follow grammar lessons, and browse publications in one calm Coptic workspace.",
    title: getOpenGraphBrandLabel(language),
  });
}

/**
 * Renders a dictionary-entry card and falls back to the generic site card when
 * the requested entry id cannot be resolved.
 */
function renderEntryCard(id: string, locale: string) {
  const language = isPublicLocale(locale) ? locale : "en";
  const entry = getDictionaryEntryById(id);

  if (!entry) {
    return renderGenericCard(locale);
  }

  const { parentEntry, relatedEntries } = getDictionaryEntryRelations(entry);
  const preview = buildEntryOpenGraphPreview({
    entry,
    language,
    parentEntry,
    relatedEntries,
  });
  const footerLabel = getOpenGraphSectionFooter("dictionary", language);
  const relatedLabel = language === "nl" ? "Verwante vormen" : "Related forms";
  const partOfSpeechLabel = language === "nl" ? "Woordsoort" : "Part of speech";

  return renderEntryOpenGraphCard({
    footerLabel,
    gloss: preview.gloss,
    heading: preview.heading,
    partOfSpeech: entry.pos,
    partOfSpeechLabel,
    relatedForms: preview.relatedForms,
    relatedLabel,
    strapline: preview.strapline,
  });
}

/**
 * Renders a grammar-lesson card and falls back to the generic site card when
 * the lesson slug is unknown.
 */
function renderLessonCard(slug: string, locale: string) {
  const language = isPublicLocale(locale) ? locale : "en";
  const lessonBundle = getPublishedGrammarLessonBundleBySlug(slug);

  if (!lessonBundle) {
    return renderGenericCard(locale);
  }

  const preview = buildLessonOpenGraphPreview(lessonBundle, language);

  return renderLessonOpenGraphCard(preview);
}

/**
 * Renders a publication card and falls back to the generic site card when the
 * publication id is unknown.
 */
function renderPublicationCard(id: string, locale: string) {
  const language = isPublicLocale(locale) ? locale : "en";
  const publication = getPublicationById(id);

  if (!publication) {
    return renderGenericCard(locale);
  }

  const preview = buildPublicationOpenGraphPreview(publication, language);
  return renderPublicationOpenGraphCard(preview);
}

/**
 * Generates the Open Graph image response for site, dictionary, grammar, and
 * publication previews based on the request query parameters.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = normalizeOpenGraphCardType(searchParams.get("type"));
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const locale = searchParams.get("locale") ?? "en";
  const antinoouFont = await antinoouFontPromise;
  let imageContent = renderGenericCard(locale);

  if (type === "entry" && id) {
    imageContent = renderEntryCard(id, locale);
  } else if (type === "lesson" && slug) {
    imageContent = renderLessonCard(slug, locale);
  } else if (type === "publication" && id) {
    imageContent = renderPublicationCard(id, locale);
  }

  return new ImageResponse(imageContent, {
    fonts: [
      {
        name: "Antinoou",
        data: antinoouFont,
        style: "normal",
        weight: 400,
      },
    ],
    width: 1200,
    height: 630,
  });
}
