# Dutch Localization Style Guide

This guide defines the preferred Dutch voice, terminology, and review rules for Coptic Compass. Use it when adding or revising Dutch UI copy, metadata, email copy, API documentation, grammar content, or help text.

## Goals

- Make Dutch copy sound natural, precise, and scholarly without becoming stiff.
- Keep English and Dutch meaning aligned, while allowing idiomatic Dutch phrasing.
- Preserve Coptic, linguistic, and technical terms consistently across the app.
- Avoid translating protocol names, route names, database names, API fields, or product names when they are code-facing identifiers.

## Voice and Address

- Use `u` and `uw` for user-facing Dutch copy.
- Use a clear, respectful, academic tone. Prefer concise sentences over literal English sentence structure.
- Avoid mixing `je` and `u` in the same surface. When revising existing Dutch copy, normalize it to `u`.
- Legal and account copy may be slightly more formal, but the same `u` voice should apply.
- Avoid exclamation marks unless the English source intentionally needs a warmer confirmation tone.

Examples:

- Prefer: `Voer uw e-mailadres in.`
- Avoid: `Voer je e-mailadres in.`
- Prefer: `Uw antwoorden zijn opgeslagen.`
- Avoid: `Je antwoorden zijn veilig opgeslagen!`

## Brand and Product Names

- Keep `Coptic Compass` as the product brand in Dutch copy.
- Keep `Shenute AI`, `THOTH AI`, `OpenRouter`, `Gemini`, `Hugging Face`, `Supabase`, `Dify`, `Resend`, and `Vercel` unchanged.
- Do not translate route names, API endpoint paths, environment variable names, database table names, or code identifiers.
- Use Dutch around code identifiers rather than translating the identifiers themselves.

Examples:

- Prefer: `Coptic Compass biedt een doorzoekbaar woordenboek.`
- Avoid: `Koptisch Kompas biedt een doorzoekbaar woordenboek.`
- Prefer: `Gebruik POST /api/shenute voor Shenute AI-antwoorden.`
- Avoid: `Gebruik POST /api/shenute-aanvragen voor Shenute AI-antwoorden.`

## Capitalization

- Use Dutch sentence case for headings, buttons, labels, and navigation unless a proper noun requires capitalization.
- Capitalize proper nouns and product names.
- Do not capitalize ordinary nouns such as `woordenboek`, `grammatica`, `contact`, `zelfstandig naamwoord`, or `bijvoeglijk naamwoord`.

Examples:

- Prefer: `Koptisch woordenboek`
- Avoid: `Koptisch Woordenboek`
- Prefer: `Neem contact op`
- Avoid: `Neem Contact Op`
- Prefer: `Zelfstandig naamwoord` only when the UI context title-cases every option by design; otherwise use `zelfstandig naamwoord`.

## Coptic and Linguistic Terminology

- Preserve Coptic text exactly.
- Preserve established Dutch Coptic dialect names already used in the project. Do not re-standardize them unless the content owner explicitly asks for that.
- Translate `determiner` as `determinator (bepaler)` when first introduced in a page, section, lesson, or glossary entry. After that, `determinator` may be used on its own if context is clear.
- Use `substantief` in grammar-theory contexts when discussing noun classes and determination. Use `zelfstandig naamwoord` in beginner-facing UI or explanatory text when clarity matters.
- Use `lemma` for dictionary entries. Avoid `entry` in Dutch UI unless it is code-facing or part of an API name.
- Use `woordsoort` for `part of speech`.
- Use `naamwoordelijk` or `nominaal` depending on the established grammar context. Keep `nominale zin` where the course already uses that term.
- Use `statief` for `stative`.
- Use `voorvoegsel` for general learner-facing copy, and `prefix` where the grammar discussion is technical or tied to established terminology.
- Use `onbepaald`, `bepaald`, `bezittelijk`, and `aanwijzend` for determiner categories.
- Keep structured dictionary and grammar sigla such as `m`, `f`, `sg`, and
  `pl` unchanged across locales. Localize their accessible labels and tooltips,
  for example `f` with the Dutch label `Vrouwelijk`.
- Do not introduce locale-specific replacements such as `v`, `s`, or `p` in
  code-facing markers unless the underlying shared data contract is
  intentionally changed for every consumer.

## Technical and Developer Terms

For developer-facing copy, prefer clear Dutch while preserving common technical nouns when they are standard in the audience.

