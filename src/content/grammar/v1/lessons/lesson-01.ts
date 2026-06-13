import { grammarLesson01NominalSentenceExamples } from "../examples/lesson-01-nominal-sentences.ts";
import { grammarLesson01ZeroDeterminationExamples } from "../examples/lesson-01-zero-determination.ts";
import { grammarLesson01Exercise01 } from "../exercises/lesson-01-exercise-01.ts";
import {
  grammarLesson01ConceptIdList,
  grammarLesson01ConceptIds,
  grammarLesson01Id,
  grammarLesson01SourceIdList,
} from "../lesson-01-ids.ts";
import { grammarDatasetRights } from "../rights.ts";

import type {
  GrammarBlock,
  GrammarInline,
  GrammarLessonDocument,
} from "../../schema.ts";

const text = (value: string): GrammarInline => ({ type: "text", text: value });
const coptic = (value: string, dictionaryEntryId?: string): GrammarInline => ({
  type: "coptic",
  text: value,
  ...(dictionaryEntryId ? { dictionaryEntryId } : {}),
});
const copticSpan = (...children: GrammarInline[]): GrammarInline => ({
  type: "copticSpan",
  children,
});
const em = (value: string): GrammarInline => ({
  type: "em",
  children: [text(value)],
});
const smallCaps = (value: string): GrammarInline => ({
  type: "smallCaps",
  children: [text(value)],
});
const underline = (...children: GrammarInline[]): GrammarInline => ({
  type: "underline",
  children,
});
const superscript = (...children: GrammarInline[]): GrammarInline => ({
  type: "superscript",
  children,
});
const footnoteRef = (ref: string): GrammarInline => ({
  type: "footnoteRef",
  ref,
});
const conceptRef = (ref: string, fallback: string): GrammarInline => ({
  type: "conceptRef",
  ref,
  fallback,
});
const link = (href: string, ...children: GrammarInline[]): GrammarInline => ({
  type: "link",
  href,
  children,
});
const paragraph = (...content: GrammarInline[]): GrammarBlock => ({
  type: "paragraph",
  content,
});
const paragraphCell = (...content: GrammarInline[]): GrammarBlock[] => [
  paragraph(...content),
];

const lessonId = grammarLesson01Id;
const zeroDeterminationExampleIds =
  grammarLesson01ZeroDeterminationExamples.map((example) => example.id);
const nominalSentenceExampleIds = grammarLesson01NominalSentenceExamples.map(
  (example) => example.id,
);

