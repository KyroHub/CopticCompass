import type {
  GrammarLessonBundle,
  GrammarLessonIndexItem,
} from "@/content/grammar/schema";
import {
  buildEntryDescription,
  toPlainText,
} from "@/features/dictionary/lib/entryText";
import type { LexicalEntry } from "@/features/dictionary/types";
import {
  buildGrammarLessonSeoDescription,
  buildGrammarLessonSeoTitle,
} from "@/features/grammar/lib/grammarDataset";
import { getGrammarLessonPath } from "@/features/grammar/lib/grammarPaths";
import {
  buildPublicationDescription,
  getPublicationPath,
  type Publication,
} from "@/features/publications/lib/publications";
import { DEFAULT_LANGUAGE } from "@/lib/i18n";
import {
  getDictionaryPath,
  getEntryPath,
  getGrammarPath,
  getLocalizedHomePath,
  getPublicationsPath,
} from "@/lib/locale";
import { siteConfig } from "@/lib/site";
import type { Language } from "@/types/i18n";

type JsonLd = Record<string, unknown>;
type BreadcrumbStructuredDataItem = {
  name: string;
  path: string;
};

const STRUCTURED_DATA_COPY = {
  en: {
    copticLanguageName: "Coptic",
    publicationCreativeWorkStatus: "In preparation",
    websiteDescription: siteConfig.dictionaryEntryCount
      ? `Coptic Compass is a digital home for Coptic study, with ${siteConfig.dictionaryEntryCount.toLocaleString()} searchable dictionary entries, grammar lessons, publications, Shenute AI, and research tools.`
      : "Coptic Compass is a digital home for Coptic study, with a searchable dictionary, grammar lessons, publications, Shenute AI, and research tools.",
    dictionary: {
      pageName: "Coptic Dictionary",
      pageDescription:
        "Search the Coptic-English dictionary by Coptic, English, or Greek, with dialect filters, grammatical detail, and a built-in virtual keyboard.",
      setName: "Coptic-English Dictionary",
      setDescription:
        "A digital Coptic dictionary from Coptic Compass with English and Greek glosses, dialect forms, and grammatical annotations.",
    },
    grammar: {
      hubPageName: "Coptic Grammar Lessons",
      hubPageDescription:
        "Structured Coptic grammar lessons from Coptic Compass, with exercises, concept glossaries, and source notes.",
      hubListName: "Published Coptic Grammar Lessons",
      learningResourceType: "Grammar lesson",
    },
    publications: {
      pageName: "Publications",
      pageDescription:
        "Books, reference works, and research materials available through Coptic Compass, including works by Kyrillos Wannes.",
      listName: "Coptic Compass Publications",
    },
    definedTerm: {
      partOfSpeech: "Part of speech",
      gender: "Gender",
      greekEquivalents: "Greek equivalents",
    },
  },
  nl: {
    copticLanguageName: "Koptisch",
    publicationCreativeWorkStatus: "In voorbereiding",
    websiteDescription: siteConfig.dictionaryEntryCount
      ? `Coptic Compass is een digitaal thuis voor de studie van het Koptisch, met ${siteConfig.dictionaryEntryCount.toLocaleString()} doorzoekbare woordenboeklemma's, grammaticalessen, publicaties, Shenute AI en onderzoekstools.`
      : "Coptic Compass is een digitaal thuis voor de studie van het Koptisch, met een doorzoekbaar woordenboek, grammaticalessen, publicaties, Shenute AI en onderzoekstools.",
    dictionary: {
      pageName: "Koptisch Woordenboek",
      pageDescription:
        "Doorzoek het Koptisch-Nederlandse woordenboek op Koptisch, Nederlands of Grieks, met dialectfilters, grammaticale details en een ingebouwd virtueel toetsenbord.",
      setName: "Koptisch-Nederlands Woordenboek",
      setDescription:
        "Een digitaal Koptisch woordenboek van Coptic Compass met Nederlandse en Griekse glossen, dialectvormen en grammaticale annotaties.",
    },
    grammar: {
      hubPageName: "Lessen Koptische Grammatica",
      hubPageDescription:
        "Gestructureerde lessen Koptische grammatica van Coptic Compass, met oefeningen, begrippenlijsten en bronnotities.",
      hubListName: "Gepubliceerde lessen Koptische grammatica",
      learningResourceType: "Grammaticales",
    },
    publications: {
      pageName: "Publicaties",
      pageDescription:
        "Boeken, naslagwerken en onderzoeksmaterialen binnen Coptic Compass, waaronder werken van Kyrillos Wannes.",
      listName: "Publicaties van Coptic Compass",
    },
    definedTerm: {
      partOfSpeech: "Woordsoort",
      gender: "Geslacht",
      greekEquivalents: "Griekse equivalenten",
    },
  },
} as const;

/**
 * Resolves a relative application path against the canonical production site
 * URL so JSON-LD records always use absolute identifiers.
 */
function absoluteUrl(path: string) {
  return new URL(path, siteConfig.liveUrl).toString();
}

