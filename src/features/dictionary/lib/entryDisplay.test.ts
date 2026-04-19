import { describe, expect, it } from "vitest";

import type { LexicalEntry } from "@/features/dictionary/types";

import {
  formatDialectForms,
  getPreferredEntryDialectKey,
  getPreferredEntryDisplaySpelling,
} from "./entryDisplay";

function createEntry(
  overrides: Partial<LexicalEntry> & Pick<LexicalEntry, "id" | "headword">,
): LexicalEntry {
  const { id, headword, ...rest } = overrides;

  return {
    id,
    headword,
    dialects: {},
    pos: "N",
    gender: "",
    english_meanings: [],
    greek_equivalents: [],
    raw: {
      meaning: "",
      word: headword,
    },
    ...rest,
  };
}

describe("dictionary entry display helpers", () => {
  it("prefers Bohairic forms when the app default dialect is Bohairic", () => {
    const entry = createEntry({
      id: "cd_173",
      headword: "ⲥⲁϫⲓ",
      dialects: {
        B: {
          absolute: "ϭⲁϫⲓ",
          absoluteVariants: ["ϫⲁϫⲓ"],
          nominal: "ϭⲁϫ",
          pronominal: "",
          stative: "",
        },
        S: {
          absolute: "ⲥⲁϫⲓ",
          nominal: "",
          pronominal: "",
          stative: "",
        },
      },
    });

    expect(getPreferredEntryDialectKey(entry)).toBe("B");
    expect(getPreferredEntryDisplaySpelling(entry)).toBe("ϭⲁϫⲓ, ϫⲁϫⲓ ϭⲁϫ");
  });

  it("falls back to Sahidic when Bohairic is unavailable", () => {
    const entry = createEntry({
      id: "cd_174",
      headword: "ⲥⲁϫⲓ",
      dialects: {
        S: {
          absolute: "ⲥⲁϫⲓ",
          nominal: "",
          pronominal: "",
          stative: "",
        },
      },
    });

    expect(getPreferredEntryDialectKey(entry)).toBe("S");
    expect(getPreferredEntryDisplaySpelling(entry)).toBe("ⲥⲁϫⲓ");
  });

  it("does not prepend the headword when a dialect only has bound forms", () => {
    const entry = createEntry({
      id: "cd_361",
      headword: "ϩⲛ-",
      dialects: {
        B: {
          absolute: "",
          nominal: "ⳳⲉⲛ-",
          pronominal: "ⲛⳳⲏⲧ=",
          stative: "",
        },
      },
    });

    expect(formatDialectForms(entry.dialects.B!, entry.headword)).toBe(
      "ⳳⲉⲛ-/ⲛⳳⲏⲧ=",
    );
    expect(getPreferredEntryDisplaySpelling(entry)).toBe("ⳳⲉⲛ-/ⲛⳳⲏⲧ=");
  });

  it("shows the Bohairic with entry as nominal plus pronominal bound forms", () => {
    const entry = createEntry({
      id: "cd_892",
      headword: "ⲙⲛ-",
      dialects: {
        B: {
          absolute: "",
          nominal: "ⲛⲉⲙ-",
          pronominal: "ⲛⲉⲙⲁ=",
          stative: "",
        },
      },
      pos: "PREP",
      english_meanings: ["preposition, with"],
    });

    expect(formatDialectForms(entry.dialects.B!, entry.headword)).toBe(
      "ⲛⲉⲙ-/ⲛⲉⲙⲁ=",
    );
    expect(getPreferredEntryDisplaySpelling(entry)).toBe("ⲛⲉⲙ-/ⲛⲉⲙⲁ=");
  });

  it("shows the Bohairic between entry as nominal plus pronominal bound forms", () => {
    const entry = createEntry({
      id: "cd_1713",
      headword: "ⲟⲩⲧⲉ-",
      dialects: {
        B: {
          absolute: "",
          nominal: "ⲟⲩⲧⲉ-",
          pronominal: "ⲟⲩⲧⲱ=",
          stative: "",
        },
      },
      pos: "PREP",
      english_meanings: ["between, among"],
    });

    expect(formatDialectForms(entry.dialects.B!, entry.headword)).toBe(
      "ⲟⲩⲧⲉ-/ⲟⲩⲧⲱ=",
    );
    expect(getPreferredEntryDisplaySpelling(entry)).toBe("ⲟⲩⲧⲉ-/ⲟⲩⲧⲱ=");
  });
});
