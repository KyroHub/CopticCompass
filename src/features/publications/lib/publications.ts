import { getLocalizedPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

export type LanguageBadge = "COP" | "NL" | "EN";
export type PublicationStatus = "published" | "forthcoming";
export type PublicationType = "book" | "scholarly-article" | "creative-work";
type PublicationSchemaType = "Book" | "ScholarlyArticle" | "CreativeWork";
export type PublicationContributorRole =
  | "author"
  | "editor"
  | "compiler"
  | "illustrator"
  | "foreword"
  | "cover-design"
  | "typesetting"
  | "translator";
export type PublicationBinding =
  | "paperback"
  | "hardcover"
  | "ebook"
  | "digital";
export type PublicationLinkKind = "purchase" | "reference";
export type PublicationImageRole =
  | "front-cover"
  | "mockup-3d"
  | "back-cover"
  | "interior";

export type LocalizedPublicationText = Partial<Record<Language, string>>;

export interface PublicationContributor {
  name: string;
  role: PublicationContributorRole;
  entityType?: "Person" | "Organization";
  description?: LocalizedPublicationText;
}

interface PublicationPlace {
  city: LocalizedPublicationText;
  country: LocalizedPublicationText;
}

export interface PublicationPublisher {
  name: string;
  url?: string;
  location?: PublicationPlace;
}

export interface PublicationLink {
  kind: PublicationLinkKind;
  url: string;
  retailer?: string;
  market?: string;
}

interface PublicationDimensions {
  width: number;
  thickness: number;
  height: number;
  unit: "mm";
}

interface PublicationFormat {
  id: string;
  binding: PublicationBinding;
  isbn13?: string;
  dimensions?: PublicationDimensions;
  links?: PublicationLink[];
}

export interface PublicationEdition {
  id: string;
  editionNumber?: number;
  statement: LocalizedPublicationText;
  publicationDate?: string;
  publicationPlace?: PublicationPlace;
  formats: PublicationFormat[];
}

export interface PublicationCatalogRecord {
  authority: string;
  url: string;
  identifier?: string;
  recordedAt?: string;
  label?: LocalizedPublicationText;
}

export interface PublicationRights {
  copyrightYear: number;
  holder: string;
  notice?: LocalizedPublicationText;
  permissionsContact?: {
    email?: string;
    url?: string;
  };
}

export interface PublicationImage {
  id: string;
  role: PublicationImageRole;
  src: string;
  alt: LocalizedPublicationText;
  width: number;
  height: number;
  editionId?: string;
  formatId?: string;
}

export interface Publication {
  id: string;
  title: string;
  subtitle?: string;
  lang: LanguageBadge;
  images?: PublicationImage[];
  type: PublicationType;
  status: PublicationStatus;
  summary: Record<Language, string>;
  contributors?: PublicationContributor[];
  publisher?: PublicationPublisher;
  series?: {
    title?: string;
    volumeNumber?: string;
    numberOfVolumes?: number;
  };
  editions?: PublicationEdition[];
  links?: PublicationLink[];
  catalogRecords?: PublicationCatalogRecord[];
  rights?: PublicationRights;
}

interface PublicationPurchaseLink {
  binding?: PublicationBinding;
  edition?: PublicationEdition;
  format?: PublicationFormat;
  link: PublicationLink;
}

const KYRILLOS_WANNES = {
  entityType: "Person",
  name: "Kyrillos Wannes",
} as const;

const ANTWERP_BELGIUM: PublicationPlace = {
  city: { en: "Antwerp", nl: "Antwerpen" },
  country: { en: "Belgium", nl: "België" },
};

const COPTIC_COMPASS: PublicationPublisher = {
  name: "Coptic Compass",
  url: "https://www.copticcompass.com",
  location: ANTWERP_BELGIUM,
};

export const publications: Publication[] = [
  {
    id: "holy-bible-coptic",
    title: "The Holy Bible in Coptic",
    lang: "COP",
    images: [
      {
        id: "front-cover",
        role: "front-cover",
        src: "/publications/holy-bible-coptic/front-cover.png",
        alt: {
          en: "Front cover of The Holy Bible in Coptic",
          nl: "Voorkant van The Holy Bible in Coptic",
        },
        width: 375,
        height: 600,
        editionId: "digital-edition-2023",
        formatId: "ebook",
      },
    ],
    contributors: [{ ...KYRILLOS_WANNES, role: "compiler" }],
    editions: [
      {
        id: "digital-edition-2023",
        statement: { en: "Digital edition", nl: "Digitale editie" },
        publicationDate: "2023",
        formats: [
          {
            id: "ebook",
            binding: "ebook",
            links: [
              {
                kind: "purchase",
                retailer: "Amazon.com",
                url: "https://www.amazon.com/dp/B0CBSKX4CZ",
              },
            ],
          },
        ],
      },
    ],
    type: "book",
    status: "published",
    summary: {
      en: "A published Coptic edition of the Holy Bible, available as part of the growing publication catalog on Coptic Compass.",
      nl: "Een gepubliceerde Koptische editie van de Heilige Bijbel, beschikbaar als onderdeel van de groeiende publicatiecatalogus van Coptic Compass.",
    },
  },
  {
    id: "basisgrammatica-bohairisch-koptisch",
    title: "Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
    subtitle: "Deel I",
    lang: "NL",
    type: "book",
    status: "published",
    images: [
      {
        id: "front-cover-paperback",
        role: "front-cover",
        src: "/publications/basisgrammatica-bohairisch-koptisch/front-cover.webp",
        alt: {
          en: "Front cover of Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
          nl: "Voorkant van Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
        },
        width: 1391,
        height: 1800,
        editionId: "first-edition",
        formatId: "paperback",
      },
      {
        id: "back-cover-paperback",
        role: "back-cover",
        src: "/publications/basisgrammatica-bohairisch-koptisch/back-cover.webp",
        alt: {
          en: "Back cover of Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
          nl: "Achterkant van Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
        },
        width: 1392,
        height: 1800,
        editionId: "first-edition",
        formatId: "paperback",
      },
      {
        id: "mockup-paperback",
        role: "mockup-3d",
        src: "/publications/basisgrammatica-bohairisch-koptisch/mockup-paperback.webp",
        alt: {
          en: "Three-dimensional paperback mockup of Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
          nl: "Driedimensionale paperbackmock-up van Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
        },
        width: 1800,
        height: 1350,
        editionId: "first-edition",
        formatId: "paperback",
      },
    ],
    summary: {
      en: "A Dutch-language introduction to Bohairic Coptic grammar, designed as the first volume in a structured course for learners and readers.",
      nl: "Een Nederlandstalige inleiding tot de Bohairisch-Koptische basisgrammatica, opgevat als het eerste deel van een gestructureerde leergang voor studenten en lezers.",
    },
    contributors: [
      { ...KYRILLOS_WANNES, role: "author" },
      {
        entityType: "Person",
        name: "Jacques van der Vliet",
        role: "editor",
      },
      {
        entityType: "Person",
        name: "Mina Anton",
        role: "illustrator",
      },
      {
        description: {
          en: "Bishop of the Netherlands and Flanders",
          nl: "Bisschop van Nederland en Vlaanderen",
        },
        entityType: "Person",
        name: "Apa Arseny",
        role: "foreword",
      },
      {
        entityType: "Organization",
        name: "Coptic Compass",
        role: "cover-design",
      },
    ],
    publisher: COPTIC_COMPASS,
    series: {
      volumeNumber: "I",
    },
    editions: [
      {
        id: "first-edition",
        editionNumber: 1,
        statement: { en: "First edition", nl: "Eerste editie" },
        publicationDate: "2026-07",
        publicationPlace: ANTWERP_BELGIUM,
        formats: [
          {
            id: "paperback",
            binding: "paperback",
            isbn13: "9798397143721",
            dimensions: {
              width: 215.9,
              thickness: 22.19,
              height: 279.4,
              unit: "mm",
            },
            links: [
              {
                kind: "purchase",
                market: "NL",
                retailer: "Amazon.nl",
                url: "https://www.amazon.nl/dp/B0H8QVKK94",
              },
            ],
          },
          {
            id: "hardcover",
            binding: "hardcover",
            isbn13: "9798863142357",
            dimensions: {
              width: 209.55,
              thickness: 26.99,
              height: 279.4,
              unit: "mm",
            },
          },
        ],
      },
    ],
    catalogRecords: [
      {
        authority: "Koninklijke Bibliotheek van België",
        identifier: "SYRACUSE/22087911",
        label: {
          en: "Registration (January 2024)",
          nl: "Aangifte (januari 2024)",
        },
        recordedAt: "2024-01",
        url: "https://opac.kbr.be/LIBRARY/doc/SYRACUSE/22087911",
      },
    ],
    rights: {
      copyrightYear: 2026,
      holder: "Kyrillos Wannes",
      notice: {
        nl: "© 2026 Kyrillos Wannes. Alle rechten voorbehouden.\n\nNiets uit deze uitgave mag zonder voorafgaande schriftelijke toestemming van de uitgever worden verveelvoudigd, opgeslagen in een geautomatiseerd gegevensbestand of openbaar gemaakt, in enige vorm of op enige wijze, hetzij elektronisch, mechanisch, door middel van fotokopieën of opnamen, hetzij op enige andere manier.\n\nVoor het overnemen van gedeelten uit deze uitgave in bloemlezingen, readers en andere compilatiewerken als bedoeld in artikel 16 van de Auteurswet dient men zich tot de uitgever te wenden.",
      },
      permissionsContact: {
        url: "/contact",
      },
    },
  },
  {
    id: "bohairisch-nederlands-woordenboek",
    title:
      "Bohairisch–Nederlands Woordenboek: Een Beknopt Lexicon van het Koptisch",
    lang: "NL",
    type: "book",
    status: "forthcoming",
    summary: {
      en: "A forthcoming concise Bohairic-to-Dutch lexicon focused on practical reference use for students and researchers of Coptic.",
      nl: "Een aankomend beknopt Bohairisch-Nederlands lexicon, gericht op praktisch naslagwerk voor studenten en onderzoekers van het Koptisch.",
    },
    contributors: [{ ...KYRILLOS_WANNES, role: "author" }],
  },
  {
    id: "complex-verb-constructions-coptic",
    title:
      "Complex Verb Constructions in Coptic: Lexical and Morphological Perspectives from Bohairic and Sahidic",
    lang: "EN",
    type: "scholarly-article",
    status: "forthcoming",
    summary: {
      en: "A forthcoming research article examining complex verbal constructions in Coptic through comparative Bohairic and Sahidic evidence.",
      nl: "Een aankomend onderzoeksartikel over complexe verbale constructies in het Koptisch op basis van vergelijkend Bohairisch en Sahidisch materiaal.",
    },
    contributors: [{ ...KYRILLOS_WANNES, role: "author" }],
  },
  {
    id: "parallel-paradigms-coptic",
    title: "Parallel Paradigms of Bohairic and Sahidic Coptic",
    lang: "EN",
    type: "book",
    status: "published",
    images: [
      {
        id: "front-cover-paperback",
        role: "front-cover",
        src: "/publications/parallel-paradigms-coptic/front-cover.webp",
        alt: {
          en: "Front cover of Parallel Paradigms of Bohairic and Sahidic Coptic",
          nl: "Voorkant van Parallel Paradigms of Bohairic and Sahidic Coptic",
        },
        width: 1253,
        height: 1800,
        editionId: "first-edition",
        formatId: "paperback",
      },
      {
        id: "back-cover-paperback",
        role: "back-cover",
        src: "/publications/parallel-paradigms-coptic/back-cover.webp",
        alt: {
          en: "Back cover of Parallel Paradigms of Bohairic and Sahidic Coptic",
          nl: "Achterkant van Parallel Paradigms of Bohairic and Sahidic Coptic",
        },
        width: 1228,
        height: 1800,
        editionId: "first-edition",
        formatId: "paperback",
      },
      {
        id: "mockup-paperback",
        role: "mockup-3d",
        src: "/publications/parallel-paradigms-coptic/mockup-paperback.webp",
        alt: {
          en: "Three-dimensional paperback mockup of Parallel Paradigms of Bohairic and Sahidic Coptic",
          nl: "Driedimensionale paperbackmock-up van Parallel Paradigms of Bohairic and Sahidic Coptic",
        },
        width: 1800,
        height: 1350,
        editionId: "first-edition",
        formatId: "paperback",
      },
    ],
    summary: {
      en: "A comparative reference work mapping shared and divergent grammatical paradigms across Bohairic and Sahidic Coptic.",
      nl: "Een vergelijkend naslagwerk dat gedeelde en uiteenlopende grammaticale paradigma's in het Bohairisch en Sahidisch Koptisch in kaart brengt.",
    },
    contributors: [
      { ...KYRILLOS_WANNES, role: "author" },
      {
        entityType: "Organization",
        name: "Coptic Compass",
        role: "cover-design",
      },
      {
        entityType: "Organization",
        name: "Coptic Compass",
        role: "typesetting",
      },
    ],
    publisher: COPTIC_COMPASS,
    editions: [
      {
        id: "first-edition",
        editionNumber: 1,
        statement: { en: "First edition", nl: "Eerste editie" },
        publicationDate: "2026-07",
        publicationPlace: ANTWERP_BELGIUM,
        formats: [
          {
            id: "paperback",
            binding: "paperback",
            isbn13: "9798184913094",
            links: [
              {
                kind: "purchase",
                market: "US",
                retailer: "Amazon.com",
                url: "https://www.amazon.com/dp/B0H882L1T2",
              },
            ],
          },
        ],
      },
    ],
    rights: {
      copyrightYear: 2026,
      holder: "Kyrillos Wannes",
      notice: {
        en: "Copyright © 2026 by Kyrillos Wannes. All rights reserved.\n\nNo part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.\n\nFor permission requests, contact the publisher at Coptic Compass, Antwerp, Belgium.",
      },
      permissionsContact: {
        email: "copticcompass.app@gmail.com",
        url: "/contact",
      },
    },
  },
  {
    id: "tales-and-legends-reader",
    title: "Tales and Legends: A Bohairic Coptic Reader",
    subtitle: "Vol. I",
    lang: "EN",
    type: "book",
    status: "forthcoming",
    summary: {
      en: "A forthcoming Bohairic Coptic reader built around narrative texts, designed to support extended reading practice.",
      nl: "Een aankomende Bohairische Koptische reader rond verhalende teksten, ontworpen om uitgebreid leeswerk te ondersteunen.",
    },
    contributors: [{ ...KYRILLOS_WANNES, role: "author" }],
    series: {
      volumeNumber: "I",
    },
  },
  {
    id: "speak-with-us-coptic-curriculum",
    title: "Speak with Us: A Bohairic Coptic Curriculum",
    subtitle: "Translated by Kyrillos Wannes",
    lang: "EN",
    type: "book",
    status: "forthcoming",
    summary: {
      en: "A forthcoming Bohairic Coptic curriculum in translation, created to support guided language learning and classroom use.",
      nl: "Een aankomend vertaald curriculum voor het Bohairisch Koptisch, bedoeld om begeleid taalonderwijs en klassikaal gebruik te ondersteunen.",
    },
    contributors: [{ ...KYRILLOS_WANNES, role: "translator" }],
  },
];

/**
 * Returns the localized publications route for a publication id.
 */
export function getPublicationPath(id: string, locale?: Language) {
  const path = `/publications/${id}`;
  return locale ? getLocalizedPath(locale, path) : path;
}

/**
 * Loads one publication definition from the in-repo publications catalog.
 */
export function getPublicationById(id: string) {
  return publications.find((publication) => publication.id === id) ?? null;
}

/**
 * Resolves localized publication metadata while retaining the work's source
 * language as the first fallback.
 */
export function getLocalizedPublicationText(
  text: LocalizedPublicationText | undefined,
  locale: Language,
  sourceLanguage?: LanguageBadge,
) {
  if (!text) {
    return "";
  }

  const sourceLocale = sourceLanguage === "NL" ? "nl" : "en";
  return text[locale] ?? text[sourceLocale] ?? text.en ?? text.nl ?? "";
}

/**
 * Returns contributors assigned to one bibliographic role.
 */
export function getPublicationContributorsByRole(
  publication: Publication,
  role: PublicationContributorRole,
) {
  return (publication.contributors ?? []).filter(
    (contributor) => contributor.role === role,
  );
}

/**
 * Returns the primary contributor used for concise catalog attribution.
 */
export function getPublicationPrimaryContributor(publication: Publication) {
  const roles: PublicationContributorRole[] = [
    "author",
    "editor",
    "compiler",
    "translator",
  ];

  for (const role of roles) {
    const contributor = getPublicationContributorsByRole(publication, role)[0];
    if (contributor) {
      return contributor;
    }
  }

  return null;
}

/**
 * Returns the localized bibliographic role label used in compact attribution
 * rows and publication headers.
 */
export function getPublicationContributorRoleLabel(
  role: PublicationContributorRole,
  language: Language,
) {
  const labels: Record<PublicationContributorRole, Record<Language, string>> = {
    author: { en: "Author", nl: "Auteur" },
    editor: { en: "Editor", nl: "Redacteur" },
    compiler: {
      en: "Editor / compiler",
      nl: "Redacteur / samensteller",
    },
    illustrator: { en: "Illustrator", nl: "Illustrator" },
    foreword: { en: "Foreword", nl: "Voorwoord" },
    "cover-design": { en: "Cover design", nl: "Omslagontwerp" },
    typesetting: { en: "Interior typesetting", nl: "Binnenwerk en zetwerk" },
    translator: { en: "Translator", nl: "Vertaler" },
  };
  return labels[role][language];
}

/**
 * Returns publication images in their editorial display order, optionally
 * limited to one semantic image role.
 */
export function getPublicationImages(
  publication: Publication,
  role?: PublicationImageRole,
) {
  const images = publication.images ?? [];
  return role ? images.filter((image) => image.role === role) : images;
}

/**
 * Selects the best image for a role, preferring a requested physical format
 * and then a format-neutral asset before falling back to the first match.
 */
export function getPublicationImage(
  publication: Publication,
  role: PublicationImageRole,
  formatId?: string,
) {
  const images = getPublicationImages(publication, role);

  if (formatId) {
    const formatImage = images.find((image) => image.formatId === formatId);
    if (formatImage) {
      return formatImage;
    }
  }

  return images.find((image) => !image.formatId) ?? images[0] ?? null;
}

/**
 * Returns the localized label used by publication-gallery controls.
 */
export function getPublicationImageRoleLabel(
  role: PublicationImageRole,
  language: Language,
) {
  const labels: Record<PublicationImageRole, Record<Language, string>> = {
    "front-cover": { en: "Front cover", nl: "Voorkant" },
    "mockup-3d": { en: "3D mockup", nl: "3D-mock-up" },
    "back-cover": { en: "Back cover", nl: "Achterkant" },
    interior: { en: "Interior preview", nl: "Binnenwerk" },
  };
  return labels[role][language];
}

/**
 * Flattens format-specific and work-level purchase links for one publication.
 */
export function getPublicationPurchaseLinks(
  publication: Publication,
): PublicationPurchaseLink[] {
  const editionLinks = (publication.editions ?? []).flatMap((edition) =>
    edition.formats.flatMap((format) =>
      (format.links ?? [])
        .filter((link) => link.kind === "purchase")
        .map((link) => ({
          binding: format.binding,
          edition,
          format,
          link,
        })),
    ),
  );
  const workLinks = (publication.links ?? [])
    .filter((link) => link.kind === "purchase")
    .map((link) => ({ link }));

  return [...editionLinks, ...workLinks];
}

/**
 * Returns the first public purchase destination for compact catalog surfaces.
 */
export function getPrimaryPublicationPurchaseLink(publication: Publication) {
  return getPublicationPurchaseLinks(publication)[0] ?? null;
}

/**
 * Returns the distinct bindings represented by all known editions.
 */
export function getPublicationBindings(publication: Publication) {
  return Array.from(
    new Set(
      (publication.editions ?? []).flatMap((edition) =>
        edition.formats.map((format) => format.binding),
      ),
    ),
  );
}

/**
 * Returns the first known publication year from edition metadata.
 */
export function getPublicationYear(publication: Publication) {
  const datedEdition = (publication.editions ?? []).find(
    (edition) => edition.publicationDate,
  );
  return datedEdition?.publicationDate?.slice(0, 4) ?? null;
}

/**
 * Returns the localized compact label for a publication's explicit series
 * volume metadata.
 */
export function getPublicationVolumeLabel(
  publication: Publication,
  language: Language,
) {
  const volumeNumber = publication.series?.volumeNumber;
  if (!volumeNumber) {
    return null;
  }

  return `${language === "nl" ? "Deel" : "Vol."} ${volumeNumber}`;
}

/**
 * Returns a locale-aware month and year label for partial ISO dates.
 */
export function formatPublicationDate(value: string, locale: Language) {
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = parts[1] ? Number(parts[1]) : null;

  if (!Number.isFinite(year) || !month) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "nl" ? "nl-BE" : "en-GB", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Returns the localized publication-place label used in bibliographic rows.
 */
export function getPublicationPlaceLabel(
  place: PublicationPlace,
  locale: Language,
  sourceLanguage?: LanguageBadge,
) {
  const city = getLocalizedPublicationText(place.city, locale, sourceLanguage);
  const country = getLocalizedPublicationText(
    place.country,
    locale,
    sourceLanguage,
  );
  return [city, country].filter(Boolean).join(", ");
}

/**
 * Returns the localized binding label used by cards and edition panels.
 */
export function getPublicationBindingLabel(
  binding: PublicationBinding,
  language: Language,
) {
  const labels: Record<PublicationBinding, Record<Language, string>> = {
    paperback: { en: "Paperback", nl: "Paperback" },
    hardcover: { en: "Hardcover", nl: "Hardcover" },
    ebook: { en: "E-book", nl: "E-book" },
    digital: { en: "Digital", nl: "Digitaal" },
  };
  return labels[binding][language];
}

/**
 * Formats millimetre dimensions in the documented width × thickness × height
 * order without losing supplied decimal precision.
 */
export function formatPublicationDimensions(
  dimensions: PublicationDimensions,
  language: Language,
) {
  const formatter = new Intl.NumberFormat(
    language === "nl" ? "nl-BE" : "en-GB",
    { maximumFractionDigits: 2 },
  );
  return [dimensions.width, dimensions.thickness, dimensions.height]
    .map((value) => formatter.format(value))
    .join(" × ")
    .concat(` ${dimensions.unit}`);
}

/**
 * Orders catalog entries by public availability and then by localized title
 * collation without mutating the source catalog.
 */
export function sortPublicationsForCatalog(
  catalog: readonly Publication[],
  language: Language,
) {
  const collator = new Intl.Collator(language === "nl" ? "nl-BE" : "en-GB", {
    numeric: true,
    sensitivity: "base",
  });
  const statusRank: Record<PublicationStatus, number> = {
    published: 0,
    forthcoming: 1,
  };

  return [...catalog].sort((left, right) => {
    const statusDifference = statusRank[left.status] - statusRank[right.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return collator.compare(left.title, right.title);
  });
}

/**
 * Returns related publications by preferring shared language and work type
 * before truncating the list to the requested limit.
 */
export function getRelatedPublications(id: string, limit = 3) {
  const currentPublication = getPublicationById(id);

  if (!currentPublication) {
    return [];
  }

  return publications
    .filter((publication) => publication.id !== id)
    .sort((left, right) => {
      const leftScore =
        Number(left.lang === currentPublication.lang) +
        Number(left.type === currentPublication.type);
      const rightScore =
        Number(right.lang === currentPublication.lang) +
        Number(right.type === currentPublication.type);

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

/**
 * Builds the display title used across metadata and publication detail views.
 */
export function buildPublicationTitle(publication: Publication) {
  return publication.subtitle
    ? `${publication.title} — ${publication.subtitle}`
    : publication.title;
}

/**
 * Returns the Schema.org type derived from the catalog's semantic work type.
 */
export function getPublicationSchemaType(
  publication: Publication,
): PublicationSchemaType {
  if (publication.type === "book") {
    return "Book";
  }

  if (publication.type === "scholarly-article") {
    return "ScholarlyArticle";
  }

  return "CreativeWork";
}

/**
 * Returns the localized format label used by catalog and publication detail UI.
 */
export function getPublicationFormatLabel(
  publication: Publication,
  language: Language,
) {
  if (publication.type === "book") {
    return language === "nl" ? "Boek" : "Book";
  }

  if (publication.type === "scholarly-article") {
    return language === "nl" ? "Onderzoeksartikel" : "Research Article";
  }

  return language === "nl" ? "Creatief werk" : "Creative Work";
}

/**
 * Builds the localized publication description used by metadata and share
 * surfaces from the summary, format, availability, and contributor details.
 */
export function buildPublicationDescription(
  publication: Publication,
  locale: Language = "en",
) {
  const formatLabel = getPublicationFormatLabel(
    publication,
    locale,
  ).toLocaleLowerCase(locale);
  let availabilityLabel =
    locale === "nl" ? "Binnenkort beschikbaar." : "Forthcoming.";

  if (publication.status === "published") {
    availabilityLabel = locale === "nl" ? "Nu beschikbaar." : "Available now.";
  }
  const platformLabel =
    locale === "nl" ? "via Coptic Compass" : "through Coptic Compass";
  const primaryContributor = getPublicationPrimaryContributor(publication);
  let attribution = "";

  if (primaryContributor) {
    const names = getPublicationContributorsByRole(
      publication,
      primaryContributor.role,
    )
      .map((contributor) => contributor.name)
      .join(", ");

    if (primaryContributor.role === "translator") {
      attribution = `${locale === "nl" ? "Vertaald door" : "Translated by"} ${names}.`;
    } else if (primaryContributor.role === "compiler") {
      attribution = `${
        locale === "nl"
          ? "Redactie en samenstelling door"
          : "Edited and compiled by"
      } ${names}.`;
    } else if (primaryContributor.role === "editor") {
      attribution = `${locale === "nl" ? "Redactie door" : "Edited by"} ${names}.`;
    } else {
      attribution = `${locale === "nl" ? "Door" : "By"} ${names}.`;
    }
  }

  return [
    `${buildPublicationTitle(publication)}.`,
    publication.summary[locale],
    availabilityLabel,
    `${formatLabel} ${platformLabel}.`,
    attribution,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Builds the complete localized search corpus for a publication record.
 */
export function buildPublicationSearchText(
  publication: Publication,
  locale: Language,
) {
  const editionText = (publication.editions ?? []).flatMap((edition) => [
    getLocalizedPublicationText(edition.statement, locale, publication.lang),
    edition.publicationDate,
    edition.publicationPlace
      ? getPublicationPlaceLabel(
          edition.publicationPlace,
          locale,
          publication.lang,
        )
      : "",
    ...edition.formats.flatMap((format) => [
      getPublicationBindingLabel(format.binding, locale),
      format.isbn13,
      format.dimensions
        ? formatPublicationDimensions(format.dimensions, locale)
        : "",
      ...(format.links ?? []).flatMap((link) => [link.retailer, link.market]),
    ]),
  ]);
  const contributorText = (publication.contributors ?? []).flatMap(
    (contributor) => [
      contributor.name,
      contributor.role,
      getLocalizedPublicationText(
        contributor.description,
        locale,
        publication.lang,
      ),
    ],
  );
  const catalogText = (publication.catalogRecords ?? []).flatMap((record) => [
    record.authority,
    record.identifier,
    record.recordedAt,
    getLocalizedPublicationText(record.label, locale, publication.lang),
  ]);

  return [
    publication.title,
    publication.subtitle,
    publication.lang,
    publication.status,
    publication.type,
    publication.summary[locale],
    publication.publisher?.name,
    publication.series?.title,
    publication.series?.volumeNumber,
    ...contributorText,
    ...editionText,
    ...catalogText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale);
}

function isValidPublicUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidInternalOrPublicUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.includes("..") && !value.includes("\\");
  }

  return isValidPublicUrl(value);
}

function isValidPublicationDate(value: string) {
  const match =
    /^(\d{4})(?:-(0[1-9]|1[0-2]))?(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  if (!monthText || !dayText) {
    return true;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidIsbn13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const digits = Array.from(value, Number);
  const checksum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0);
  return (10 - (checksum % 10)) % 10 === digits[12];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates identifiers, edition structure, dimensions, dates, and public URLs
 * for the complete in-repo catalog.
 */
export function validatePublications(catalog: readonly Publication[]) {
  const errors: string[] = [];
  const publicationIds = new Set<string>();
  const imageOwners = new Map<string, string>();
  const isbnOwners = new Map<string, string>();

  for (const publication of catalog) {
    if (publicationIds.has(publication.id)) {
      errors.push(`Duplicate publication id: ${publication.id}`);
    }
    publicationIds.add(publication.id);

    if (
      publication.publisher?.url &&
      !isValidPublicUrl(publication.publisher.url)
    ) {
      errors.push(
        `${publication.id}: invalid publisher URL ${publication.publisher.url}`,
      );
    }

    const permissionsContact = publication.rights?.permissionsContact;
    if (
      permissionsContact?.url &&
      !isValidInternalOrPublicUrl(permissionsContact.url)
    ) {
      errors.push(
        `${publication.id}: invalid permissions URL ${permissionsContact.url}`,
      );
    }
    if (permissionsContact?.email && !isValidEmail(permissionsContact.email)) {
      errors.push(
        `${publication.id}: invalid permissions email ${permissionsContact.email}`,
      );
    }

    const editionIds = new Set<string>();
    const publicationFormatIds = new Set<string>();
    for (const edition of publication.editions ?? []) {
      if (editionIds.has(edition.id)) {
        errors.push(`${publication.id}: duplicate edition id ${edition.id}`);
      }
      editionIds.add(edition.id);

      if (
        edition.publicationDate &&
        !isValidPublicationDate(edition.publicationDate)
      ) {
        errors.push(
          `${publication.id}/${edition.id}: invalid publication date ${edition.publicationDate}`,
        );
      }

      const formatIds = new Set<string>();
      for (const format of edition.formats) {
        if (formatIds.has(format.id)) {
          errors.push(
            `${publication.id}/${edition.id}: duplicate format id ${format.id}`,
          );
        }
        formatIds.add(format.id);
        publicationFormatIds.add(format.id);

        if (format.isbn13 && !isValidIsbn13(format.isbn13)) {
          errors.push(
            `${publication.id}/${edition.id}/${format.id}: invalid ISBN-13 ${format.isbn13}`,
          );
        }

        if (format.isbn13) {
          const existingOwner = isbnOwners.get(format.isbn13);
          if (existingOwner) {
            errors.push(
              `Duplicate ISBN-13 ${format.isbn13}: ${existingOwner} and ${publication.id}/${edition.id}/${format.id}`,
            );
          } else {
            isbnOwners.set(
              format.isbn13,
              `${publication.id}/${edition.id}/${format.id}`,
            );
          }
        }

        if (
          format.dimensions &&
          [
            format.dimensions.width,
            format.dimensions.thickness,
            format.dimensions.height,
          ].some((dimension) => dimension <= 0)
        ) {
          errors.push(
            `${publication.id}/${edition.id}/${format.id}: dimensions must be positive`,
          );
        }

        for (const link of format.links ?? []) {
          if (!isValidPublicUrl(link.url)) {
            errors.push(
              `${publication.id}/${edition.id}/${format.id}: invalid URL ${link.url}`,
            );
          }
        }
      }
    }

    const imageIds = new Set<string>();
    for (const image of publication.images ?? []) {
      if (imageIds.has(image.id)) {
        errors.push(`${publication.id}: duplicate image id ${image.id}`);
      }
      imageIds.add(image.id);

      const existingOwner = imageOwners.get(image.src);
      if (existingOwner) {
        errors.push(
          `Duplicate publication image ${image.src}: ${existingOwner} and ${publication.id}/${image.id}`,
        );
      } else {
        imageOwners.set(image.src, `${publication.id}/${image.id}`);
      }

      if (
        !image.src.startsWith(`/publications/${publication.id}/`) ||
        image.src.includes("..") ||
        image.src.includes("\\")
      ) {
        errors.push(
          `${publication.id}/${image.id}: image must be stored under /publications/${publication.id}/`,
        );
      }

      if (image.width <= 0 || image.height <= 0) {
        errors.push(
          `${publication.id}/${image.id}: image dimensions must be positive`,
        );
      }

      if (!image.alt.en || !image.alt.nl) {
        errors.push(
          `${publication.id}/${image.id}: English and Dutch alt text are required`,
        );
      }

      if (image.editionId && !editionIds.has(image.editionId)) {
        errors.push(
          `${publication.id}/${image.id}: unknown edition id ${image.editionId}`,
        );
      }

      if (image.formatId && !publicationFormatIds.has(image.formatId)) {
        errors.push(
          `${publication.id}/${image.id}: unknown format id ${image.formatId}`,
        );
      }
    }

    if (
      publication.status === "published" &&
      !getPublicationImage(publication, "front-cover")
    ) {
      errors.push(`${publication.id}: published works require a front cover`);
    }

    for (const link of publication.links ?? []) {
      if (!isValidPublicUrl(link.url)) {
        errors.push(`${publication.id}: invalid URL ${link.url}`);
      }
    }

    for (const record of publication.catalogRecords ?? []) {
      if (!isValidPublicUrl(record.url)) {
        errors.push(`${publication.id}: invalid catalog URL ${record.url}`);
      }
    }
  }

  return errors;
}
