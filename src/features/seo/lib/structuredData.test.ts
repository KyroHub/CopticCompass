import { describe, expect, it } from "vitest";

import type { LexicalEntry } from "@/features/dictionary/types";
import { getFaqAnswerPlainText, listFaqItems } from "@/features/faq/lib/faq";
import {
  getPublicationById,
  type Publication,
} from "@/features/publications/lib/publications";

import {
  createDefinedTermStructuredData,
  createDictionaryPageStructuredData,
  createFaqPageStructuredData,
  createPublicationStructuredData,
  createWebSiteStructuredData,
} from "./structuredData";

const lordEntry: LexicalEntry = {
  id: 17,
  headword: "ϭⲱⲓⲥ",
  dialects: {
    B: {
      absolute: "ϭⲱⲓⲥ",
      nominal: "",
      pronominal: "",
      stative: "",
      variants: {
        absolute: ["⳪"],
      },
    },
  },
  senses: [{ grammar: { pos: "N" }, meanings: { en: ["lord"] } }],
  etym: "Gr",
  greekContext: { sources: ["κυριοσ"] },
};

describe("structured dictionary data", () => {
  it("builds website structured data with a localized dictionary search action", () => {
    const data = createWebSiteStructuredData("nl");

    expect(data).toMatchObject({
      "@type": "WebSite",
      name: "Coptic Compass",
      alternateName: "Digital Coptology Platform",
      url: "https://www.copticcompass.com/nl",
      inLanguage: ["en", "nl", "cop"],
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate:
            "https://www.copticcompass.com/nl/dictionary?q={search_term_string}",
        },
      },
    });
  });

  it("builds dictionary page structured data as a collection page plus term set", () => {
    const data = createDictionaryPageStructuredData("en");

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      "@type": "CollectionPage",
      url: "https://www.copticcompass.com/en/dictionary",
      mainEntity: {
        "@id": "https://www.copticcompass.com/en/dictionary#defined-term-set",
      },
    });
    expect(data[1]).toMatchObject({
      "@type": "DefinedTermSet",
      url: "https://www.copticcompass.com/en/dictionary",
      description:
        "A digital Coptic dictionary from Coptic Compass with English and Greek glosses, dialect forms, and grammatical annotations.",
      inLanguage: ["cop", "en", "nl", "el"],
    });
  });

  it("includes dialect variants in alternate labels without breaking serialization", () => {
    const data = createDefinedTermStructuredData(lordEntry);

    expect(data).toMatchObject({
      "@type": "DefinedTerm",
      name: "ϭⲱⲓⲥ",
      alternateName: ["ϭⲱⲓⲥ", "⳪"],
    });
  });

  it("builds FAQ page structured data from localized FAQ content", () => {
    const faqItems = listFaqItems("en");
    const firstFaqItem = faqItems[0];
    const data = createFaqPageStructuredData(faqItems, "en");
    const questions = data.mainEntity as Array<Record<string, unknown>>;

    expect(firstFaqItem).toBeDefined();
    expect(data).toMatchObject({
      "@type": "FAQPage",
      "@id": "https://www.copticcompass.com/en/faq#faq-page",
      url: "https://www.copticcompass.com/en/faq",
      inLanguage: "en",
    });
    expect(questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "Question",
          "@id": `https://www.copticcompass.com/en/faq#${firstFaqItem?.id}`,
          name: firstFaqItem?.question,
          acceptedAnswer: expect.objectContaining({
            "@type": "Answer",
            text: firstFaqItem
              ? getFaqAnswerPlainText(firstFaqItem)
              : undefined,
          }),
        }),
      ]),
    );
  });
});

describe("structured publication data", () => {
  it("describes the Coptic Bible as a 2023 e-book with its compiler", () => {
    const publication = getPublicationById("holy-bible-coptic");

    expect(publication).not.toBeNull();

    const data = createPublicationStructuredData(publication!, "en");

    expect(data).toMatchObject({
      "@type": "Book",
      datePublished: "2023",
      contributor: [
        {
          "@type": "Role",
          roleName: "Editor / compiler",
          contributor: {
            "@type": "Person",
            name: "Kyrillos Wannes",
          },
        },
      ],
      workExample: [
        expect.objectContaining({
          bookFormat: "https://schema.org/EBook",
          datePublished: "2023",
        }),
      ],
    });
  });

  it("emits edition-aware book data for the grammar publication", () => {
    const publication = getPublicationById(
      "basisgrammatica-bohairisch-koptisch",
    );

    expect(publication).not.toBeNull();

    const data = createPublicationStructuredData(publication!, "nl");

    expect(data).toMatchObject({
      "@type": "Book",
      author: [{ "@type": "Person", name: "Kyrillos Wannes" }],
      bookEdition: "Eerste editie",
      datePublished: "2026-07",
      isbn: ["9798397143721", "9798863142357"],
      publisher: {
        "@type": "Organization",
        name: "Coptic Compass",
      },
      sameAs: ["https://opac.kbr.be/LIBRARY/doc/SYRACUSE/22087911"],
      image: [
        "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/front-cover.webp",
        "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/back-cover.webp",
        "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/mockup-paperback.webp",
      ],
    });
    expect(data.workExample).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "Book",
          bookFormat: "https://schema.org/Paperback",
          isbn: "9798397143721",
          image: [
            "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/front-cover.webp",
            "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/back-cover.webp",
            "https://www.copticcompass.com/publications/basisgrammatica-bohairisch-koptisch/mockup-paperback.webp",
          ],
          offers: [
            expect.objectContaining({
              "@type": "Offer",
              url: "https://www.amazon.nl/dp/B0H8QVKK94",
            }),
          ],
        }),
        expect.objectContaining({
          bookFormat: "https://schema.org/Hardcover",
          isbn: "9798863142357",
        }),
      ]),
    );
  });

  it("publishes Parallel Paradigms as a book rather than an article", () => {
    const publication = getPublicationById("parallel-paradigms-coptic");

    expect(publication).not.toBeNull();

    const data = createPublicationStructuredData(publication!, "en");

    expect(data).toMatchObject({
      "@type": "Book",
      datePublished: "2026-07",
      isbn: "9798184913094",
    });
    expect(data).not.toHaveProperty("creativeWorkStatus");
    expect(data).not.toHaveProperty(
      "sameAs",
      "https://www.amazon.com/dp/B0H882L1T2",
    );
  });

  it("does not emit book-only edition fields for scholarly articles", () => {
    const source = getPublicationById("complex-verb-constructions-coptic");
    expect(source).not.toBeNull();

    const article: Publication = {
      ...source!,
      editions: [
        {
          id: "digital-edition",
          statement: { en: "Digital edition", nl: "Digitale editie" },
          publicationDate: "2026-08",
          formats: [{ id: "digital", binding: "digital" }],
        },
      ],
    };
    const data = createPublicationStructuredData(article, "en");

    expect(data).toMatchObject({
      "@type": "ScholarlyArticle",
      datePublished: "2026-08",
    });
    expect(data).not.toHaveProperty("bookEdition");
    expect(data).not.toHaveProperty("workExample");
    expect(data).not.toHaveProperty("isbn");
  });
});