export const grammarLesson01Document: GrammarLessonDocument = {
  id: lessonId,
  slug: "lesson-1",
  number: 1,
  status: "published",
  title: {
    en: "Lesson 01",
    nl: "Les 01",
  },
  summary: {
    en: "Master the basics of Coptic nouns, determiners, and independent personal pronouns.",
    nl: "Beheers de basis van Koptische zelfstandige naamwoorden, determinatoren en onafhankelijke persoonlijke voornaamwoorden.",
  },
  description: {
    en: "Foundational lesson covering noun classes, significant letters, determiners, nominal sentences, pronouns, and a reviewed translation exercise.",
    nl: "Basisles over naamwoordklassen, significante letters, determinatoren, nominale zinnen, voornaamwoorden en een nagekeken vertaaloefening.",
  },
  tags: ["bohairic", "foundations", "nouns", "determiners", "pronouns"],
  rights: grammarDatasetRights,
  sectionOrder: [
    `${lessonId}.section.definitions`,
    `${lessonId}.section.vocabulary-bare-nouns`,
    `${lessonId}.section.significant-letters`,
    `${lessonId}.section.determiner-selection`,
    `${lessonId}.section.zero-determination`,
    `${lessonId}.section.bipartite-nominal-sentence`,
    `${lessonId}.section.independent-pronouns`,
    `${lessonId}.section.abbreviations`,
    `${lessonId}.section.exercise-01`,
  ],
  sections: [
    {
      id: `${lessonId}.section.definitions`,
      slug: "definitions",
      lessonId,
      order: 1,
      title: {
        en: "Definitions",
        nl: "Definities",
      },
      tags: ["terminology", "foundations"],
      conceptRefs: [
        grammarLesson01ConceptIds.bareNoun,
        grammarLesson01ConceptIds.determinedNoun,
      ],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Introduces the distinction between bare nouns and determined nouns as the conceptual starting point for the lesson.",
        nl: "Introduceert het onderscheid tussen kale zelfstandige naamwoorden en gedetermineerde naamwoorden als conceptueel vertrekpunt van de les.",
      },
      blocks: {
        en: [
          {
            type: "list",
            style: "ordered",
            items: [
              {
                id: `${lessonId}.section.definitions.item.bare-noun`,
                blocks: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "strong",
                        children: [
                          conceptRef(
                            grammarLesson01ConceptIds.bareNoun,
                            "A bare noun",
                          ),
                        ],
                      },
                      {
                        type: "text",
                        text: " is a base word without any form of determination (definiteness), which often takes the form of prefixes.",
                      },
                    ],
                  },
                ],
              },
              {
                id: `${lessonId}.section.definitions.item.determined-noun`,
                blocks: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "strong",
                        children: [
                          conceptRef(
                            grammarLesson01ConceptIds.determinedNoun,
                            "A determined (definite) noun",
                          ),
                        ],
                      },
                      {
                        type: "text",
                        text: " is provided with a determiner, frequently in the form of a prefix.",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        nl: [
          {
            type: "list",
            style: "ordered",
            items: [
              {
                id: `${lessonId}.section.definitions.item.bare-noun.nl`,
                blocks: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "strong",
                        children: [
                          { type: "text", text: "Een kaal substantief" },
                        ],
                      },
                      {
                        type: "text",
                        text: " (zelfstandig naamwoord) is een basiswoord zonder enige vorm van determinatie (bepaaldheid), vaak in de vorm van prefixen (voorvoegsels).",
                      },
                    ],
                  },
                ],
              },
              {
                id: `${lessonId}.section.definitions.item.determined-noun.nl`,
                blocks: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "strong",
                        children: [
                          {
                            type: "text",
                            text: "Een gedetermineerd (bepaald) substantief",
                          },
                        ],
                      },
                      {
                        type: "text",
                        text: " is voorzien van een determinator (bepaler), vaak in de vorm van een voorvoegsel.",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.vocabulary-bare-nouns`,
      slug: "vocabulary-bare-nouns",
      lessonId,
      order: 2,
      title: {
        en: "Vocabulary: Bare Nouns",
        nl: "Woordenschat: Kale zelfstandige naamwoorden",
      },
      tags: ["vocabulary", "gender", "nouns"],
      conceptRefs: [
        grammarLesson01ConceptIds.bareNoun,
        grammarLesson01ConceptIds.determinerSelection,
      ],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Collects core masculine and feminine noun pairs used to anchor the lesson’s noun and gender patterns.",
        nl: "Verzamelt kernparen van mannelijke en vrouwelijke zelfstandige naamwoorden die de naamwoord- en geslachtspatronen van de les dragen.",
      },
      blocks: {
        en: [
          paragraph(
            text("Coptic distinguishes two genders, masculine "),
            smallCaps("m"),
            text(" and feminine "),
            smallCaps("f"),
            text(", and two numbers, singular "),
            smallCaps("s"),
            text(" and plural "),
            smallCaps("p"),
            text(
              ". This information is often coded in the determiner prefix rather than in the bare noun itself. See the next section on ",
            ),
            link(
              `#${lessonId}.section.determiner-selection`,
              text("Determiner Selection"),
            ),
            text(" for the first practical application."),
          ),
          {
            type: "table",
            id: `${lessonId}.section.vocabulary-bare-nouns.table`,
            tableLayout: "fixed",
            headerRows: [
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.header-row`,
                cells: [
                  {
                    id: "masculine-group",
                    label: { en: "Masculine m", nl: "Masculine m" },
                    inlineLabel: {
                      en: [text("Masculine "), smallCaps("m")],
                      nl: [text("Masculine "), smallCaps("m")],
                    },
                    colSpan: 2,
                    align: "center",
                  },
                  {
                    id: "feminine-group",
                    label: { en: "Feminine f", nl: "Vrouwelijk v" },
                    inlineLabel: {
                      en: [text("Feminine "), smallCaps("f")],
                      nl: [text("Vrouwelijk "), smallCaps("v")],
                    },
                    colSpan: 2,
                    align: "center",
                  },
                ],
              },
            ],
            columns: [
              { id: "masculineWord", label: { en: "", nl: "" }, width: "25%" },
              {
                id: "masculineMeaning",
                label: { en: "", nl: "" },
                width: "25%",
              },
              { id: "feminineWord", label: { en: "", nl: "" }, width: "25%" },
              {
                id: "feminineMeaning",
                label: { en: "", nl: "" },
                width: "25%",
              },
            ],
            rows: [
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.1`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲣⲱⲙⲓ")),
                  masculineMeaning: paragraphCell(text("“man, human”")),
                  feminineWord: paragraphCell(coptic("Ⲥ̀ϩⲓⲙⲓ")),
                  feminineMeaning: paragraphCell(text("“woman, wife”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.2`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲓⲱⲧ")),
                  masculineMeaning: paragraphCell(text("“father”")),
                  feminineWord: paragraphCell(coptic("Ⲙⲁⲩ", "228")),
                  feminineMeaning: paragraphCell(text("“mother”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.3`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲥⲟⲛ")),
                  masculineMeaning: paragraphCell(text("“brother”")),
                  feminineWord: paragraphCell(coptic("Ⲥⲱⲛⲓ")),
                  feminineMeaning: paragraphCell(text("“sister”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.4`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ϣⲏⲣⲓ", "20")),
                  masculineMeaning: paragraphCell(text("“son”")),
                  feminineWord: paragraphCell(coptic("Ϣⲉⲣⲓ")),
                  feminineMeaning: paragraphCell(text("“daughter”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.5`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲕⲁϩⲓ")),
                  masculineMeaning: paragraphCell(text("“earth”")),
                  feminineWord: paragraphCell(coptic("Ⲫⲉ")),
                  feminineMeaning: paragraphCell(text("“heaven, sky”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.6`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲁⲅⲓⲟⲥ")),
                  masculineMeaning: paragraphCell(text("“saint”")),
                  feminineWord: paragraphCell(coptic("Ⲉⲕⲕ̀ⲗⲏⲥⲓⲁ̀")),
                  feminineMeaning: paragraphCell(text("“church”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.7`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ϯⲙⲓ")),
                  masculineMeaning: paragraphCell(text("“village”")),
                  feminineWord: paragraphCell(coptic("Ⲡⲟⲗⲓⲥ")),
                  feminineMeaning: paragraphCell(text("“city”")),
                },
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            blocks: [
              paragraph(
                text(
                  "Note: A neuter gender can occasionally occur, especially with etymologically Greek adjectives. Its productive role is limited, but it can still help distinguish animate from inanimate referents.",
                ),
              ),
            ],
          },
        ],
        nl: [
          paragraph(
            text("Het Koptisch onderscheidt twee geslachten, mannelijk "),
            smallCaps("m"),
            text(" en vrouwelijk "),
            smallCaps("v"),
            text(", en twee getallen, singularis "),
            smallCaps("s"),
            text(" en pluralis "),
            smallCaps("p"),
            text(
              ". Zulke informatie zit vaak vervat in het determinerprefix eerder dan in het kale zelfstandig naamwoord zelf. Zie de volgende sectie over ",
            ),
            link(
              `#${lessonId}.section.determiner-selection`,
              text("determinatoren"),
            ),
            text(" voor een eerste praktische toepassing."),
          ),
          {
            type: "table",
            id: `${lessonId}.section.vocabulary-bare-nouns.table`,
            tableLayout: "fixed",
            headerRows: [
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.header-row.nl`,
                cells: [
                  {
                    id: "masculine-group.nl",
                    label: { en: "Mannelijk m", nl: "Mannelijk m" },
                    inlineLabel: {
                      en: [text("Mannelijk "), smallCaps("m")],
                      nl: [text("Mannelijk "), smallCaps("m")],
                    },
                    colSpan: 2,
                    align: "center",
                  },
                  {
                    id: "feminine-group.nl",
                    label: { en: "Vrouwelijk v", nl: "Vrouwelijk v" },
                    inlineLabel: {
                      en: [text("Vrouwelijk "), smallCaps("v")],
                      nl: [text("Vrouwelijk "), smallCaps("v")],
                    },
                    colSpan: 2,
                    align: "center",
                  },
                ],
              },
            ],
            columns: [
              { id: "masculineWord", label: { en: "", nl: "" }, width: "25%" },
              {
                id: "masculineMeaning",
                label: { en: "", nl: "" },
                width: "25%",
              },
              { id: "feminineWord", label: { en: "", nl: "" }, width: "25%" },
              {
                id: "feminineMeaning",
                label: { en: "", nl: "" },
                width: "25%",
              },
            ],
            rows: [
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.1.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲣⲱⲙⲓ")),
                  masculineMeaning: paragraphCell(text("“man, mens”")),
                  feminineWord: paragraphCell(coptic("Ⲥ̀ϩⲓⲙⲓ")),
                  feminineMeaning: paragraphCell(text("“vrouw, echtgenote”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.2.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲓⲱⲧ")),
                  masculineMeaning: paragraphCell(text("“vader”")),
                  feminineWord: paragraphCell(coptic("Ⲙⲁⲩ", "228")),
                  feminineMeaning: paragraphCell(text("“moeder”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.3.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲥⲟⲛ")),
                  masculineMeaning: paragraphCell(text("“broer”")),
                  feminineWord: paragraphCell(coptic("Ⲥⲱⲛⲓ")),
                  feminineMeaning: paragraphCell(text("“zus”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.4.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ϣⲏⲣⲓ", "20")),
                  masculineMeaning: paragraphCell(text("“zoon”")),
                  feminineWord: paragraphCell(coptic("Ϣⲉⲣⲓ")),
                  feminineMeaning: paragraphCell(text("“dochter”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.5.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲕⲁϩⲓ")),
                  masculineMeaning: paragraphCell(text("“aarde”")),
                  feminineWord: paragraphCell(coptic("Ⲫⲉ")),
                  feminineMeaning: paragraphCell(text("“hemel”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.6.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ⲁⲅⲓⲟⲥ")),
                  masculineMeaning: paragraphCell(text("“heilige, sint”")),
                  feminineWord: paragraphCell(coptic("Ⲉⲕⲕ̀ⲗⲏⲥⲓⲁ̀")),
                  feminineMeaning: paragraphCell(text("“kerk”")),
                },
              },
              {
                id: `${lessonId}.section.vocabulary-bare-nouns.row.7.nl`,
                cells: {
                  masculineWord: paragraphCell(coptic("Ϯⲙⲓ")),
                  masculineMeaning: paragraphCell(text("“dorp”")),
                  feminineWord: paragraphCell(coptic("Ⲡⲟⲗⲓⲥ")),
                  feminineMeaning: paragraphCell(text("“stad”")),
                },
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            blocks: [
              paragraph(
                text(
                  "Opmerking: Een onzijdig geslacht kan af en toe voorkomen, vooral bij etymologisch Griekse adjectieven. De productieve functie ervan is beperkt, maar het kan wel helpen om animate en inanimate referenten van elkaar te onderscheiden.",
                ),
              ),
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.significant-letters`,
      slug: "significant-letters",
      lessonId,
      order: 3,
      title: {
        en: "Significant Letters",
        nl: "Significante letters",
      },
      tags: ["patterns", "letters", "grammar"],
      conceptRefs: [grammarLesson01ConceptIds.significantLetters],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Explains the recurring masculine, feminine, and plural significant letters that structure later Bohairic patterns.",
        nl: "Legt de terugkerende mannelijke, vrouwelijke en meervoudige significante letters uit die latere Bohairische patronen structureren.",
      },
      blocks: {
        en: [
          paragraph(
            conceptRef(
              grammarLesson01ConceptIds.significantLetters,
              "These significant letters",
            ),
            text(
              " keep recurring throughout Coptic grammar and often form the basis of Coptic pattern grammar. The next section on determiners already offers a first practical application of them.",
            ),
          ),
          {
            type: "table",
            id: `${lessonId}.section.significant-letters.table`,
            hideHeader: true,
            rowHeaderColumnId: "label",
            columns: [
              { id: "label", label: { en: "Category", nl: "Category" } },
              { id: "first", label: { en: "First", nl: "First" } },
              { id: "second", label: { en: "Second", nl: "Second" } },
              { id: "third", label: { en: "Third", nl: "Third" } },
            ],
            rows: [
              {
                id: `${lessonId}.section.significant-letters.row.masculine`,
                cells: {
                  label: paragraphCell(text("Masculine "), smallCaps("m")),
                  first: [
                    paragraph(copticSpan(text("ⲡ"))),
                    paragraph(text("/p/")),
                  ],
                  second: [
                    paragraph(copticSpan(text("ⲫ"))),
                    paragraph(text("/pʰ/")),
                  ],
                  third: [
                    paragraph(copticSpan(text("ϥ"))),
                    paragraph(text("/f/")),
                  ],
                },
              },
              {
                id: `${lessonId}.section.significant-letters.row.feminine`,
                cells: {
                  label: paragraphCell(text("Feminine "), smallCaps("f")),
                  first: [
                    paragraph(copticSpan(text("ⲧ"))),
                    paragraph(text("/t/")),
                  ],
                  second: [
                    paragraph(copticSpan(text("ⲑ"))),
                    paragraph(text("/tʰ/")),
                  ],
                  third: [
                    paragraph(copticSpan(text("ⲥ"))),
                    paragraph(text("/s/")),
                  ],
                },
              },
              {
                id: `${lessonId}.section.significant-letters.row.plural`,
                cells: {
                  label: paragraphCell(text("Plural "), smallCaps("p")),
                  first: [
                    paragraph(copticSpan(text("ⲛ"))),
                    paragraph(text("/n/")),
                  ],
                  second: [paragraph(text("-")), paragraph(text("no form"))],
                  third: [
                    paragraph(copticSpan(text("ⲟⲩ"))),
                    paragraph(text("/u, w/")),
                  ],
                },
              },
            ],
          },
        ],
        nl: [
          paragraph(
            conceptRef(
              grammarLesson01ConceptIds.significantLetters,
              "Deze significante letters",
            ),
            text(
              " keren voortdurend terug in de Koptische grammatica en vormen vaak de basis van de Koptische patroongrammatica. De volgende paragraaf over de determinatoren toont meteen een eerste concrete toepassing.",
            ),
          ),
          {
            type: "table",
            id: `${lessonId}.section.significant-letters.table`,
            hideHeader: true,
            rowHeaderColumnId: "label",
            columns: [
              { id: "label", label: { en: "Categorie", nl: "Categorie" } },
              { id: "first", label: { en: "Eerste", nl: "Eerste" } },
              { id: "second", label: { en: "Tweede", nl: "Tweede" } },
              { id: "third", label: { en: "Derde", nl: "Derde" } },
            ],
            rows: [
              {
                id: `${lessonId}.section.significant-letters.row.masculine.nl`,
                cells: {
                  label: paragraphCell(text("Mannelijk "), smallCaps("m")),
                  first: [
                    paragraph(copticSpan(text("ⲡ"))),
                    paragraph(text("/p/")),
                  ],
                  second: [
                    paragraph(copticSpan(text("ⲫ"))),
                    paragraph(text("/pʰ/")),
                  ],
                  third: [
                    paragraph(copticSpan(text("ϥ"))),
                    paragraph(text("/f/")),
                  ],
                },
              },
              {
                id: `${lessonId}.section.significant-letters.row.feminine.nl`,
                cells: {
                  label: paragraphCell(text("Vrouwelijk "), smallCaps("v")),
                  first: [
                    paragraph(copticSpan(text("ⲧ"))),
                    paragraph(text("/t/")),
                  ],
                  second: [
                    paragraph(copticSpan(text("ⲑ"))),
                    paragraph(text("/tʰ/")),
                  ],
                  third: [
                    paragraph(copticSpan(text("ⲥ"))),
                    paragraph(text("/s/")),
                  ],
                },
              },
              {
                id: `${lessonId}.section.significant-letters.row.plural.nl`,
                cells: {
                  label: paragraphCell(text("Meervoud "), smallCaps("p")),
                  first: [
                    paragraph(copticSpan(text("ⲛ"))),
                    paragraph(text("/n/")),
                  ],
                  second: [paragraph(text("-")), paragraph(text("geen vorm"))],
                  third: [
                    paragraph(copticSpan(text("ⲟⲩ"))),
                    paragraph(text("/u, w/")),
                  ],
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.determiner-selection`,
      slug: "determiner-selection",
      lessonId,
      order: 4,
      title: {
        en: "Determiner Selection",
        nl: "Selectie van determinatoren",
      },
      tags: ["determiners", "articles", "prefixes"],
      conceptRefs: [
        grammarLesson01ConceptIds.determinerSelection,
        grammarLesson01ConceptIds.significantLetters,
      ],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Shows how indefinite and definite determiners are selected across masculine, feminine, and plural noun forms.",
        nl: "Toont hoe onbepaalde en bepaalde determinatoren gekozen worden bij mannelijke, vrouwelijke en meervoudige naamwoordsvormen.",
      },
      blocks: {
        en: [
          paragraph(
            em("Example words:"),
            text(" "),
            coptic("Ⲥⲟⲛ"),
            text(" “brother” / "),
            coptic("Ⲥⲱⲛⲓ"),
            text(" “sister” / "),
            coptic("Ⲥⲱⲛⲓ"),
            text(" “sisters”"),
          ),
          {
            type: "table",
            id: `${lessonId}.section.determiner-selection.table`,
            columns: [
              { id: "type", label: { en: "Type", nl: "Type" } },
              {
                id: "masculine",
                label: { en: "Masculine m", nl: "Masculine m" },
                inlineLabel: {
                  en: [text("Masculine "), smallCaps("m")],
                  nl: [text("Masculine "), smallCaps("m")],
                },
              },
              {
                id: "feminine",
                label: { en: "Feminine f", nl: "Vrouwelijk v" },
                inlineLabel: {
                  en: [text("Feminine "), smallCaps("f")],
                  nl: [text("Vrouwelijk "), smallCaps("v")],
                },
              },
              {
                id: "plural",
                label: { en: "Plural p", nl: "Plural p" },
                inlineLabel: {
                  en: [text("Plural "), smallCaps("p")],
                  nl: [text("Plural "), smallCaps("p")],
                },
              },
            ],
            rows: [
              {
                id: `${lessonId}.section.determiner-selection.row.indefinite`,
                cells: {
                  type: paragraphCell(text("Indefinite")),
                  masculine: paragraphCell(
                    coptic("Ⲟⲩⲥⲟⲛ"),
                    footnoteRef("grammar.footnote.lesson01.002"),
                    text(" “a brother”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲟⲩⲥⲱⲛⲓ"),
                    text(" “a sister”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ϩⲁⲛⲥⲱⲛⲓ"),
                    footnoteRef("grammar.footnote.lesson01.003"),
                    text(" “sisters”"),
                  ),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.definite-long`,
                cells: {
                  type: paragraphCell(text("Definite (long)")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲓⲥⲟⲛ"),
                    text(" “the brother”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ϯⲥⲱⲛⲓ"),
                    footnoteRef("grammar.footnote.lesson01.004"),
                    text(" “the sister”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ⲛⲓⲥⲱⲛⲓ"),
                    text(" “the sisters”"),
                  ),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.definite-short`,
                cells: {
                  type: paragraphCell(text("Definite (short)")),
                  masculine: paragraphCell(
                    coptic("Ⲡ̀ⲥⲟⲛ"),
                    text(" “the brother”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲧ̀ⲥⲱⲛⲓ"),
                    text(" “the sister”"),
                  ),
                  plural: paragraphCell(text("(No short form)")),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.possessive`,
                cells: {
                  type: paragraphCell(text("Possessive")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲁⲥⲟⲛ"),
                    text(" “my brother”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲧⲁⲥⲱⲛⲓ"),
                    text(" “my sister”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ⲛⲁⲥⲱⲛⲓ"),
                    text(" “my sisters”"),
                  ),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.demonstrative`,
                cells: {
                  type: paragraphCell(text("Demonstrative")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲁⲓⲥⲟⲛ"),
                    text(" “this brother”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲧⲁⲓⲥⲱⲛⲓ"),
                    text(" “this sister”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ⲛⲁⲓⲥⲱⲛⲓ"),
                    text(" “these sisters”"),
                  ),
                },
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            blocks: [
              paragraph(
                text("Note: "),
                coptic("ⲡⲓ-"),
                text(" and "),
                coptic("ⲡ̀-"),
                text(
                  " are synonyms. We refer to them as long vs. short definite articles.",
                ),
              ),
            ],
          },
        ],
        nl: [
          paragraph(
            em("Voorbeeldwoorden:"),
            text(" "),
            coptic("Ⲥⲟⲛ"),
            text(" “broer” / "),
            coptic("Ⲥⲱⲛⲓ"),
            text(" “zus” / "),
            coptic("Ⲥⲱⲛⲓ"),
            text(" “zussen”"),
          ),
          {
            type: "table",
            id: `${lessonId}.section.determiner-selection.table`,
            columns: [
              { id: "type", label: { en: "Type", nl: "Type" } },
              {
                id: "masculine",
                label: { en: "Mannelijk m", nl: "Mannelijk m" },
                inlineLabel: {
                  en: [text("Mannelijk "), smallCaps("m")],
                  nl: [text("Mannelijk "), smallCaps("m")],
                },
              },
              {
                id: "feminine",
                label: { en: "Vrouwelijk v", nl: "Vrouwelijk v" },
                inlineLabel: {
                  en: [text("Vrouwelijk "), smallCaps("v")],
                  nl: [text("Vrouwelijk "), smallCaps("v")],
                },
              },
              {
                id: "plural",
                label: { en: "Meervoud p", nl: "Meervoud p" },
                inlineLabel: {
                  en: [text("Meervoud "), smallCaps("p")],
                  nl: [text("Meervoud "), smallCaps("p")],
                },
              },
            ],
            rows: [
              {
                id: `${lessonId}.section.determiner-selection.row.indefinite.nl`,
                cells: {
                  type: paragraphCell(text("Onbepaald")),
                  masculine: paragraphCell(
                    coptic("Ⲟⲩⲥⲟⲛ"),
                    footnoteRef("grammar.footnote.lesson01.002"),
                    text(" “een broer”"),
                  ),
                  feminine: paragraphCell(coptic("Ⲟⲩⲥⲱⲛⲓ"), text(" “een zus”")),
                  plural: paragraphCell(
                    coptic("Ϩⲁⲛⲥⲱⲛⲓ"),
                    footnoteRef("grammar.footnote.lesson01.003"),
                    text(" “zussen”"),
                  ),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.definite-long.nl`,
                cells: {
                  type: paragraphCell(text("Bepaald (lang)")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲓⲥⲟⲛ"),
                    text(" “de broer”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ϯⲥⲱⲛⲓ"),
                    footnoteRef("grammar.footnote.lesson01.004"),
                    text(" “de zus”"),
                  ),
                  plural: paragraphCell(coptic("Ⲛⲓⲥⲱⲛⲓ"), text(" “de zussen”")),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.definite-short.nl`,
                cells: {
                  type: paragraphCell(text("Bepaald (kort)")),
                  masculine: paragraphCell(coptic("Ⲡ̀ⲥⲟⲛ"), text(" “de broer”")),
                  feminine: paragraphCell(coptic("Ⲧ̀ⲥⲱⲛⲓ"), text(" “de zus”")),
                  plural: paragraphCell(text("(Geen korte vorm)")),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.possessive.nl`,
                cells: {
                  type: paragraphCell(text("Bezittelijk")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲁⲥⲟⲛ"),
                    text(" “mijn broer”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲧⲁⲥⲱⲛⲓ"),
                    text(" “mijn zus”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ⲛⲁⲥⲱⲛⲓ"),
                    text(" “mijn zussen”"),
                  ),
                },
              },
              {
                id: `${lessonId}.section.determiner-selection.row.demonstrative.nl`,
                cells: {
                  type: paragraphCell(text("Aanwijzend")),
                  masculine: paragraphCell(
                    coptic("Ⲡⲁⲓⲥⲟⲛ"),
                    text(" “deze broer”"),
                  ),
                  feminine: paragraphCell(
                    coptic("Ⲧⲁⲓⲥⲱⲛⲓ"),
                    text(" “deze zus”"),
                  ),
                  plural: paragraphCell(
                    coptic("Ⲛⲁⲓⲥⲱⲛⲓ"),
                    text(" “deze zussen”"),
                  ),
                },
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            blocks: [
              paragraph(
                text("Opmerking: "),
                coptic("ⲡⲓ-"),
                text(" en "),
                coptic("ⲡ̀-"),
                text(
                  " zijn synoniemen. We spreken van lange vs. korte bepaalde lidwoorden.",
                ),
              ),
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.zero-determination`,
      slug: "zero-determination",
      lessonId,
      order: 5,
      title: {
        en: "Zero-Determination",
        nl: "Nul-determinatie",
      },
      tags: ["determiners", "exceptions"],
      conceptRefs: [
        grammarLesson01ConceptIds.zeroDetermination,
        grammarLesson01ConceptIds.determinerSelection,
      ],
      exampleRefs: [...zeroDeterminationExampleIds],
      exerciseRefs: [],
      summary: {
        en: "Highlights one of the important exceptions where nouns may appear without the usual determiner prefix.",
        nl: "Benadrukt een van de belangrijke uitzonderingen waarbij naamwoorden zonder het gebruikelijke determinerprefix kunnen voorkomen.",
      },
      blocks: {
        en: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Coptic is a highly determined language. Often (90% of the time), nouns are provided with a determiner (prefix). However, ",
              },
              conceptRef(
                grammarLesson01ConceptIds.zeroDetermination,
                "zero-determination",
              ),
              {
                type: "text",
                text: " remains one of the important exceptions where nouns can appear without a determiner. This occurs, for example, with the quantifier ",
              },
              { type: "coptic", text: "ⲛⲓⲃⲉⲛ" },
              { type: "text", text: " “every/each”." },
            ],
          },
          {
            type: "exampleGroup",
            refs: [...zeroDeterminationExampleIds],
          },
        ],
        nl: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Het Koptisch is een hoog-gedetermineerde taal. Vaak (90% van de gevallen) worden zelfstandige naamwoorden dus van een determinator (voorvoegsel) voorzien. ",
              },
              conceptRef(
                grammarLesson01ConceptIds.zeroDetermination,
                "Nul-determinatie",
              ),
              {
                type: "text",
                text: " blijft echter een belangrijke uitzondering waarbij zelfstandige naamwoorden toch zonder determinator kunnen voorkomen. Dit doet zich bijvoorbeeld voor met het hoeveelheidswoord ",
              },
              { type: "coptic", text: "ⲛⲓⲃⲉⲛ" },
              { type: "text", text: " “elk/ieder”." },
            ],
          },
          {
            type: "exampleGroup",
            refs: [...zeroDeterminationExampleIds],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.bipartite-nominal-sentence`,
      slug: "bipartite-nominal-sentence",
      lessonId,
      order: 6,
      title: {
        en: "Bipartite Nominal Sentence",
        nl: "Tweeledige nominale zin",
      },
      tags: ["syntax", "nominal-sentence", "nexus-pronouns"],
      conceptRefs: [
        grammarLesson01ConceptIds.bipartiteNominalSentence,
        grammarLesson01ConceptIds.nexusPronouns,
      ],
      exampleRefs: [...nominalSentenceExampleIds],
      exerciseRefs: [],
      summary: {
        en: "Introduces nexus pronouns and the basic predicate-plus-subject structure of the bipartite nominal sentence.",
        nl: "Introduceert verbindingsvoornaamwoorden en de basisstructuur van de tweeledige nominale zin met gezegde en onderwerp.",
      },
      blocks: {
        en: [
          paragraph(
            text("There are three "),
            conceptRef(
              grammarLesson01ConceptIds.nexusPronouns,
              "nexus pronouns",
            ),
            text(
              " in Coptic. They only appear after the first word (or the first phrase) of the sentence. We call these words postpositive (placed after) or enclitic (leaning on the preceding word), which means that in writing they can also be attached as a single unit to the preceding word. We mark these with the symbol ‘≡’.",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.pe`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲡⲉ"),
                    text(" "),
                    smallCaps("m"),
                    text(" “he, it”"),
                    footnoteRef("grammar.footnote.lesson01.005"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.te`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲧⲉ"),
                    text(" "),
                    smallCaps("f"),
                    text(" “she, it”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.ne`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲛⲉ"),
                    text(" "),
                    smallCaps("p"),
                    text(" “they”"),
                  ),
                ],
              },
            ],
          },
          paragraph(
            text(
              "By convention, we usually leave a space before them, even though they may also be written together with the previous word. So ",
            ),
            coptic("ⲟⲩⲓⲱⲧ ⲡⲉ"),
            text(" and "),
            coptic("ⲟⲩⲓⲱⲧⲡⲉ"),
            text(" mean the same thing."),
          ),
          {
            type: "callout",
            tone: "info",
            title: {
              en: "Applications",
              nl: "Applications",
            },
            blocks: [
              paragraph(
                text(
                  "In Coptic (just like in Semitic languages such as Hebrew or Arabic), there is no verb ‘to be’ in the present tense. However, in English, we are required to use it, otherwise the translation is incorrect.",
                ),
              ),
              {
                type: "exampleGroup",
                refs: [...nominalSentenceExampleIds],
                columns: 2,
              },
            ],
          },
        ],
        nl: [
          paragraph(
            text("Er zijn drie "),
            conceptRef(
              grammarLesson01ConceptIds.nexusPronouns,
              "verbindingsvoornaamwoorden",
            ),
            text(
              " in het Koptisch. Ze verschijnen pas na het eerste woord (of de eerste woordgroep) van de zin. We noemen deze woorden postpositief (achter geplaatst) of enclitisch (aanleunend tegen het voorgaande woord), wat betekent dat ze in de schrijfwijze ook als een geheel aan het voorgaande woord vast kunnen staan. We markeren deze met het symbool ‘≡’.",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.pe.nl`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲡⲉ"),
                    text(" "),
                    smallCaps("m"),
                    text(" “hij, het”"),
                    footnoteRef("grammar.footnote.lesson01.005"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.te.nl`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲧⲉ"),
                    text(" "),
                    smallCaps("v"),
                    text(" “zij, het”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.bipartite-nominal-sentence.item.ne.nl`,
                blocks: [
                  paragraph(
                    text("≡"),
                    coptic("ⲛⲉ"),
                    text(" "),
                    smallCaps("p"),
                    text(" “zij, het”"),
                  ),
                ],
              },
            ],
          },
          paragraph(
            text(
              "Volgens de conventie laten we er meestal een spatie voor staan, ook al kunnen ze ook direct aan het vorige woord vast geschreven worden. Dus ",
            ),
            coptic("ⲟⲩⲓⲱⲧ ⲡⲉ"),
            text(" en "),
            coptic("ⲟⲩⲓⲱⲧⲡⲉ"),
            text(" betekenen hetzelfde."),
          ),
          {
            type: "callout",
            tone: "info",
            title: {
              en: "Toepassingen",
              nl: "Toepassingen",
            },
            blocks: [
              paragraph(
                text(
                  "In het Koptisch (net zoals in Semitische talen zoals Hebreeuws of Arabisch) is er geen werkwoord ‘zijn’. Maar in het Nederlands zijn we verplicht om het te gebruiken, anders is de vertaling fout.",
                ),
              ),
              {
                type: "exampleGroup",
                refs: [...nominalSentenceExampleIds],
                columns: 2,
              },
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.independent-pronouns`,
      slug: "independent-pronouns",
      lessonId,
      order: 7,
      title: {
        en: "Independent Personal Pronouns",
        nl: "Onafhankelijke persoonlijke voornaamwoorden",
      },
      tags: ["pronouns", "emphasis"],
      conceptRefs: [
        grammarLesson01ConceptIds.independentPersonalPronouns,
        grammarLesson01ConceptIds.bipartiteNominalSentence,
        grammarLesson01ConceptIds.nexusPronouns,
      ],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Presents the independent pronoun set and its emphatic use alongside standard nexus-pronoun constructions.",
        nl: "Presenteert de reeks onafhankelijke voornaamwoorden en hun benadrukkende gebruik naast standaardconstructies met verbindingsvoornaamwoorden.",
      },
      blocks: {
        en: [
          paragraph(
            text("Besides the nexus pronouns, there are also "),
            conceptRef(
              grammarLesson01ConceptIds.independentPersonalPronouns,
              "independent personal pronouns",
            ),
            text(". In a "),
            conceptRef(
              grammarLesson01ConceptIds.bipartiteNominalSentence,
              "bipartite nominal sentence",
            ),
            text(", using the "),
            conceptRef(
              grammarLesson01ConceptIds.nexusPronouns,
              "nexus pronouns",
            ),
            text(
              " is the standard (mandatory) rule. To emphasize such nominal sentences, one can also incorporate the independent personal pronouns. These are prepositive (placed before):",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.independent-pronouns.item.m`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲟϥ")),
                    text(" "),
                    smallCaps("m"),
                    text(" “he, it”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.independent-pronouns.item.f`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲟⲥ")),
                    text(" "),
                    smallCaps("f"),
                    text(" “she, it”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.independent-pronouns.item.p`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲱⲟⲩ")),
                    text(" "),
                    smallCaps("p"),
                    text(" “they”"),
                  ),
                ],
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: {
              en: "Examples",
              nl: "Examples",
            },
            blocks: [
              {
                type: "list",
                style: "unordered",
                items: [
                  {
                    id: `${lessonId}.section.independent-pronouns.example.1`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲟ"),
                          underline(text("ϥ")),
                          text(", "),
                          underline(text("ⲡ")),
                          text("ⲁⲓⲱⲧ "),
                          underline(text("ⲡ")),
                          text("ⲉ."),
                        ),
                        text(" “He is my father.”"),
                      ),
                    ],
                  },
                  {
                    id: `${lessonId}.section.independent-pronouns.example.2`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲟ"),
                          underline(text("ⲥ")),
                          text(", "),
                          underline(text("ⲧ")),
                          text("ⲁⲙⲁⲩ "),
                          underline(text("ⲧ")),
                          text("ⲉ."),
                        ),
                        text(" “She is my mother.”"),
                      ),
                    ],
                  },
                  {
                    id: `${lessonId}.section.independent-pronouns.example.3`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲱ"),
                          underline(text("ⲟⲩ")),
                          text(", "),
                          underline(text("ⲛ")),
                          text("ⲁⲥⲱⲛⲓ "),
                          underline(text("ⲛ")),
                          text("ⲉ."),
                        ),
                        text(" “They are my sisters.”"),
                      ),
                    ],
                  },
                ],
              },
              paragraph(
                text("The underlined letters are significant letters."),
              ),
            ],
          },
        ],
        nl: [
          paragraph(
            text("Naast de verbindingsvoornaamwoorden bestaan er ook de "),
            conceptRef(
              grammarLesson01ConceptIds.independentPersonalPronouns,
              "onafhankelijke persoonlijke voornaamwoorden",
            ),
            text(". Bij de "),
            conceptRef(
              grammarLesson01ConceptIds.bipartiteNominalSentence,
              "tweeledige nominale zin",
            ),
            text(" is het gebruik van de "),
            conceptRef(
              grammarLesson01ConceptIds.nexusPronouns,
              "verbindingsvoornaamwoorden",
            ),
            text(
              " de standaard (verplicht). Voor het benadrukken van zulke nominale zinnen kan men ook de onafhankelijke persoonlijke voornaamwoorden inschakelen. Deze zijn prepositief:",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.independent-pronouns.item.m.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲟϥ")),
                    text(" "),
                    smallCaps("m"),
                    text(" “hij, het”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.independent-pronouns.item.f.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲟⲥ")),
                    text(" "),
                    smallCaps("v"),
                    text(" “zij, het”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.independent-pronouns.item.p.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("Ⲛ̀ⲑⲱⲟⲩ")),
                    text(" "),
                    smallCaps("p"),
                    text(" “zij, het”"),
                  ),
                ],
              },
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: {
              en: "Voorbeelden",
              nl: "Voorbeelden",
            },
            blocks: [
              {
                type: "list",
                style: "unordered",
                items: [
                  {
                    id: `${lessonId}.section.independent-pronouns.example.1.nl`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲟ"),
                          underline(text("ϥ")),
                          text(", "),
                          underline(text("ⲡ")),
                          text("ⲁⲓⲱⲧ "),
                          underline(text("ⲡ")),
                          text("ⲉ."),
                        ),
                        text(" “Hij is mijn vader.”"),
                      ),
                    ],
                  },
                  {
                    id: `${lessonId}.section.independent-pronouns.example.2.nl`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲟ"),
                          underline(text("ⲥ")),
                          text(", "),
                          underline(text("ⲧ")),
                          text("ⲁⲙⲁⲩ "),
                          underline(text("ⲧ")),
                          text("ⲉ."),
                        ),
                        text(" “Zij is mijn moeder.”"),
                      ),
                    ],
                  },
                  {
                    id: `${lessonId}.section.independent-pronouns.example.3.nl`,
                    blocks: [
                      paragraph(
                        copticSpan(
                          text("Ⲛ̀ⲑⲱ"),
                          underline(text("ⲟⲩ")),
                          text(", "),
                          underline(text("ⲛ")),
                          text("ⲁⲥⲱⲛⲓ "),
                          underline(text("ⲛ")),
                          text("ⲉ."),
                        ),
                        text(" “Zij zijn mijn zussen.”"),
                      ),
                    ],
                  },
                ],
              },
              paragraph(
                text("De onderlijnde letters zijn significante letters."),
              ),
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.abbreviations`,
      slug: "abbreviations",
      lessonId,
      order: 8,
      title: {
        en: "Abbreviations",
        nl: "Afkortingen",
      },
      tags: ["liturgical", "nomina-sacra", "abbreviations"],
      conceptRefs: [grammarLesson01ConceptIds.nominaSacra],
      exampleRefs: [],
      exerciseRefs: [],
      summary: {
        en: "Introduces common Coptic abbreviations and nomina sacra used in liturgical and manuscript contexts.",
        nl: "Introduceert veelvoorkomende Koptische afkortingen en nomina sacra uit liturgische en handschriftelijke contexten.",
      },
      blocks: {
        en: [
          paragraph(
            text(
              "In Coptic literature, several common abbreviations are used, mostly to indicate holy names (",
            ),
            conceptRef(grammarLesson01ConceptIds.nominaSacra, "nomina sacra"),
            text(
              "). The conventional way to represent abbreviations in Coptic is by placing a horizontal line above the abbreviated word.",
            ),
          ),
          paragraph(
            em(
              "In a liturgical context, word abbreviations can also sometimes refer to common phrases:",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.abbreviations.phrase.1`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲕ̅ⲉ̅")),
                    text(" = "),
                    copticSpan(text("ⲕⲩⲣⲓⲉ̀ ⲉⲗⲏⲥⲟⲛ")),
                    text(" “Lord have mercy”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.2`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲭ︦ⲉ︦")),
                    text(" = "),
                    copticSpan(coptic("ⲭⲉⲣⲉ", "5842"), text(" ⲛⲉ Ⲙⲁⲣⲓⲁ")),
                    text(" “Hail Mary”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.3`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲛ︦ⲧ︦ⲉ︦ϥ︦")),
                    text(" = "),
                    copticSpan(text("ⲛ̀ⲧⲉϥⲭⲁ ⲛⲉⲛⲛⲟⲃⲓ ⲛⲁⲛ ⲉ̀ⲃⲟⲗ")),
                    text(" “to forgive us our sins”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.4`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲧ︦ⲱ︦ⲃ︦")),
                    text(" = "),
                    copticSpan(
                      text("ⲧⲱⲃϩ ⲙ̀Ⲡ̀"),
                      coptic("ϭⲱⲓⲥ"),
                      text(" ⲉ̀ϩ̀ⲣⲏⲓ ⲉ̀ϫⲱⲛ"),
                    ),
                    text(" “pray to the Lord for us”"),
                  ),
                ],
              },
            ],
          },
          {
            type: "table",
            id: `${lessonId}.section.abbreviations.table`,
            mobileLayout: "cards",
            columns: [
              { id: "fullWord", label: { en: "Full Word", nl: "Full Word" } },
              {
                id: "abbreviation",
                label: { en: "Abbreviation", nl: "Abbreviation" },
              },
              { id: "meaning", label: { en: "Meaning", nl: "Meaning" } },
            ],
            rows: [
              {
                id: `${lessonId}.section.abbreviations.row.1`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲁⲗⲗⲏⲗⲟⲩⲓⲁ̀")))],
                  abbreviation: [paragraph(copticSpan(text("ⲁ̅ⲗ̅")))],
                  meaning: [paragraph(text("“hallelujah”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.2`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲁ̀ⲙⲏⲛ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲁ̅ⲙ̅")))],
                  meaning: [paragraph(text("“amen”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.3`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(coptic("Ⲥⲱⲧⲏⲣ", "5632")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲥ̅ⲱ̅ⲣ̅, ⲥ̅ⲣ̅")))],
                  meaning: [paragraph(text("“saviour”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.4`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ϭⲱⲓⲥ")),
                      footnoteRef("grammar.footnote.lesson01.006"),
                      text(" "),
                      smallCaps("m"),
                      text(" "),
                      smallCaps("f"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("͞⳪̅, ϭ̅ⲥ̅")))],
                  meaning: [paragraph(text("“lord, lady”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.5`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲕⲩⲣⲓⲟⲥ (-ⲉ̀)")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲕ̅ⲉ̅")))],
                  meaning: [paragraph(text("“lord”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.6`,
                cells: {
                  fullWord: [paragraph(copticSpan(coptic("Ⲭⲉⲣⲉ", "5842")))],
                  abbreviation: [paragraph(copticSpan(text("ⲭ̅ⲉ̅")))],
                  meaning: [paragraph(text("“hail / greetings”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.7`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲓⲏⲥⲟⲩⲥ")),
                      text(" "),
                      text("N"),
                      superscript({
                        type: "em",
                        children: [smallCaps("m")],
                      }),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("Ⲓⲏ̅ⲥ̅, Ⲓⲥ̅, Ⲓ᷍ⲥ")))],
                  meaning: [
                    paragraph({ type: "em", children: [text("Jesus")] }),
                  ],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.8`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲡⲓⲭⲣⲓⲥⲧⲟⲥ")),
                      text(" "),
                      text("N"),
                      superscript({
                        type: "em",
                        children: [smallCaps("m")],
                      }),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("Ⲡⲭ̅ⲥ̅, Ⲡⲭ᷍ⲥ")))],
                  meaning: [
                    paragraph({ type: "em", children: [text("Christ")] }),
                  ],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.9`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲡ̀ⲛⲉⲩⲙⲁ")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲡ̅ⲛ̅ⲁ̅")))],
                  meaning: [paragraph(text("“spirit”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.10`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲉ̀ⲑⲟⲩⲁⲃ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲉ̅ⲑ̅ⲩ̅, ⲉ̅ⲑ̅")))],
                  meaning: [paragraph(text("“holy”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.11`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲫ̀ⲛⲟⲩϯ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲫ︦ϯ︦, ⲫ᷍ϯ, ⲫ̀ϯ")))],
                  meaning: [paragraph(text("“(the) God”"))],
                },
              },
            ],
          },
        ],
        nl: [
          paragraph(
            text(
              "In de Koptische literatuur worden enkele veelvoorkomende afkortingen gebruikt, meestal om heilige namen (",
            ),
            conceptRef(grammarLesson01ConceptIds.nominaSacra, "nomina sacra"),
            text(
              ") aan te duiden. De conventionele manier om afkortingen in het Koptisch weer te geven, is door een horizontale lijn boven het afgekorte woord te plaatsen.",
            ),
          ),
          paragraph(
            em(
              "In een liturgische context kunnen woordafkortingen ook soms naar veelvoorkomende zinnen verwijzen:",
            ),
          ),
          {
            type: "list",
            style: "unordered",
            items: [
              {
                id: `${lessonId}.section.abbreviations.phrase.1.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲕ̅ⲉ̅")),
                    text(" = "),
                    copticSpan(text("ⲕⲩⲣⲓⲉ̀ ⲉⲗⲏⲥⲟⲛ")),
                    text(" “heer ontferm U”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.2.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲭ︦ⲉ︦")),
                    text(" = "),
                    copticSpan(coptic("ⲭⲉⲣⲉ", "5842"), text(" ⲛⲉ Ⲙⲁⲣⲓⲁ")),
                    text(" “wees gegroet Maria”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.3.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲛ︦ⲧ︦ⲉ︦ϥ︦")),
                    text(" = "),
                    copticSpan(text("ⲛ̀ⲧⲉϥⲭⲁ ⲛⲉⲛⲛⲟⲃⲓⲛⲁⲛ ⲉ̀ⲃⲟⲗ")),
                    text(" “om onze zonden te vergeven”"),
                  ),
                ],
              },
              {
                id: `${lessonId}.section.abbreviations.phrase.4.nl`,
                blocks: [
                  paragraph(
                    copticSpan(text("ⲧ︦ⲱ︦ⲃ︦")),
                    text(" = "),
                    copticSpan(
                      text("ⲧⲱⲃϩ ⲙ̀Ⲡ̀"),
                      coptic("ϭⲱⲓⲥ"),
                      text(" ⲉ̀ϩ̀ⲣⲏⲓ ⲉ̀ϫⲱⲛ"),
                    ),
                    text(" “bid tot de Heer voor ons”"),
                  ),
                ],
              },
            ],
          },
          {
            type: "table",
            id: `${lessonId}.section.abbreviations.table`,
            mobileLayout: "cards",
            columns: [
              { id: "fullWord", label: { en: "Voluit", nl: "Voluit" } },
              {
                id: "abbreviation",
                label: { en: "Afkorting", nl: "Afkorting" },
              },
              { id: "meaning", label: { en: "Betekenis", nl: "Betekenis" } },
            ],
            rows: [
              {
                id: `${lessonId}.section.abbreviations.row.1.nl`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲁⲗⲗⲏⲗⲟⲩⲓⲁ̀")))],
                  abbreviation: [paragraph(copticSpan(text("ⲁ̅ⲗ̅")))],
                  meaning: [paragraph(text("“halleluja”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.2.nl`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲁ̀ⲙⲏⲛ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲁ̅ⲙ̅")))],
                  meaning: [paragraph(text("“amen”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.3.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(coptic("Ⲥⲱⲧⲏⲣ", "5632")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲥ̅ⲱ̅ⲣ̅, ⲥ̅ⲣ̅")))],
                  meaning: [paragraph(text("“verlosser”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.4.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ϭⲱⲓⲥ")),
                      footnoteRef("grammar.footnote.lesson01.006"),
                      text(" "),
                      smallCaps("m"),
                      text(" "),
                      smallCaps("v"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("͞⳪̅, ϭ̅ⲥ̅")))],
                  meaning: [paragraph(text("“heer, dame”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.5.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲕⲩⲣⲓⲟⲥ (-ⲉ̀)")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲕ̅ⲉ̅")))],
                  meaning: [paragraph(text("“heer”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.6.nl`,
                cells: {
                  fullWord: [paragraph(copticSpan(coptic("Ⲭⲉⲣⲉ", "5842")))],
                  abbreviation: [paragraph(copticSpan(text("ⲭ̅ⲉ̅")))],
                  meaning: [paragraph(text("“gegroet”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.7.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲓⲏⲥⲟⲩⲥ")),
                      text(" "),
                      text("N"),
                      superscript({
                        type: "em",
                        children: [smallCaps("m")],
                      }),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("Ⲓⲏ̅ⲥ̅, Ⲓⲥ̅, Ⲓ᷍ⲥ")))],
                  meaning: [
                    paragraph({ type: "em", children: [text("Jezus")] }),
                  ],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.8.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲡⲓⲭⲣⲓⲥⲧⲟⲥ")),
                      text(" "),
                      text("N"),
                      superscript({
                        type: "em",
                        children: [smallCaps("m")],
                      }),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("Ⲡⲭ̅ⲥ̅, Ⲡⲭ᷍ⲥ")))],
                  meaning: [
                    paragraph({ type: "em", children: [text("Christus")] }),
                  ],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.9.nl`,
                cells: {
                  fullWord: [
                    paragraph(
                      copticSpan(text("Ⲡ̀ⲛⲉⲩⲙⲁ")),
                      text(" "),
                      smallCaps("m"),
                    ),
                  ],
                  abbreviation: [paragraph(copticSpan(text("ⲡ̅ⲛ̅ⲁ̅")))],
                  meaning: [paragraph(text("“geest”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.10.nl`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲉ̀ⲑⲟⲩⲁⲃ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲉ̅ⲑ̅ⲩ̅, ⲉ̅ⲑ̅")))],
                  meaning: [paragraph(text("“heilig”"))],
                },
              },
              {
                id: `${lessonId}.section.abbreviations.row.11.nl`,
                cells: {
                  fullWord: [paragraph(copticSpan(text("Ⲫ̀ⲛⲟⲩϯ")))],
                  abbreviation: [paragraph(copticSpan(text("ⲫ︦ϯ︦, ⲫ᷍ϯ, ⲫ̀ϯ")))],
                  meaning: [paragraph(text("“(de) God”"))],
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: `${lessonId}.section.exercise-01`,
      slug: "exercise-01",
      lessonId,
      order: 9,
      title: {
        en: "Exercise 01",
        nl: "Oefening 01",
      },
      tags: ["exercise", "translation"],
      conceptRefs: [
        grammarLesson01ConceptIds.determinerSelection,
        grammarLesson01ConceptIds.zeroDetermination,
        grammarLesson01ConceptIds.bipartiteNominalSentence,
        grammarLesson01ConceptIds.independentPersonalPronouns,
      ],
      exampleRefs: [],
      exerciseRefs: [grammarLesson01Exercise01.id],
      summary: {
        en: "Provides a reviewed translation drill that reinforces nominal expressions from the lesson.",
        nl: "Bevat een nagekeken vertaaloefening die de nominale uitdrukkingen uit de les versterkt.",
      },
      blocks: {
        en: [
          {
            type: "exerciseGroup",
            refs: [grammarLesson01Exercise01.id],
          },
        ],
        nl: [
          {
            type: "exerciseGroup",
            refs: [grammarLesson01Exercise01.id],
          },
        ],
      },
    },
  ],
  conceptRefs: [...grammarLesson01ConceptIdList],
  exerciseRefs: [grammarLesson01Exercise01.id],
  sourceRefs: [...grammarLesson01SourceIdList],
};
