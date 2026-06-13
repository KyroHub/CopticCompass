import type { Language } from "@/types/i18n";

export type FaqItemId =
  | "what-is-coptic"
  | "pronunciation-lesson-zero"
  | "logo-meaning";

export type FaqTextRun = {
  coptic?: boolean;
  emphasis?: boolean;
  entryId?: number;
  strong?: boolean;
  text: string;
};

export type FaqAnswerBlock = {
  runs: readonly FaqTextRun[];
  type: "paragraph" | "quote";
};

export type FaqItem = {
  answer: readonly FaqAnswerBlock[];
  id: FaqItemId;
  question: string;
};

type FaqPageCopy = {
  description: string;
  items: readonly FaqItem[];
  title: string;
};

export const FAQ_BREADCRUMB_LABEL = "FAQ";

function text(value: string): FaqTextRun {
  return { text: value };
}

function strong(value: string): FaqTextRun {
  return { strong: true, text: value };
}

function emphasis(value: string): FaqTextRun {
  return { emphasis: true, text: value };
}

function coptic(
  value: string,
  options: Omit<FaqTextRun, "coptic" | "text"> = {},
) {
  return { ...options, coptic: true, text: value };
}

function paragraph(...runs: readonly FaqTextRun[]): FaqAnswerBlock {
  return { runs, type: "paragraph" };
}

function quote(...runs: readonly FaqTextRun[]): FaqAnswerBlock {
  return { runs, type: "quote" };
}

