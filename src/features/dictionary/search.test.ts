import { describe, expect, it } from "vitest";

import {
  prepareDictionaryForSearch,
  searchPreparedDictionary,
  searchPreparedDictionaryPage,
} from "./search";

import type { DictionaryClientEntry } from "./types";

const lordEntry: DictionaryClientEntry = {
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
};

const fatherEntry: DictionaryClientEntry = {
  id: "cd_18",
  headword: "ⲉⲓⲱⲧ",
  dialects: {
    B: {
      absolute: "ⲉⲓⲱⲧ",
      nominal: "",
      pronominal: "",
      stative: "",
    },
  },
  pos: "N",
  gender: "M",
  english_meanings: ["father"],
  greek_equivalents: [],
};

const elderEntry: DictionaryClientEntry = {
  id: "cd_63a",
  headword: "ⳳⲉⲗⲗⲱ",
  dialects: {
    B: {
      absolute: "ⳳⲉⲗⲗⲱ",
      nominal: "",
      pronominal: "",
      stative: "",
    },
  },
  pos: "N",
  gender: "",
  english_meanings: ["elder"],
  greek_equivalents: [],
};

const prepositionEntry: DictionaryClientEntry = {
  id: "cd_946",
  headword: "ⲛ-",
  dialects: {
    B: {
      absolute: "",
      nominal: "ⲛ̀-",
      pronominal: "ⲙ̀ⲙⲟ=",
      stative: "",
    },
  },
  pos: "PREP",
  gender: "",
  english_meanings: ["with, by"],
  greek_equivalents: [],
};

const runEntry: DictionaryClientEntry = {
  id: "cd_19",
  headword: "ⲃⲱⲕ",
  dialects: {
    S: {
      absolute: "ⲃⲱⲕ",
      nominal: "",
      pronominal: "",
      stative: "",
    },
  },
  pos: "V",
  gender: "",
  english_meanings: ["run"],
  greek_equivalents: [],
};

describe("dictionary search", () => {
  it("indexes absolute Bohairic variants alongside the main spelling", () => {
    const preparedDictionary = prepareDictionaryForSearch([lordEntry]);

    expect(
      searchPreparedDictionary("ϭⲱⲓⲥ", preparedDictionary, [lordEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_17"]);
    expect(
      searchPreparedDictionary("⳪", preparedDictionary, [lordEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_17"]);
  });

  it("treats legacy and modern khei variants as the same search character", () => {
    const preparedDictionary = prepareDictionaryForSearch([elderEntry]);

    expect(
      searchPreparedDictionary("ϧⲉⲗⲗⲱ", preparedDictionary, [elderEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_63a"]);
    expect(
      searchPreparedDictionary("ⳳⲉⲗⲗⲱ", preparedDictionary, [elderEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_63a"]);
    expect(
      searchPreparedDictionary("ϦⲈⲖⲖⲰ", preparedDictionary, [elderEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_63a"]);
    expect(
      searchPreparedDictionary("ⳲⲈⲖⲖⲰ", preparedDictionary, [elderEntry]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["cd_63a"]);
    expect(
      searchPreparedDictionary(
        "ⳲⲈⲖⲖⲰ",
        preparedDictionary,
        [elderEntry],
        true,
      ).map((entry) => entry.id),
    ).toEqual(["cd_63a"]);
  });

  it("treats jinkim-marked and unmarked bound forms as equivalent", () => {
    const preparedDictionary = prepareDictionaryForSearch([prepositionEntry]);

    expect(
      searchPreparedDictionary("ⲙ̀ⲙⲟ=", preparedDictionary, [
        prepositionEntry,
      ]).map((entry) => entry.id),
    ).toEqual(["cd_946"]);
    expect(
      searchPreparedDictionary("ⲙⲙⲟ=", preparedDictionary, [
        prepositionEntry,
      ]).map((entry) => entry.id),
    ).toEqual(["cd_946"]);
    expect(
      searchPreparedDictionary("ⲛ̀-", preparedDictionary, [
        prepositionEntry,
      ]).map((entry) => entry.id),
    ).toEqual(["cd_946"]);
    expect(
      searchPreparedDictionary("ⲛ-", preparedDictionary, [
        prepositionEntry,
      ]).map((entry) => entry.id),
    ).toEqual(["cd_946"]);
  });

  it("pages filtered results without building the full matched list", () => {
    const dictionary = [lordEntry, fatherEntry, elderEntry, runEntry];
    const preparedDictionary = prepareDictionaryForSearch(dictionary);

    expect(
      searchPreparedDictionaryPage({
        dictionary,
        limit: 1,
        offset: 0,
        preparedDictionary,
        query: "",
        selectedDialect: "B",
        selectedPartOfSpeech: "N",
      }),
    ).toMatchObject({
      entries: [{ id: "cd_17" }],
      hasMore: true,
      nextOffset: 1,
      totalEntries: 4,
      totalMatches: 3,
    });

    expect(
      searchPreparedDictionaryPage({
        dictionary,
        limit: 1,
        offset: 1,
        preparedDictionary,
        query: "",
        selectedDialect: "B",
        selectedPartOfSpeech: "N",
      }),
    ).toMatchObject({
      entries: [{ id: "cd_18" }],
      hasMore: true,
      nextOffset: 2,
      totalMatches: 3,
    });
  });
});
