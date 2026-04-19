import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { LexicalEntry } from "@/features/dictionary/types";

function hasUppercaseCopticCharacter(value: string) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const isCoptic =
      codePoint !== undefined &&
      ((codePoint >= 0x2c80 && codePoint <= 0x2cff) ||
        (codePoint >= 0x03e2 && codePoint <= 0x03ef));

    if (isCoptic && character !== character.toLowerCase()) {
      return true;
    }
  }

  return false;
}

describe("dictionary dataset guardrails", () => {
  it("keeps modern lowercase Coptic spellings in the checked-in dictionary snapshot", () => {
    const filePath = path.join(process.cwd(), "public/data/dictionary.json");
    const dictionaryJson = fs.readFileSync(filePath, "utf8");

    expect(dictionaryJson).not.toMatch(/[Ϧϧ]/u);
    expect(dictionaryJson).toMatch(/[Ⳳⳳ]/u);
    expect(hasUppercaseCopticCharacter(dictionaryJson)).toBe(false);
  });

  it("stores the ϩⲛ-/ⳳⲉⲛ- preposition entry as bound-only nominal and pronominal forms", () => {
    const filePath = path.join(process.cwd(), "public/data/dictionary.json");
    const dictionary = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as LexicalEntry[];
    const entry = dictionary.find((candidate) => candidate.id === "cd_361");

    expect(entry).toBeDefined();
    expect(entry?.dialects.S).toMatchObject({
      absolute: "",
      nominal: "ϩⲛ-",
      pronominal: "ⲛϩⲏⲧ=",
    });
    expect(entry?.dialects.A).toMatchObject({
      absolute: "",
      nominal: "ⳉⲛ-",
      pronominal: "ⲛⳉⲏⲧ=",
    });
    expect(entry?.dialects.B).toMatchObject({
      absolute: "",
      nominal: "ⳳⲉⲛ-",
      pronominal: "ⲛ̀ⳳⲏⲧ=",
    });
  });

  it("keeps the expanded preposition set tagged as PREP", () => {
    const filePath = path.join(process.cwd(), "public/data/dictionary.json");
    const dictionary = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as LexicalEntry[];
    const prepositionEntryIds = [
      "cd_355",
      "cd_361",
      "cd_533",
      "cd_611",
      "cd_892",
      "cd_946",
      "cd_947",
      "cd_948",
      "cd_949",
      "cd_950",
      "cd_1173",
      "cd_1713",
      "cd_2073",
      "cd_2382",
      "cd_6272",
      "cd_6273",
      "cd_6274",
      "cd_6275",
      "cd_6276",
      "cd_6277",
      "cd_6278",
      "cd_6279",
      "cd_6280",
      "cd_6281",
      "cd_6282",
      "cd_6283",
      "cd_6284",
      "cd_6285",
      "cd_6286",
      "cd_6287",
      "cd_6288",
    ] as const;

    for (const id of prepositionEntryIds) {
      const entry = dictionary.find((candidate) => candidate.id === id);

      expect(entry).toBeDefined();
      expect(entry?.pos).toBe("PREP");
    }
  });

  it("keeps the expanded bohairic preposition set in canonical bound-form style", () => {
    const filePath = path.join(process.cwd(), "public/data/dictionary.json");
    const dictionary = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as LexicalEntry[];
    const boundOnlyEntries = [
      {
        id: "cd_611",
        nominal: "ⲉ̀-",
        pronominal: "ⲉ̀ⲣⲟ=",
        etymology: "Egy",
      },
      {
        id: "cd_533",
        nominal: "ⲁⲧϭⲛⲉ-",
        pronominal: "ⲁⲧϭⲛⲟⲩ=",
        etymology: "Egy",
      },
      {
        id: "cd_946",
        nominal: "ⲛ̀-",
        pronominal: "ⲙ̀ⲙⲟ=",
        etymology: "Egy",
      },
      {
        id: "cd_947",
        nominal: "ⲛ̀-",
        pronominal: "ⲛⲁ=",
        etymology: "Egy",
      },
      {
        id: "cd_1173",
        nominal: "ⲛ̀ⲧⲉ-",
        pronominal: "ⲛ̀ⲧⲁ=",
        etymology: "Egy",
      },
      {
        id: "cd_1713",
        nominal: "ⲟⲩⲧⲉ-",
        pronominal: "ⲟⲩⲧⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲕⲁⲧⲁ-",
        nominal: "ⲕⲁⲧⲁ-",
        pronominal: "ⲕⲁⲧⲁⲣⲟ=",
        etymology: "Gr",
      },
      {
        headword: "ϩⲱⲥ-",
        nominal: "ϩⲱⲥ-",
        pronominal: "",
        etymology: "Gr",
      },
      {
        headword: "ⲙⲉⲛⲉⲛⲥⲁ-",
        nominal: "ⲙⲉⲛⲉⲛⲥⲁ-",
        pronominal: "ⲙⲉⲛⲉⲛⲥⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ⲃⲟⲗ ⳳⲉⲛ-",
        nominal: "ⲉ̀ⲃⲟⲗ ⳳⲉⲛ-",
        pronominal: "ⲉ̀ⲃⲟⲗ ⲛ̀ⳳⲏⲧ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ-",
        nominal: "ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ-",
        pronominal: "ⲉ̀ⲃⲟⲗ ϩⲓⲧⲟⲧ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ⲃⲟⲗ ⲛ̀-",
        nominal: "ⲉ̀ⲃⲟⲗ ⲛ̀-",
        pronominal: "ⲉ̀ⲃⲟⲗ ⲙ̀ⲙⲟ=",
        etymology: "Egy",
      },
      {
        headword: "ⲛ̀ⲥⲁ-",
        nominal: "ⲛ̀ⲥⲁ-",
        pronominal: "ⲛ̀ⲥⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ϫⲉⲛ-",
        nominal: "ⲉ̀ϫⲉⲛ-",
        pronominal: "ⲉ̀ϫⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ϩⲓϫⲉⲛ-",
        nominal: "ϩⲓϫⲉⲛ-",
        pronominal: "ϩⲓϫⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ϩ̀ⲣⲏⲓ ⲉ̀ϫⲉⲛ-",
        nominal: "ⲉ̀ϩ̀ⲣⲏⲓ ⲉ̀ϫⲉⲛ-",
        pronominal: "ⲉ̀ϩ̀ⲣⲏⲓ ⲉ̀ϫⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲉ̀ϩ̀ⲣⲏⲓ ϩⲓϫⲉⲛ-",
        nominal: "ⲉ̀ϩ̀ⲣⲏⲓ ϩⲓϫⲉⲛ-",
        pronominal: "ⲉ̀ϩ̀ⲣⲏⲓ ϩⲓϫⲱ=",
        etymology: "Egy",
      },
      {
        headword: "ⲛ̀ⳳ̀ⲣⲏⲓ ⳳⲉⲛ-",
        nominal: "ⲛ̀ⳳ̀ⲣⲏⲓ ⳳⲉⲛ-",
        pronominal: "ⲛ̀ⳳ̀ⲣⲏⲓ ⲛ̀ⳳⲏⲧ=",
        etymology: "Egy",
      },
      {
        headword: "ⲛⲁϩ̀ⲣⲉⲛ-",
        nominal: "ⲛⲁϩ̀ⲣⲉⲛ-",
        pronominal: "ⲛⲁϩ̀ⲣⲁ=",
        etymology: "Egy",
      },
      {
        headword: "ⳳⲁⲧⲉⲛ-",
        nominal: "ⳳⲁⲧⲉⲛ-",
        pronominal: "ⳳⲁⲧⲟⲧ=",
        etymology: "Egy",
      },
      {
        headword: "ⲛ̀ⲧⲉⲛ-",
        nominal: "ⲛ̀ⲧⲉⲛ-",
        pronominal: "ⲛ̀ⲧⲟⲧ=",
        etymology: "Egy",
      },
      {
        headword: "ϩⲓⲫⲁϩⲟⲩ ⲛ̀-",
        nominal: "ϩⲓⲫⲁϩⲟⲩ ⲛ̀-",
        pronominal: "ϩⲓⲫⲁϩⲟⲩ ⲙ̀ⲙⲟ=",
        etymology: "Egy",
      },
      {
        headword: "ϩⲓⲧⲉⲛ-",
        nominal: "ϩⲓⲧⲉⲛ-",
        pronominal: "ϩⲓⲧⲟⲧ=",
        etymology: "Egy",
      },
    ] as const;

    for (const expected of boundOnlyEntries) {
      const entry =
        "id" in expected
          ? dictionary.find((candidate) => candidate.id === expected.id)
          : dictionary.find(
              (candidate) => candidate.headword === expected.headword,
            );

      expect(entry).toBeDefined();
      expect(entry?.dialects.B).toMatchObject({
        absolute: "",
        nominal: expected.nominal,
        pronominal: expected.pronominal,
      });
      expect(entry?.etymology).toBe(expected.etymology);
    }
  });
});