const FAQ_COPY = {
  en: {
    title: "Frequently asked questions",
    description:
      "Short answers to common questions about Coptic, Coptic Compass, and how the learning materials are shaped.",
    items: [
      {
        id: "what-is-coptic",
        question: "What is Coptic?",
        answer: [
          paragraph(
            strong("Coptic"),
            text(" is the final written stage of the "),
            strong("ancient Egyptian language"),
            text(
              ". It is written mainly with the Greek alphabet, with additional signs inherited from earlier Egyptian writing traditions.",
            ),
          ),
          quote(
            text("On Coptic Compass, "),
            strong("Coptic usually means Bohairic Coptic"),
            text(" unless a page says otherwise."),
          ),
          paragraph(
            text(
              "Historically, Coptic includes several dialects and regional written traditions. As Arabic became dominant as an everyday language in Egypt, Coptic gradually ceased to function as a common spoken language, but it remains central to Coptic liturgy, manuscripts, language study, and Coptology.",
            ),
          ),
        ],
      },
      {
        id: "pronunciation-lesson-zero",
        question:
          "Why does Coptic Compass not begin with a separate pronunciation lesson?",
        answer: [
          paragraph(
            strong("Pronunciation is not missing; it is staged."),
            text(
              " Coptic has 32 letters, and some letters have more than one pronunciation depending on context. Asking beginners to memorize every sound value at once can make the first step heavier than it needs to be.",
            ),
          ),
          quote(
            emphasis("Not a lesson zero, but a thread through the lessons."),
          ),
          paragraph(
            text(
              "Instead, pronunciation is introduced as new words, forms, and grammar points appear. That keeps sound, meaning, and usage connected, which is usually easier to remember than an isolated alphabet overview.",
            ),
          ),
          paragraph(
            text(
              "The dictionary also supports this approach: entries include ",
            ),
            strong("text-to-speech (TTS)"),
            text(
              ", and lesson vocabulary can link directly to dictionary entries where you can hear a first pronunciation model.",
            ),
          ),
          paragraph(
            text(
              "Coptic Compass is designed to complement in-person Sunday lessons, where pronunciation can be corrected directly. Dedicated pronunciation videos may come later, but the current priority is to teach pronunciation where learners actually meet the words.",
            ),
          ),
        ],
      },
      {
        id: "logo-meaning",
        question: "What does the Coptic Compass logo mean?",
        answer: [
          paragraph(
            text("The logo is a "),
            strong("navigational emblem"),
            text(
              ": a symbol of orientation for people moving through Coptic language, heritage, publication, technology, and spiritual-cultural memory.",
            ),
          ),
          paragraph(
            text("At the center is "),
            coptic("Ⲭ", { strong: true }),
            text(", which gathers three ideas: "),
            coptic("Ⲭⲏⲙⲓ", { entryId: 6376, strong: true }),
            text(' "Egypt", '),
            coptic("Ⲭⲣⲓⲥⲧⲓⲁⲛⲟⲥ", { entryId: 5894, strong: true }),
            text(' "Christians", and '),
            coptic("Ⲭⲁⲧⲏⲣ", { entryId: 1800, strong: true }),
            text(' "compass".'),
          ),
          quote(
            emphasis(
              "The mark is meant to feel like ancient wisdom made usable as a guide for the present.",
            ),
          ),
          paragraph(
            text("The arrow-like movement suggests direction; the ankh ["),
            coptic("Ⲱⲛⳳ", { entryId: 38 }),
            text(
              "] points to life and light; and the winged sky-disk evokes protection and elevation. Black and gold reinforce the same idea: depth, heritage, starlight, and guidance.",
            ),
          ),
        ],
      },
    ],
  },
  nl: {
    title: "Veelgestelde vragen",
    description:
      "Korte antwoorden op veelgestelde vragen over Koptisch, Coptic Compass en de opbouw van het lesmateriaal.",
    items: [
      {
        id: "what-is-coptic",
        question: "Wat is het Koptisch?",
        answer: [
          paragraph(
            strong("Koptisch"),
            text(" is de laatste geschreven fase van de "),
            strong("oude Egyptische taal"),
            text(
              ". Het wordt vooral geschreven met het Griekse alfabet, aangevuld met tekens die uit oudere Egyptische schrijftradities zijn overgeleverd.",
            ),
          ),
          quote(
            text("Op Coptic Compass betekent "),
            strong("Koptisch meestal Bohairisch Koptisch"),
            text(", tenzij een pagina anders vermeldt."),
          ),
          paragraph(
            text(
              "Historisch gezien omvat het Koptisch verschillende dialecten en regionale schrijftradities. Naarmate het Arabisch in Egypte dominant werd als alledaagse taal, functioneerde Koptisch geleidelijk niet langer als gewone spreektaal. Toch blijft het centraal in de Koptische liturgie, handschriften, taalstudie en Koptologie.",
            ),
          ),
        ],
      },
      {
        id: "pronunciation-lesson-zero",
        question:
          "Waarom begint Coptic Compass niet met een aparte uitspraakles?",
        answer: [
          paragraph(
            strong(
              "Uitspraak ontbreekt niet; die wordt stapsgewijs opgebouwd.",
            ),
            text(
              " Koptisch heeft 32 letters, en sommige letters hebben meer dan een uitspraak afhankelijk van de context. Als beginners alle klankwaarden in één keer moeten onthouden, wordt de eerste stap al snel zwaarder dan nodig is.",
            ),
          ),
          quote(emphasis("Geen les nul, maar een rode draad door de lessen.")),
          paragraph(
            text(
              "Daarom wordt uitspraak ingevoerd wanneer nieuwe woorden, vormen en grammaticale punten verschijnen. Zo blijven klank, betekenis en gebruik met elkaar verbonden, wat meestal beter blijft hangen dan een los alfabetoverzicht.",
            ),
          ),
          paragraph(
            text(
              "Het woordenboek ondersteunt deze aanpak ook: lemma's bevatten ",
            ),
            strong("tekst-naar-spraak (TTS)"),
            text(
              ", en woordenschat uit de lessen kan rechtstreeks verwijzen naar woordenboeklemma's waar u een eerste uitspraakvoorbeeld kunt horen.",
            ),
          ),
          paragraph(
            text(
              "Coptic Compass is bedoeld als aanvulling op de fysieke zondagslessen, waar uitspraak direct kan worden bijgestuurd. Afzonderlijke uitspraakvideo's kunnen later volgen, maar voorlopig ligt de nadruk erop uitspraak te leren op het moment dat u de woorden daadwerkelijk tegenkomt.",
            ),
          ),
        ],
      },
      {
        id: "logo-meaning",
        question: "Wat betekent het logo van Coptic Compass?",
        answer: [
          paragraph(
            text("Het logo is een "),
            strong("navigatie-embleem"),
            text(
              ": een symbool van oriëntatie voor mensen die zich bewegen door Koptische taal, erfgoed, publicatie, technologie en spiritueel-cultureel geheugen.",
            ),
          ),
          paragraph(
            text("Centraal staat "),
            coptic("Ⲭ", { strong: true }),
            text(", dat drie ideeën samenbrengt: "),
            coptic("Ⲭⲏⲙⲓ", { entryId: 6376, strong: true }),
            text(' "Egypte", '),
            coptic("Ⲭⲣⲓⲥⲧⲓⲁⲛⲟⲥ", { entryId: 5894, strong: true }),
            text(' "christenen", en '),
            coptic("Ⲭⲁⲧⲏⲣ", { entryId: 1800, strong: true }),
            text(' "kompas".'),
          ),
          quote(
            emphasis(
              "Het teken wil oude wijsheid laten functioneren als een gids voor het heden.",
            ),
          ),
          paragraph(
            text("De pijlvormige beweging suggereert richting; de ankh ["),
            coptic("Ⲱⲛⳳ", { entryId: 38 }),
            text(
              "] verwijst naar leven en licht; en de gevleugelde zonneschijf roept bescherming en verheffing op. Zwart en goud versterken dezelfde gedachte: diepte, erfgoed, sterrenlicht en leiding.",
            ),
          ),
        ],
      },
    ],
  },
} as const satisfies Record<Language, FaqPageCopy>;

export function getFaqPageCopy(locale: Language): FaqPageCopy {
  return FAQ_COPY[locale];
}

export function listFaqItems(locale: Language): readonly FaqItem[] {
  return getFaqPageCopy(locale).items;
}

export function getFaqAnswerPlainText(item: FaqItem) {
  return item.answer
    .map((block) => block.runs.map((run) => run.text).join(""))
    .join("\n\n");
}
