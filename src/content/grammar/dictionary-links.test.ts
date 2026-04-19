import { describe, expect, it } from "vitest";

import {
  enrichGrammarDatasetSnapshotWithDictionaryLinks,
  getBohairicDictionaryEntryIdForWord,
} from "./dictionary-links.ts";
import { getGrammarDatasetSnapshot } from "./registry.ts";

import type { GrammarBlock, GrammarInline } from "./schema.ts";

function getParagraphCopticNode(
  block: GrammarBlock | undefined,
): GrammarInline | undefined {
  if (!block || block.type !== "paragraph") {
    return undefined;
  }

  return block.content.find((node) => node.type === "coptic");
}

describe("grammar dictionary link enrichment", () => {
  it("resolves only unique Bohairic entry matches and ignores combining diacritics", () => {
    expect(getBohairicDictionaryEntryIdForWord("Ⲥⲟⲛ")).toBe("cd_173");
    expect(getBohairicDictionaryEntryIdForWord("ⲥ̀ϩⲓⲙⲓ")).toBe("cd_142");
    expect(getBohairicDictionaryEntryIdForWord("Ⲥⲱⲛⲓ")).toBe("cd_173a");
    expect(getBohairicDictionaryEntryIdForWord("Ⲟⲩⲥⲱⲛⲓ")).toBe("cd_173a");
    expect(getBohairicDictionaryEntryIdForWord("Ⲡⲁⲓⲥⲟⲛ")).toBe("cd_173");
    expect(getBohairicDictionaryEntryIdForWord("Ⲟⲩⲓⲱⲧ")).toBe("cd_57");
    expect(getBohairicDictionaryEntryIdForWord("ϭⲱⲓⲥ")).toBe("cd_17");
    expect(getBohairicDictionaryEntryIdForWord("⳪")).toBe("cd_17");
    expect(getBohairicDictionaryEntryIdForWord("ϧⲉⲗⲗⲱ")).toBe("cd_63a");
    expect(getBohairicDictionaryEntryIdForWord("ⳳⲉⲗⲗⲱ")).toBe("cd_63a");
    expect(getBohairicDictionaryEntryIdForWord("ϦⲈⲖⲖⲰ")).toBe("cd_63a");
    expect(getBohairicDictionaryEntryIdForWord("ⳲⲈⲖⲖⲰ")).toBe("cd_63a");
    expect(getBohairicDictionaryEntryIdForWord("ϧⲉⲛ-")).toBe("cd_361");
    expect(getBohairicDictionaryEntryIdForWord("ⳳⲉⲛ-")).toBe("cd_361");
    expect(getBohairicDictionaryEntryIdForWord("ϦⲈⲚ-")).toBe("cd_361");
    expect(getBohairicDictionaryEntryIdForWord("ⳲⲈⲚ-")).toBe("cd_361");
    expect(getBohairicDictionaryEntryIdForWord("Ⲛ̀ⲑⲟⲥ")).toBe("cd_493a");
    expect(getBohairicDictionaryEntryIdForWord("Ⲛ̀ⲑⲱⲟⲩ")).toBe("cd_493b");
    expect(getBohairicDictionaryEntryIdForWord("Ϣⲏⲣⲓ")).toBeNull();
    expect(getBohairicDictionaryEntryIdForWord("ⲙⲁⲩ")).toBeNull();
    expect(getBohairicDictionaryEntryIdForWord("Ⲧⲁⲙⲁⲩ")).toBeNull();
    expect(getBohairicDictionaryEntryIdForWord("Ⲛ̀ⲑⲟϥ")).toBe("cd_1178");
  });

  it("annotates canonical lesson content when a unique Bohairic match exists", () => {
    const snapshot = enrichGrammarDatasetSnapshotWithDictionaryLinks(
      getGrammarDatasetSnapshot(),
    );
    const lesson = snapshot.lessons.find((item) => item.slug === "lesson-1");
    const vocabularySection = lesson?.sections.find(
      (section) => section.slug === "vocabulary-bare-nouns",
    );
    const vocabularyTable = vocabularySection?.blocks.en[1];

    expect(vocabularyTable?.type).toBe("table");

    if (!vocabularyTable || vocabularyTable.type !== "table") {
      return;
    }

    const masculineBrotherWord = getParagraphCopticNode(
      vocabularyTable.rows[2]?.cells.masculineWord[0],
    );
    const feminineWomanWord = getParagraphCopticNode(
      vocabularyTable.rows[0]?.cells.feminineWord[0],
    );
    const feminineMotherWord = getParagraphCopticNode(
      vocabularyTable.rows[1]?.cells.feminineWord[0],
    );
    const feminineSisterWord = getParagraphCopticNode(
      vocabularyTable.rows[2]?.cells.feminineWord[0],
    );
    const masculineSonWord = getParagraphCopticNode(
      vocabularyTable.rows[3]?.cells.masculineWord[0],
    );

    expect(feminineWomanWord).toMatchObject({
      type: "coptic",
      text: "Ⲥ̀ϩⲓⲙⲓ",
      dictionaryEntryId: "cd_142",
    });
    expect(feminineMotherWord).toMatchObject({
      type: "coptic",
      text: "Ⲙⲁⲩ",
      dictionaryEntryId: "cd_215",
    });
    expect(feminineSisterWord).toMatchObject({
      type: "coptic",
      text: "Ⲥⲱⲛⲓ",
      dictionaryEntryId: "cd_173a",
    });
    expect(masculineBrotherWord).toMatchObject({
      type: "coptic",
      text: "Ⲥⲟⲛ",
      dictionaryEntryId: "cd_173",
    });
    expect(masculineSonWord).toMatchObject({
      type: "coptic",
      text: "Ϣⲏⲣⲓ",
      dictionaryEntryId: "cd_20",
    });

    const motherExample = snapshot.examples.find(
      (example) =>
        example.id === "grammar.example.lesson01.nominal-sentence.004",
    );
    const everyManExample = snapshot.examples.find(
      (example) =>
        example.id === "grammar.example.lesson01.zero-determination.001",
    );

    expect(motherExample?.copticSegments).toMatchObject([
      { text: "Ⲧⲁⲙⲁⲩ", dictionaryEntryId: "cd_215" },
      { text: " " },
      { text: "ⲧⲉ" },
      { text: "." },
    ]);
    expect(everyManExample?.copticSegments).toMatchObject([
      { text: "Ø-ⲣⲱⲙⲓ", dictionaryEntryId: "cd_21" },
      { text: " " },
      { text: "ⲛⲓⲃⲉⲛ" },
    ]);
  });
});
