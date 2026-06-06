import { describe, expect, it } from "vitest";

import type { LexicalEntry } from "@/features/dictionary/types";
import { getFaqAnswerPlainText, listFaqItems } from "@/features/faq/lib/faq";

import {
  createDefinedTermStructuredData,
  createDictionaryPageStructuredData,
  createFaqPageStructuredData,
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
