# Contributing

Thanks for helping improve the digital learning tools.

## Local Setup

Use the pinned Node.js version before installing dependencies:

```bash
nvm use
npm ci
```

Use `npm install` instead when you intentionally need to update
`package-lock.json`.

If you need auth, profile avatars, contact email, or distributed rate limiting locally, copy the example environment file and fill in your own values:

```bash
cp .env.example .env.local
```

Do not commit `.env.local`. It is gitignored by default, while [`.env.example`](./.env.example) is tracked with placeholder values only.

If you plan to run the browser smoke tests locally, install the Playwright browser once:

```bash
npx playwright install --with-deps chromium
```

## What Contributions Are Most Helpful

- Dictionary corrections, additions, or metadata cleanup
- Grammar and learning content
- UI improvements for readability, pedagogy, and accessibility
- Student or instructor workflow refinements
- README, API docs, localization, and test coverage improvements

## Repository Workflows

Before making structural changes, read [docs/architecture.md](./docs/architecture.md) for the current routing, feature, action, and shared-infrastructure layout. For visible interface work, also read [docs/ui-guide.md](./docs/ui-guide.md).

### Architecture Checklist

Before adding or moving code, make sure the change follows the Coptic Compass
feature-oriented architecture:

- keep `src/app` pages and route handlers thin; route files should orchestrate,
  not own product workflows
- place feature UI, hooks, helpers, domain logic, and feature-owned server
  modules under `src/features/<feature>`
- put server-only feature queries, route implementations, provider
  orchestration, and persistence helpers under
  `src/features/<feature>/lib/server`
- keep `src/actions` focused on form/client mutation entry points; move growing
  implementation details into feature-owned modules
- use `src/lib` only for genuine cross-feature infrastructure, not
  feature-specific business logic
- keep generated JSON/data artifacts in `public/data` or source content under
  `src/content`, not embedded in application logic

If your PR changes placement rules or establishes a new pattern, update
[docs/architecture.md](./docs/architecture.md) in the same PR.

### App, UI, and Routing Changes

Run the app locally with:

```bash
npm run dev
```

Public pages live under `/en` and `/nl`, and the legacy non-localized routes redirect to their localized equivalents.

Dictionary search pages use `/en/dictionary` and `/nl/dictionary`. Individual dictionary entries use `/en/entry/<id>` and `/nl/entry/<id>` as the canonical route shape; do not add localized `/dictionary/<id>` entry pages unless the routing model is intentionally changed.

If your change touches auth, dashboard, admin review, profile avatars, or contact email, make sure `.env.local` is populated first.

For visible UI changes, keep page intros, action groups, filters, panels, and mobile behavior aligned with [docs/ui-guide.md](./docs/ui-guide.md).

### Grammar Content Changes

Grammar source lives under `src/content/grammar`. After editing grammar source files or the export/build logic, run:

```bash
npm run data:grammar:export
```

Then review the generated files under `public/data/grammar/v1` and spot-check the relevant surfaces:

- `/api/v1/grammar`
- `/api/v1/grammar/lessons`
- `/api-docs`

### Dictionary Changes

The site currently serves the normalized checked-in dataset at `public/data/dictionary.json`. Runtime dictionary entries should use structured fields such as `dialects`, `senses`, `meanings.en`, `meanings.nl`, `greekContext`, `inflections`, and `relations` rather than raw/source-only text fields.

Before editing dictionary JSON, read [docs/dictionary-json.md](./docs/dictionary-json.md) for the field conventions, variant patterns, imperative forms, notes, and validation workflow.

Do not keep source dumps or one-off migration artifacts in `public/data` or runtime code. If a scholarly source file is needed for a future enrichment pass, keep it outside the tracked app tree and treat `public/data/dictionary.json` as the reviewed runtime source of truth.

Grammar abbreviations and part-of-speech display rules live in `src/features/dictionary/grammarRegistry.ts`; update that registry and its tests when dictionary grammar labels change.

For lexical corrections, include the scholarly or source rationale in your PR. For larger source-data refreshes, coordinate the ingest workflow separately with the maintainer.

### Supabase-Backed Changes

If you change auth, profiles, learner progress, submissions, or avatar storage, include the necessary SQL in `supabase/migrations` and describe any setup or rollout steps in your PR.

If you change release delivery, audience sync, notification emails, or Supabase Edge Functions, also document:

- required Resend or sender environment variables
- whether a Supabase function deploy is needed
- whether any follow-up dashboard setup is required

## Security Policy

Report security issues privately through the Coptic Compass contact page:
https://www.copticcompass.com/contact. If the report is not sensitive, opening
an issue is also fine.

Do not commit real Supabase credentials to the repository. Public anon configuration belongs in environment variables and deployment settings, while service-role or other secret keys must never be committed.

## Pull Request Notes

Please keep PRs focused and explain:

- what changed
- why it changed
- which architecture layer or feature owns the new behavior
- whether the update is editorial, lexical, technical, visual, or schema-related
- any source or scholarly rationale behind dictionary or grammar edits
- any required environment variables, migrations, or follow-up steps
- whether any Resend or Supabase function configuration changed
- screenshots for visible UI changes when they help reviewers

## Suggested Validation

Before opening a PR, run:

```bash
npm run format:check
npm run knip
npm run lint
npm run test
npm run build
```

If you changed grammar content or the export/build pipeline, also run:

```bash
npm run data:grammar:export
```

If you changed routing, auth, redirects, metadata, dashboard/admin flows, or major UI flows, also run:

```bash
npm run test:e2e:local
```

If you changed API or UI error handling, add or update focused tests for public
error copy, API JSON error payloads, and any admin technical-details disclosure.
The repo also includes guardrail tests that flag common raw-error leaks such as
direct `error.message` rendering, direct `payload.error` rendering, `alert(`,
and environment variable names in non-technical UI copy.

## Style Guidelines

- Preserve Coptic spelling and dialect notation exactly unless the change is intentional
- Prefer small, reviewable commits over broad unrelated changes
- Prefer feature-owned modules over adding new cross-feature megafiles; query logic usually belongs under `src/features/*/lib/server`
- Keep route files, page files, and `src/actions` entry points thin when a feature-owned helper can carry the implementation
- Do not add feature-specific workflow logic to `src/lib`; reserve it for shared infrastructure
- Flag uncertain readings or reconstructions clearly in the PR description
- Keep UI additions consistent with the academic and reference-focused character of the app
- Keep English and Dutch user-facing copy aligned when editing localized content
- Follow the UI guidance in `docs/ui-guide.md` for page rhythm, controls, mobile behavior, and shared primitives
- Follow the Dutch localization guidance in `docs/dutch-localization-style-guide.md` for tone, terminology, and product naming
