import {
  grammarLesson01ConceptIds,
  grammarLesson01Id,
} from "../lesson-01-ids.ts";

import type { GrammarExampleDocument } from "../../schema.ts";

const lessonId = grammarLesson01Id;
const sectionId = `${lessonId}.section.bipartite-nominal-sentence`;
const conceptRefs = [
  grammarLesson01ConceptIds.bipartiteNominalSentence,
  grammarLesson01ConceptIds.nexusPronouns,
];

export const grammarLesson01NominalSentenceExamples: readonly GrammarExampleDocument[] =
  [
    {
      id: "grammar.example.lesson01.nominal-sentence.001",
      lessonId,
      sectionId,
      coptic: "Ⲟⲩⲓⲱⲧ ⲡⲉ.",
      translation: {
        en: "“He is a father.”",
        nl: "“Hij is een vader.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.002",
      lessonId,
      sectionId,
      coptic: "Ⲡⲁⲓⲱⲧ ⲡⲉ.",
      translation: {
        en: "“He is my father.”",
        nl: "“Hij is mijn vader.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.003",
      lessonId,
      sectionId,
      coptic: "Ⲡⲁⲓⲓⲱⲧ ⲡⲉ.",
      translation: {
        en: "“It is this father.”",
        nl: "“Het is deze vader.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.004",
      lessonId,
      sectionId,
      coptic: "Ⲧⲁⲙⲁⲩ ⲧⲉ.",
      dictionaryTokenOverrides: {
        Ⲧⲁⲙⲁⲩ: "228",
      },
      translation: {
        en: "“She is my mother.”",
        nl: "“Zij is mijn moeder.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.005",
      lessonId,
      sectionId,
      coptic: "Ⲟⲩⲥ̀ϩⲓⲙⲓ ⲧⲉ.",
      translation: {
        en: "“She is a woman.”",
        nl: "“Zij is een vrouw.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.006",
      lessonId,
      sectionId,
      coptic: "Ϩⲁⲛⲥⲱⲛⲓ ⲛⲉ.",
      translation: {
        en: "“They are sisters.”",
        nl: "“Zij zijn zussen.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.007",
      lessonId,
      sectionId,
      coptic: "Ϩⲁⲛⲣⲱⲙⲓ ⲛⲉ.",
      translation: {
        en: "“They are men.”",
        nl: "“Het zijn mannen.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
    {
      id: "grammar.example.lesson01.nominal-sentence.008",
      lessonId,
      sectionId,
      coptic: "Ⲛⲓⲁⲅⲓⲟⲥ ⲛⲉ.",
      translation: {
        en: "“They are the saints.”",
        nl: "“Het zijn de heiligen.”",
      },
      conceptRefs,
      dictionaryRefs: [],
      tags: ["lesson-1", "nominal-sentence", "nexus-pronoun"],
    },
  ] as const;
