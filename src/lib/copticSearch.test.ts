import { describe, expect, it } from "vitest";

import {
  buildCopticSearchRegex,
  normalizeCopticSearchText,
} from "./copticSearch";

describe("coptic search helpers", () => {
  it("folds legacy and modern khei variants to the same canonical search form", () => {
    expect(normalizeCopticSearchText("ϧⲉⲛ")).toBe("ⳳⲉⲛ");
    expect(normalizeCopticSearchText("ⳳⲉⲛ")).toBe("ⳳⲉⲛ");
    expect(normalizeCopticSearchText("  ϦⲈⲚ  ")).toBe("ⳳⲉⲛ");
    expect(normalizeCopticSearchText("  ⳲⲈⲚ  ")).toBe("ⳳⲉⲛ");
  });

  it("builds a regex that matches old and new rendered glyph variants", () => {
    const regex = buildCopticSearchRegex("ⳲⲈⲚ");

    expect(regex?.test("ϦⲈⲚ")).toBe(true);
    expect(regex?.test("ϧⲉⲛ")).toBe(true);
    expect(regex?.test("ⳲⲈⲚ")).toBe(true);
    expect(regex?.test("ⳳⲉⲛ")).toBe(true);
  });

  it("ignores jinkim while matching Bohairic spellings", () => {
    expect(normalizeCopticSearchText("ⲙ̀ⲙⲟ=")).toBe("ⲙⲙⲟ=");
    expect(normalizeCopticSearchText("ⲙⲙⲟ=")).toBe("ⲙⲙⲟ=");

    const regex = buildCopticSearchRegex("ⲙ̀ⲙⲟ=");

    expect(regex?.test("ⲙ̀ⲙⲟ=")).toBe(true);
    expect(regex?.test("ⲙⲙⲟ=")).toBe(true);
  });
});