- `endpoint`: use `endpoint`.
- `API`: use `API`; compounds should usually be hyphenated, such as `API-documentatie`.
- `OpenAPI JSON`: keep unchanged.
- `provider`: use `provider`.
- `routing`: use `routering` only when discussing technical routing. Otherwise rephrase as `keuze van provider` or `providerkeuze`.
- `fallback`: use `fallback` in technical docs, or `terugvaloptie` in general UI.
- `request`: use `request` in code examples and developer docs, otherwise `verzoek`.
- `response`: use `response` in API docs, otherwise `antwoord` or `reactie` depending on context.
- `dataset`: use `dataset`.
- `schemaVersion`, `datasetVersion`, and `generatedAt`: keep unchanged.
- `dashboard`: use `dashboard`.
- `workspace`: use `werkruimte` in general UI, but keep `workspace` if it names a product or technical concept.
- `workflow`: prefer `workflow` in admin/developer contexts; use `werkwijze` in general UI if it sounds more natural.
- `upload`: use `uploaden` as a verb and `upload` as a noun.

## UI Copy Patterns

- Buttons should be short, action-first, and polite without being wordy.
- Placeholders may use an imperative form, but should still use the formal voice where a pronoun is needed.
- Error messages should explain what happened and what the user can do next.
- Loading states should be concise.
- Empty states should avoid blame and suggest a next action.

Examples:

- `Inloggen` for a short button is fine.
- `Meld u aan om Shenute AI te gebruiken.` is better for a full prompt.
- `Geen OCR-uitvoer beschikbaar` is better than `No OCR output yet`.
- `Voeg een afbeelding toe` is better than `Add Image`.

## Punctuation and Orthography

- Use Dutch ellipses sparingly. Existing `...` is acceptable in UI loading states.
- Use correct diacritics, such as `kopiëren`.
- Avoid slash-heavy copy when Dutch reads better as a phrase.
- Prefer `e-mailadres`, `e-mailupdates`, and `privacybeleid`.
- Use hyphenation for readable compounds involving acronyms or English product terms, such as `API-docs`, `OCR-service`, `Shenute AI-antwoorden`, and `OpenRouter-provider`.

## Content Types

### Public Marketing and Navigation

- Keep product names unchanged.
- Prefer accessible, direct Dutch over literal English marketing phrasing.
- Avoid translating `Coptic Compass` to `Koptisch Kompas`.

### Grammar Lessons

- Prioritize terminological precision over brevity.
- Introduce technical terms with parenthetical clarification when useful.
- Keep Coptic examples, sigla, table labels, and scholarly abbreviations stable.
- Do not rewrite established dialect labels during a general translation pass.

### Dictionary UI

- Use `lemma` and `lemma's`.
- Use `woordenboek` for the tool.
- Use `verwante vormen` or `verwante lemma's` depending on whether the UI shows forms or entries.

### Authentication, Dashboard, and Account Copy

- Use `u` and `uw`.
- Prefer calm operational language.
- Avoid casual phrasing in deletion, privacy, password, and account-management flows.

### Communication Emails

- Keep the sender/product identity as `Coptic Compass`.
- Translate the surrounding body copy naturally, but preserve product, provider,
  endpoint, and environment variable names.
- Prefer `e-mailupdates`, `e-mailadres`, `bevestigen`, `release`, and
  `contentrelease` according to context.
- Keep signoffs formal and concise, such as `Met vriendelijke groet,`.

### Developer Documentation

- Preserve exact endpoint paths, method names, JSON fields, environment variables, and provider names.
- Dutch surrounding prose is welcome, but code examples should stay executable and should not translate identifiers.
- Do not introduce localized URL paths unless they add clear user value. Translating the surrounding text is usually enough.

## Review Checklist

Before merging Dutch copy changes, check:

- Does every English user-facing string have a Dutch equivalent where the surface is localized?
- Does the copy use `u` and `uw` consistently?
- Are product names and code-facing identifiers preserved?
- Are `determiner`, `determinator`, and `bepaler` handled according to this guide?
- Are Coptic dialect names left in their established Dutch forms?
- Are headings and buttons in Dutch sentence case?
- Are obvious anglicisms either intentional for a technical audience or replaced with natural Dutch?
- Are diacritics and compounds correct, such as `kopiëren`, `e-mailadres`, and `API-docs`?
- Does the Dutch fit in the same UI space as the English?
