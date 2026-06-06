# Dictionary JSON Guide

This guide describes how to edit `public/data/dictionary.json` safely. Treat the
dictionary JSON as a small public API: it is consumed by dictionary pages,
search, OpenAPI-backed routes, grammar links, and tests.

The TypeScript types in `src/features/dictionary/types.ts` and the validator
entry point in `src/features/dictionary/lib/dictionaryValidation.ts` are the
executable source of truth. The validator is split into adjacent
`dictionaryValidation*` modules by entry shape, forms, grammar, inflections,
meanings, relations, and shared helpers. This document explains the conventions
behind those rules.

## Contents

- [Editing Rules](#editing-rules)
- [Entry Shape](#entry-shape)
- [Greek Context](#greek-context)
- [Etymology](#etymology)
- [Dialects](#dialects)
- [Senses, Meanings, And Notes](#senses-meanings-and-notes)
- [Dialect-Restricted Meanings](#dialect-restricted-meanings)
- [Relations](#relations)
- [Grammar Equivalence Notes](#grammar-equivalence-notes)
- [Source Commentary Notes](#source-commentary-notes)
- [Grammar Fields](#grammar-fields)
- [Inflections](#inflections)
- [Imperatives](#imperatives)
- [Structured Form Objects](#structured-form-objects)
- [Decision Table](#decision-table)
- [Merging Entries](#merging-entries)
- [Search And Rendering](#search-and-rendering)
- [Quick Checklist](#quick-checklist)

## Editing Rules

- Keep entries structured. Prefer specific fields over source-style prose.
- Put translations in `senses[].meanings`, and commentary in `senses[].notes`.
- Put dialect spellings in `dialects`.
- Put alternate spellings in the matching `variants` object.
- Put semantic cross-references in `relations`, not inside translations.
- Put related inflected forms under `inflections`, not as separate entries, when
  they belong to the same lexical item.
- Use structured form objects only when a plain string cannot carry the needed
  metadata, such as `gender`, `number`, `entryId`, `uncertain`, or a substantive
  note.
- Do not use notes such as for example `"Imperative variant."` when the JSON
  structure already communicates that a form is a variant.

After editing dictionary data, run at least:

```bash
npm run format:check
npm run test -- src/features/dictionary/lib/dictionary.dataset.test.ts
```

For schema or display changes, also run:

```bash
npm run typecheck
npm run test
npm run build
```

## Entry Shape

A normal entry has these core fields:

```json
{
  "id": 5,
  "headword": "ⲉⲓ",
  "dialects": {},
  "etym": "Egy",
  "greekContext": { "equivalents": ["ἔρχεσθαι"] },
  "senses": []
}
```

Use stable numeric `id` values. When entries are merged, remove the duplicate
entry only after its useful forms, Greek context, notes, or meanings have been
folded into the canonical entry.

## Greek Context

Use `greekContext` for Greek forms connected to an entry:

```json
{
  "greekContext": {
    "sources": ["ἄγγελος"],
    "equivalents": ["λυτροῦσθαι"]
  }
}
```

Use `sources` when the Coptic entry is a Greek loan or preserves a Greek source
form. Use `equivalents` when the Greek form is a translation equivalent. Omit
empty arrays and omit `greekContext` entirely when no Greek form is known.

## Etymology

`etym` classifies the origin language layer of each entry:

| Code      | Meaning                               | Example   |
| --------- | ------------------------------------- | --------- |
| `Egy`     | Egyptian-heritage (including Demotic) | ⲥⲱⲧⲉ      |
| `Gr`      | Greek loanword                        | ⲁⲅⲅⲉⲗⲟⲥ   |
| `Lat`     | Latin loanword (often via Greek)      | ⲕⲟⲩⲥⲧⲱⲇⲓⲁ |
| `Sem`     | Semitic (Hebrew/Aramaic) loanword     | ⲥⲁⲃⲃⲁⲧⲟⲛ  |
| `Unknown` | Cannot be determined                  | ϫⲗⲉ       |

Use `Lat` for words of Latin origin even when they entered Coptic through
Greek orthography (e.g. ⲡⲣⲁⲓⲧⲱⲣⲓⲟⲛ ← praetorium). Use `Sem` for words that
derive from a Semitic root, even if attested in a Greek spelling (e.g.
ⲥⲁⲃⲃⲁⲧⲟⲛ ← Hebrew šabbāt). Use `Egy` for the Demotic stage as well; there
is no separate `Dem` code.

## Dialects

`dialects` stores the primary visible forms for each dialect. A dialect form can
contain these verb states or related forms:

- `absolute`
- `nominal`
- `pronominal`
- `stative`
- `participles`
- `variants`

Example:

```json
"dialects": {
  "B": {
    "absolute": "ϭⲓ",
    "nominal": "ϭⲓ-",
    "pronominal": "ϭⲓⲧ=",
    "stative": "ϭⲏⲟⲩ†",
    "participles": ["ϭⲁⲓ~"],
    "variants": {
      "constructParticiples": ["ϭⲁⲩ~"]
    }
  }
}
```

Not all verbs exist in all verbal state allomorphs. Only populate the states
that are attested for a given verb. Greek loanword verbs in particular only
have an absolute form and are conjugated analytically with ⲉⲣ-.

| Verb     | absolute | nominal | pronominal | stative | notes                     |
| -------- | -------- | ------- | ---------- | ------- | ------------------------- |
| ϭⲓ       | ϭⲓ       | ϭⲓ-     | ϭⲓⲧ=       | ϭⲏⲟⲩ†   | full paradigm             |
| ⲥⲁϫⲓ     | ⲥⲁϫⲓ     | —       | —          | —       | absolute only             |
| ⲟⲩⲁⲃ     | —        | —       | —          | ⲟⲩⲁⲃ†   | stative only              |
| ⲉⲣⲁⲅⲁⲡⲁⲛ | ⲉⲣⲁⲅⲁⲡⲁⲛ | —       | —          | —       | Greek loan, absolute only |

Construct participles are likewise attested for only a small subset of verbs.
The dictionary analytics page can serve as a guide for current form coverage
across dialects and verb states.

### Dialect Variants

Use `dialects.*.variants` for alternate spellings or secondary forms of the same
dialect state. Do not put multiple comma-separated forms in `absolute`,
`nominal`, `pronominal`, or `stative`.

Good:

```json
"S": {
  "absolute": "ⲥⲱⲧⲉ",
  "nominal": "ⲥⲉⲧ-",
  "pronominal": "ⲥⲟⲧ=",
  "variants": {
    "nominal": ["ⲥⲟⲧ-", "ⲥⲱⲧ-"],
    "pronominal": ["ⲥⲟⲟⲧ=", "ⲥⲁⲧ=", "ⲥⲁⲁⲧ="]
  }
}
```

Avoid:

```json
"S": {
  "nominal": "ⲥⲉⲧ-, ⲥⲟⲧ-, ⲥⲱⲧ-"
}
```

### Source-Form Inventories

When source prose lists dialect-specific forms or equivalences, put the forms in
`dialects` or `inflections` rather than in meanings. Keep only short explanatory
context in notes.

Good:

```json
"dialects": {
  "S": {
    "nominal": "ⲕⲟⲩ-"
  },
  "Sa": {
    "nominal": "ⲕⲟⲩ-"
  }
},
"inflections": {
  "plural": {
    "B": {
      "default": ["ϩⲁⲛⲕⲉⲭⲱⲟⲩⲛⲓ"]
    },
    "S": {
      "default": ["ϩⲉⲛⲕⲟⲟⲩⲉ"],
      "variants": {
        "default": ["ⲕⲉⲕⲟⲟⲩⲉ"]
      }
    }
  }
}
```

Avoid:

```json
"meanings": {
  "en": ["ⲕⲟⲩ- S = ⲕⲉ- (mostly Sa Theban)"]
}
```

## Senses, Meanings, And Notes

`senses` store grammar and localized meaning data. Use `meanings` for
translations. Use `notes` for explanations that should not be rendered as
translations.

Good:

```json
{
  "grammar": {
    "pos": "N",
    "gender": "M"
  },
  "meanings": {
    "en": ["meaning uncertain"],
    "nl": ["betekenis onzeker"]
  },
  "notes": {
    "en": ["Source gloss is fragmentary."],
    "nl": ["Bronglos is fragmentarisch."]
  }
}
```

Avoid:

```json
"meanings": {
  "en": ["make to cease, heal [CAUS of (S) ⲗⲁϭⲉ]"]
}
```

## Dialect-Restricted Meanings

Use `dialectMeanings` for translations that are restricted to one or more
dialects. Do not leave trailing source sigla such as `S`, `B`, or `ABFLS`, or
inline qualifiers such as `(mostly B)` or `BS(rare)`, in `senses[].meanings`.

Good:

```json
"dialectMeanings": [
  {
    "sourceLabel": "S",
    "dialects": ["S"],
    "meanings": {
      "en": ["sell"],
      "nl": ["verkoop"]
    }
  }
]
```

Avoid:

```json
"meanings": {
  "en": ["sell S"],
  "nl": ["verkoop S"]
}
```

`sourceLabel` preserves the source siglum exactly. `dialects` stores the parsed
dialect codes so UI and API consumers do not need to parse prose. Use
`dialectMeanings[].notes` for qualifiers such as `mostly`, `rarely`, or
`once`; keep the translated meaning itself free of the dialect marker.

Good:

```json
{
  "sourceLabel": "BS",
  "dialects": ["B", "S"],
  "meanings": {
    "en": ["as AUX, attain to"],
    "nl": ["als AUX, bereiken"]
  },
  "notes": {
    "en": ["Rarely."],
    "nl": ["Zelden."]
  }
}
```

Avoid:

```json
"meanings": {
  "en": ["as AUX BS(rare), attain to"],
  "nl": ["als AUX BS(zeldzaam), bereiken"]
}
```

If the source has a negative dialect exception rather than a positive
restriction, keep the translation clean and move the exception into
`senses[].notes`, for example `"Not L."`.

## Relations

`relations` stores structured semantic links between entries. Use it when a
meaning string would otherwise contain source-style prose such as
`(CAUS of ϣⲱⲡⲉ)`, `mostly = B ϩⲗⲓ`, or `see also ...`.

Example:

```json
"relations": [
  {
    "type": "CAUS_OF",
    "targetId": 13
  }
]
```

Allowed relation types:

- `CAUS_OF`: this entry is a causative derivation of the target entry.
- `DERIVED_FROM`: this entry is derived from the target entry, but not as a
  causative.
- `COMPOUND_WITH`: this entry is a compound involving the target entry.
- `SEE_ALSO`: looser related-entry link for editorial cross-references.

Use `relations[].notes` only for metadata about the relationship itself, such as
source uncertainty or a dialect restriction. If the target cannot be resolved to
a stable entry id, keep the derivation as a localized `senses[].notes` item
instead of creating a speculative relation.

Keep relation edges canonical:

- Do not create self-links.
- Keep at most one edge for the same `type` and `targetId` on an entry.
- If two source notes point to the same relation edge, combine them in
  `relations[].notes`.

For source equivalence prose, keep the translation in `senses[].meanings` and
move the cross-reference into `relations`.

Good:

```json
"meanings": {
  "en": ["cloud"],
  "nl": ["wolk"]
},
"relations": [
  {
    "type": "SEE_ALSO",
    "targetId": 2559,
    "notes": {
      "en": ["Always equivalent to Bohairic ϭⲏⲡⲓ."],
      "nl": ["Altijd gelijkwaardig aan Bohairisch ϭⲏⲡⲓ."]
    }
  }
]
```

Avoid:

```json
"meanings": {
  "en": ["cloud, always = B ϭⲏⲡⲓ"]
}
```

Compound entries use `relations`:

```json
"relations": [
  {
    "type": "COMPOUND_WITH",
    "targetId": 130
  }
]
```

## Grammar Equivalence Notes

Use `senses[].notes` for Greek or grammatical equivalence prose that explains
how a form is used but is not itself a translation. Keep the translation or
grammar label in `senses[].meanings`.

Good:

```json
"meanings": {
  "en": ["verbal prefix in final clause"],
  "nl": ["verbaal voorvoegsel in de slotzin"]
},
"notes": {
  "en": ["Often equivalent to Greek future."],
  "nl": ["Vaak gelijkwaardig aan Grieks futurum."]
}
```

Avoid:

```json
"meanings": {
  "en": ["verbal prefix in final clause, often = Greek future"]
}
```

## Source Commentary Notes

Use `senses[].notes` or `dialectMeanings[].notes` for source commentary such as
bibliographic `v.` references, uncertainty markers like `(same?)` or a trailing
`(?)`, and short editorial explanations. Keep `meanings` to the translated value
itself. For comparison shorthand such as `opp`, use localized notes unless the
source gives a stable cross-reference such as `cf ⲡⲁⲓ`; use `relations[]` for
resolved entry-to-entry links.

Good:

```json
"meanings": {
  "en": ["future conjunctive"],
  "nl": ["toekomstige conjunctief"]
},
"notes": {
  "en": ["See Bentley Layton, A Coptic Grammar, §357."],
  "nl": ["Zie Bentley Layton, A Coptic Grammar, §357."]
}
```

Avoid:

```json
"meanings": {
  "en": ["future conjunctive, v. Bentley Layton, A Coptic Grammar, §357"]
}
```

Good:

```json
"meanings": {
  "en": ["field, meadow, country"],
  "nl": ["veld, weide, land"]
},
"notes": {
  "en": ["Opposed to town."],
  "nl": ["Tegenover stad."]
}
```

Avoid:

```json
"meanings": {
  "en": ["field, meadow, country opp town"]
}
```

Good:

```json
"meanings": {
  "en": ["penis"],
  "nl": ["penis"]
},
"notes": {
  "en": ["The meaning \"penis\" is marked uncertain in the source."],
  "nl": ["De betekenis \"penis\" wordt in de bron als onzeker gemarkeerd."]
}
```

Avoid:

```json
"meanings": {
  "en": ["penis (?)"]
}
```

## Grammar Fields

Use compact grammar codes in `senses[].grammar`.

Common fields:

- `pos`: part of speech, such as `V`, `N`, `ADJ`, `PREP`, `PRON`.
- `gender`: noun gender, such as `M`, `F`, `BOTH`.
- `number`: `SG` or `PL`.
- `valency`: verbal transitivity, `INTR` or `TR`.
- `form`: verbal or nominal form label, such as `STA`, `PC`, `VBAL`.
- `mood`: currently `IMP`.
- `derivation`: currently `CAUS`.

For Greek loan nouns, add `gender` when the Greek source form gives a clear
answer and the entry is actually functioning as a noun. The dataset convention
maps Greek neuter loans such as `-ον`, `-ιον`, and `-μα` to Coptic `M`; Greek
feminine nouns such as `-η`, `-ια`, and `-εια` use `F`. Do not infer gender
from the spelling alone for indeclinables, prepositions, or ambiguous
substantivized adjectives; leave those for explicit review.

Use `derivation: "CAUS"` for bare source labels such as `CAUS`. Do not keep
`"CAUS"` as a meaning or note. If the causative's target is known, use
`relations[]` instead; if the target is unresolved or ambiguous, keep a
localized `senses[].notes` explanation.

Important distinction:

```json
"grammar": {
  "pos": "V",
  "form": "STA"
}
```

Use `form: "STA"` for stative. Do not write `valency: "STA"`, because
`valency` is only for `INTR` and `TR`.

### Remaining `UNKNOWN` POS Senses

About 370 senses currently use `pos: "UNKNOWN"`. These are predominantly obscure
Egyptian-heritage words where Crum recorded "meaning unknown". If you
encounter one of these entries and can determine the part of speech from a
reliable source, reclassify it and remove the `UNKNOWN` tag. Do not reclassify
speculatively.

## Inflections

`inflections` stores related forms that belong under a parent entry instead of
standing as independent entries. Current kinds include:

- `imperative`
- `plural`
- `feminine`
- `masculine`
- `dual`

Each kind is organized by dialect, then by role:

```json
"inflections": {
  "plural": {
    "B": {
      "default": ["ⲟⲩⲣⲱⲟⲩ"]
    }
  }
}
```

Common roles:

- `default`: general related form without a verb-state distinction.
- `absolute`: absolute/free form.
- `nominal`: bound nominal form, normally ending in `-`.
- `pronominal`: bound pronominal form, normally ending in `=`.

## Imperatives

Imperatives are stored as `inflections.imperative`. They use the same verb-state
roles as verbal dialect data.

Good:

```json
"inflections": {
  "imperative": {
    "B": {
      "absolute": ["ⲙⲟⲓ"],
      "nominal": ["ⲙⲁ-"],
      "pronominal": ["ⲙⲏⲓ="],
      "variants": {
        "pronominal": ["ⲙⲏⲓⲧ=", "ⲙⲟⲓⲧ="]
      }
    }
  }
}
```

Avoid:

```json
"pronominal": [
  "ⲙⲏⲓ=",
  {
    "form": "ⲙⲏⲓⲧ=",
    "notes": ["Imperative variant."]
  }
]
```

The first form under a role is the primary form. Secondary forms should go under
`variants` with the same role name.

### Gendered And Numbered Imperatives

Use structured form objects when an imperative form needs gender or number
metadata.

Example:

```json
"inflections": {
  "imperative": {
    "B": {
      "absolute": [
        {
          "form": "ⲁⲙⲟⲩ",
          "gender": "M",
          "number": "SG"
        },
        {
          "form": "ⲁⲙⲏ",
          "gender": "F",
          "number": "SG"
        },
        {
          "form": "ⲁⲙⲱⲓⲛⲓ",
          "number": "PL"
        }
      ]
    }
  }
}
```

The UI can then render these as `ⲁⲙⲟⲩ m sg`, `ⲁⲙⲏ f sg`, and
`ⲁⲙⲱⲓⲛⲓ pl`.

## Structured Form Objects

Plain strings are preferred:

```json
"pronominal": ["ⲙⲏⲓ="]
```

Use an object only when you need metadata:

```json
{
  "form": "ⲁⲙⲟⲩ",
  "gender": "M",
  "number": "SG"
}
```

Supported metadata:

- `form`: required Coptic form text.
- `entryId`: related dictionary entry id.
- `gender`: `M`, `F`, or `BOTH`.
- `number`: `SG` or `PL`.
- `uncertain`: boolean.
- `notes`: substantive editorial notes.

Do not use `notes` to repeat structural information. If a form is in
`variants`, it is already a variant.

## Decision Table

| Situation                         | Use                                                 |
| --------------------------------- | --------------------------------------------------- |
| Primary dialect spelling          | `dialects.<dialect>.<state>`                        |
| Alternate dialect spelling        | `dialects.<dialect>.variants.<state>`               |
| Source-form inventory             | `dialects` / `inflections`                          |
| Translation                       | `senses[].meanings.en` / `senses[].meanings.nl`     |
| Dialect-restricted translation    | `dialectMeanings[]`                                 |
| Explanation or derivation note    | `senses[].notes.en` / `senses[].notes.nl`           |
| Greek or grammar equivalence      | `senses[].notes.en` / `senses[].notes.nl`           |
| Source uncertainty or citation    | localized `notes` on the relevant object            |
| Source comparison or opposition   | localized `notes`; `relations[]` if target resolves |
| Resolved semantic cross-reference | `relations[]`                                       |
| Compound/root link                | `relations[]` with `COMPOUND_WITH`                  |
| Imperative of a verb              | `inflections.imperative.<dialect>`                  |
| Imperative alternate spelling     | `inflections.imperative.<dialect>.variants.<state>` |
| Gendered or numbered imperative   | structured form object with `gender` / `number`     |
| Plural or feminine counterpart    | `inflections.plural` / `inflections.feminine`       |
| Separate lexical item             | its own entry, unless deliberately merged           |

## Merging Entries

When merging duplicate entries:

1. Choose one canonical entry id.
2. Move useful dialect forms, variants, Greek context, meanings, notes, and
   inflections into the canonical entry.
3. Remove the duplicate entry object.
4. Search the repo for stale references to the removed id.
5. Regenerate grammar data if grammar links referenced the removed id.
6. Update current dataset tests that count structured forms.

Useful checks:

```bash
rg '"id": 428|dictionaryEntryId": "428"' public src tests
npm run data:grammar:export
npm run test -- src/features/dictionary/lib/dictionary.dataset.test.ts
```

## Search And Rendering

Dictionary forms feed several consumers:

- entry pages
- dictionary search
- public dictionary API routes
- grammar dictionary-link enrichment
- Open Graph previews

If you add a new field shape, update all relevant readers, not just the entry
page. For inflection changes, check at least:

- `src/features/dictionary/types.ts`
- `src/features/dictionary/lib/dictionaryValidation.ts`
- the relevant grouped `src/features/dictionary/lib/dictionaryValidation*.ts`
  module
- `src/features/dictionary/lib/entryDisplay.ts`
- `src/features/dictionary/search.ts`
- `src/features/dictionary/lib/dictionary.dataset.test.ts`

## Quick Checklist

Before committing dictionary JSON changes:

- The JSON parses.
- New fields are allowed by validation.
- Dialect restrictions live in `dialectMeanings`, not as trailing sigla in
  meanings.
- Variants live under `variants`, not as comma-separated text.
- Notes are real notes, not hidden translations or structural labels.
- Related forms are searchable.
- The relevant entry page still renders cleanly.
- `npm run format:check`, focused dataset tests, and the broader test/build
  checks pass for schema-level changes.