function getStructuredDataCopy(locale: Language) {
  return STRUCTURED_DATA_COPY[locale];
}

function getWebsiteId(locale: Language) {
  return `${absoluteUrl(getLocalizedHomePath(locale))}#website`;
}

function getDictionaryUrl(locale: Language) {
  return absoluteUrl(getDictionaryPath(locale));
}

function getDictionarySetId(locale: Language) {
  return `${getDictionaryUrl(locale)}#defined-term-set`;
}

function getGrammarHubUrl(locale: Language) {
  return absoluteUrl(getGrammarPath(locale));
}

function getGrammarHubPageId(locale: Language) {
  return `${getGrammarHubUrl(locale)}#collection-page`;
}

function getGrammarHubListId(locale: Language) {
  return `${getGrammarHubUrl(locale)}#item-list`;
}

function getPublicationsPageId(locale: Language) {
  return `${absoluteUrl(getPublicationsPath(locale))}#collection-page`;
}

function getPublicationsListId(locale: Language) {
  return `${absoluteUrl(getPublicationsPath(locale))}#item-list`;
}

function getPublicationAbsoluteUrl(publication: Publication, locale: Language) {
  return absoluteUrl(getPublicationPath(publication.id, locale));
}

/**
 * Builds the structured-data record for one publication, including optional
 * cover art, external link, and forthcoming status metadata when present.
 */
function getPublicationStructuredData(
  publication: Publication,
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd {
  const publicationUrl = getPublicationAbsoluteUrl(publication, locale);
  const copy = getStructuredDataCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": publication.schemaType,
    "@id": `${publicationUrl}#work`,
    url: publicationUrl,
    name: publication.title,
    ...(publication.subtitle
      ? {
          alternativeHeadline: publication.subtitle,
        }
      : {}),
    description: buildPublicationDescription(publication, locale),
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    inLanguage: languageCode(publication.lang),
    ...(publication.image
      ? {
          image: absoluteUrl(publication.image),
        }
      : {}),
    ...(publication.link
      ? {
          sameAs: publication.link,
        }
      : {}),
    ...(publication.status === "forthcoming"
      ? {
          creativeWorkStatus: copy.publicationCreativeWorkStatus,
        }
      : {}),
    isPartOf: {
      "@id": getPublicationsPageId(locale),
    },
    mainEntityOfPage: publicationUrl,
  };
}

/**
 * Builds a breadcrumb list JSON-LD payload for a page-level breadcrumb trail.
 */
