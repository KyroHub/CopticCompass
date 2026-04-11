import { describe, expect, it } from "vitest";

import type { LexicalEntry } from "@/features/dictionary/types";

import {
  createDefinedTermStructuredData,
  createDictionaryPageStructuredData,
  createWebSiteStructuredData,
} from "./structuredData";

const lordEntry: LexicalEntry = {
  id: "cd_17",
  headword: "ϭⲱⲓⲥ",
  dialects: {
    B: {
      absolute: "ϭⲱⲓⲥ",
      absoluteVariants: ["⳪"],
      nominal: "",
      pronominal: "",
      stative: "",
    },
  },
  pos: "N",
  gender: "",
  english_meanings: ["lord"],
  greek_equivalents: ["κυριοσ"],
  raw: {
    word: "(B) ϭⲱⲓⲥ, ⳪",
    meaning: "lord",
  },
};

describe("structured dictionary data", () => {
  it("builds website structured data with a localized dictionary search action", () => {
    const data = createWebSiteStructuredData("nl");

    expect(data).toMatchObject({
      "@type": "WebSite",
      name: "Coptic Compass",
      alternateName: "Coptic Dictionary, Grammar, Publications, and Shenute AI",
      url: "https://kyrilloswannes.com/nl",
      inLanguage: ["en", "nl", "cop"],
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate:
            "https://kyrilloswannes.com/nl/dictionary?q={search_term_string}",
        },
      },
    });
  });

  it("builds dictionary page structured data as a collection page plus term set", () => {
    const data = createDictionaryPageStructuredData("en");

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      "@type": "CollectionPage",
      url: "https://kyrilloswannes.com/en/dictionary",
      mainEntity: {
        "@id": "https://kyrilloswannes.com/en/dictionary#defined-term-set",
      },
    });
    expect(data[1]).toMatchObject({
      "@type": "DefinedTermSet",
      url: "https://kyrilloswannes.com/en/dictionary",
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
});