export function createBreadcrumbStructuredData(
  items: readonly BreadcrumbStructuredDataItem[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Maps publication language codes onto schema.org language codes for
 * publication structured data.
 */
function languageCode(lang: Publication["lang"]) {
  switch (lang) {
    case "COP":
      return "cop";
    case "NL":
      return "nl";
    case "EN":
      return "en";
    default:
      return "en";
  }
}

/**
 * Builds the site-level WebSite structured data, including the dictionary
 * search action used by search engines.
 */
export function createWebSiteStructuredData(
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd {
  const dictionaryUrl = getDictionaryUrl(locale);
  const copy = getStructuredDataCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getWebsiteId(locale),
    url: absoluteUrl(getLocalizedHomePath(locale)),
    name: siteConfig.brandName,
    alternateName: siteConfig.descriptor,
    description: copy.websiteDescription,
    inLanguage: ["en", "nl", "cop"],
    publisher: {
      "@type": "Person",
      name: siteConfig.author.name,
      sameAs: [siteConfig.author.github],
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${dictionaryUrl}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Builds the dictionary hub structured data as a collection page plus
 * defined-term set.
 */
export function createDictionaryPageStructuredData(
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd[] {
  const dictionaryUrl = getDictionaryUrl(locale);
  const dictionarySetId = getDictionarySetId(locale);
  const copy = getStructuredDataCopy(locale);

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${dictionaryUrl}#collection-page`,
      url: dictionaryUrl,
      name: copy.dictionary.pageName,
      description: copy.dictionary.pageDescription,
      isPartOf: {
        "@id": getWebsiteId(locale),
      },
      mainEntity: {
        "@id": dictionarySetId,
      },
      about: [
        {
          "@type": "Language",
          name: copy.copticLanguageName,
          alternateName: "cop",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": dictionarySetId,
      url: dictionaryUrl,
      name: copy.dictionary.setName,
      description: copy.dictionary.setDescription,
      creator: {
        "@type": "Person",
        name: siteConfig.author.name,
      },
      inLanguage: ["cop", "en", "nl", "el"],
    },
  ];
}

/**
 * Builds the grammar hub structured data for the published lesson collection
 * page and ordered lesson list.
 */
export function createGrammarHubStructuredData(
  lessons: readonly GrammarLessonIndexItem[],
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd[] {
  const publishedLessons = lessons.filter(
    (lesson) => lesson.status === "published",
  );
  const grammarHubUrl = getGrammarHubUrl(locale);
  const grammarHubPageId = getGrammarHubPageId(locale);
  const grammarHubListId = getGrammarHubListId(locale);
  const copy = getStructuredDataCopy(locale);

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": grammarHubPageId,
      url: grammarHubUrl,
      name: copy.grammar.hubPageName,
      description: copy.grammar.hubPageDescription,
      isPartOf: {
        "@id": getWebsiteId(locale),
      },
      mainEntity: {
        "@id": grammarHubListId,
      },
      about: [
        {
          "@type": "Language",
          name: copy.copticLanguageName,
          alternateName: "cop",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": grammarHubListId,
      url: grammarHubUrl,
      name: copy.grammar.hubListName,
      itemListElement: publishedLessons.map((lesson, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(getGrammarLessonPath(lesson.slug, locale)),
        name: buildGrammarLessonSeoTitle(lesson, locale),
      })),
    },
  ];
}

/**
 * Builds the learning-resource structured data for one published grammar
 * lesson bundle.
 */
export function createGrammarLessonStructuredData(
  lessonBundle: GrammarLessonBundle,
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd {
  const lesson = lessonBundle.lesson;
  const lessonUrl = absoluteUrl(getGrammarLessonPath(lesson.slug, locale));
  const copy = getStructuredDataCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${lessonUrl}#learning-resource`,
    url: lessonUrl,
    name: buildGrammarLessonSeoTitle(lesson, locale),
    description: buildGrammarLessonSeoDescription(lessonBundle, locale),
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    educationalUse: "instruction",
    learningResourceType: copy.grammar.learningResourceType,
    inLanguage: ["en", "nl", "cop"],
    keywords: lesson.tags.join(", "),
    isPartOf: {
      "@id": getGrammarHubPageId(locale),
    },
    about: [
      {
        "@type": "Language",
        name: copy.copticLanguageName,
        alternateName: "cop",
      },
      ...lessonBundle.concepts.slice(0, 6).map((concept) => ({
        "@type": "DefinedTerm",
        name: concept.title[locale],
      })),
    ],
    hasPart: lesson.sections.map((section) => ({
      "@type": "WebPageElement",
      name: section.title[locale],
      position: section.order,
    })),
  };
}

/**
 * Builds the defined-term structured data for a dictionary entry, collapsing
 * dialect spellings into alternate labels for the same lexical concept.
 */
export function createDefinedTermStructuredData(
  entry: LexicalEntry,
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd {
  const headword = toPlainText(entry.headword);
  const entryPath = getEntryPath(entry.id, locale);
  const copy = getStructuredDataCopy(locale);
  const alternateNames = Array.from(
    new Set(
      Object.values(entry.dialects)
        .flatMap((forms) => [
          forms.absolute,
          ...(forms.absoluteVariants ?? []),
          forms.nominal,
          forms.pronominal,
          forms.stative,
        ])
        .map((form) => toPlainText(form))
        .filter(Boolean),
    ),
  );
  const additionalProperty = [
    {
      "@type": "PropertyValue",
      name: copy.definedTerm.partOfSpeech,
      value: entry.pos,
    },
    entry.gender
      ? {
          "@type": "PropertyValue",
          name: copy.definedTerm.gender,
          value: entry.gender,
        }
      : null,
    entry.greek_equivalents.length > 0
      ? {
          "@type": "PropertyValue",
          name: copy.definedTerm.greekEquivalents,
          value: entry.greek_equivalents.join("; "),
        }
      : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${absoluteUrl(entryPath)}#defined-term`,
    url: absoluteUrl(entryPath),
    name: headword,
    alternateName: alternateNames,
    description: buildEntryDescription(entry, locale),
    termCode: entry.id,
    inDefinedTermSet: {
      "@id": getDictionarySetId(locale),
    },
    inLanguage: "cop",
    mainEntityOfPage: absoluteUrl(entryPath),
    additionalProperty,
  };
}

/**
 * Builds the publications hub structured data as a collection page, ordered
 * item list, and per-publication work records.
 */
export function createPublicationsStructuredData(
  publications: Publication[],
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd[] {
  const publicationsPageId = getPublicationsPageId(locale);
  const publicationsListId = getPublicationsListId(locale);
  const works = publications.map((publication) =>
    getPublicationStructuredData(publication, locale),
  );
  const copy = getStructuredDataCopy(locale);

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": publicationsPageId,
      url: absoluteUrl(getPublicationsPath(locale)),
      name: copy.publications.pageName,
      description: copy.publications.pageDescription,
      isPartOf: {
        "@id": getWebsiteId(locale),
      },
      mainEntity: {
        "@id": publicationsListId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": publicationsListId,
      url: absoluteUrl(getPublicationsPath(locale)),
      name: copy.publications.listName,
      itemListElement: publications.map((publication, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getPublicationAbsoluteUrl(publication, locale),
        item: {
          "@id": `${getPublicationAbsoluteUrl(publication, locale)}#work`,
        },
      })),
    },
    ...works,
  ];
}

/**
 * Returns the structured-data record for a single publication detail page.
 */
export function createPublicationStructuredData(
  publication: Publication,
  locale: Language = DEFAULT_LANGUAGE,
): JsonLd {
  return getPublicationStructuredData(publication, locale);
}
