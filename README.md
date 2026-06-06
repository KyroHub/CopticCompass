<div align="center">
  <img src="public/readme/social-preview-1280-640.png" alt="Coptic Compass digital Coptology platform preview" width="100%" />

  <h3>A trusted digital Coptology platform.</h3>

  <p>Publications · Grammar · Dictionary · Practice · Public APIs · Shenute AI</p>

  <div>
    <a href="https://www.copticcompass.com"><img src="https://img.shields.io/badge/Live_Site-www.copticcompass.com-C08329?style=flat-square" alt="Live Site"></a>
    <a href="https://github.com/KyroHub/CopticCompass/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License"></a>
    <a href="https://github.com/KyroHub/CopticCompass/pulls"><img src="https://img.shields.io/badge/PRs-welcome-008329?style=flat-square" alt="PRs Welcome"></a>
  </div>
</div>

---

**Coptic Compass** brings together a searchable dictionary, structured grammar lessons, cross-pillar practice, publications, Shenute AI, public APIs, and private learning workspaces for Coptic language study and research.

## Features

- **Searchable Dictionary:** 6,300+ normalized checked-in entries with Coptic, English, Dutch, and Greek-context lookup. Includes dialect forms, lexical relations, canonical entry pages, and a built-in virtual keyboard.
- **Interactive Grammar Lessons:** Reading and study modes with exercises, footnotes, and concept glossaries linked directly to dictionary sources.
- **Practice:** Spaced-repetition review for dictionary forms, grammar prompts, mixed daily study, and saved entries.
- **Shenute AI Assistant:** OCR-assisted image prompts backed by pgvector RAG, integrating THOTH AI, OpenRouter, Gemini, and Hugging Face.
- **Public APIs:** Read-only grammar and dictionary JSON endpoints plus OpenAPI documentation for developers and educators.
- **Student & Instructor Workspaces:** Private dashboards for progress tracking, exercise submissions, reviews, and notifications.
- **Localized UI:** Full support for both English and Dutch.

## Interface

<p align="center">
  <img src="public/readme/homepage-preview-1.png" alt="Coptic Compass homepage hero preview" width="49%" />
  <img src="public/readme/homepage-preview-2.png" alt="Coptic Compass platform overview preview" width="49%" />
</p>

<p align="center">
  <img src="public/readme/dictionary-search-preview.png" alt="Dictionary search interface preview" width="49%" />
  <img src="public/readme/lesson-preview.png" alt="Grammar lesson preview" width="49%" />
</p>

<p align="center">
  <img src="public/readme/publications-preview.png" alt="Publications catalog preview" width="49%" />
  <img src="public/readme/shenute-preview.png" alt="Shenute AI workspace preview" width="49%" />
</p>

## Quickstart

The application is built on Next.js 16 (App Router), React 19, Tailwind CSS 4, and Supabase.

```bash
git clone https://github.com/KyroHub/CopticCompass.git
cd CopticCompass
nvm use
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]  
> To enable Supabase auth, AI routing, or email features locally, copy `.env.example` to `.env.local` and add your credentials. See our [Architecture Docs](docs/architecture.md) for more details.

## Repository Guide

This repo is organized around a few clear layers:

- `src/app` owns thin routes, route handlers, metadata, and app shell entry points.
- `src/features` owns feature-specific UI, hooks, server helpers, and logic.
- `src/actions` owns shared server actions used by forms and client mutations.
- `src/lib` owns shared infrastructure such as Supabase wiring, locale helpers, metadata, and validation.
- `src/content/grammar` owns typed grammar source files that are exported into checked-in data.
- `public/data` owns the generated or checked-in datasets consumed by the app and public API.
- `supabase` owns SQL migrations and Edge Functions.
- `tests/e2e` owns the Playwright smoke tests used in CI.

For structural changes, treat [docs/architecture.md](docs/architecture.md) as
the source of truth. Product logic should default to `src/features/<feature>`;
`src/lib` is only for infrastructure that is genuinely shared across features.
As feature surfaces grow, keep routes and page clients as orchestration shells
and split reusable components, hooks, server pipelines, schemas, and validation
rules by named responsibility.

## Common Commands

The main scripts in `package.json` are:

- `npm run dev` - start the local app with the webpack dev server.
- `npm run build` - create a production build, including the grammar data export step.
- `npm run lint` - run ESLint with zero-warnings enforcement.
- `npm run test` - run the Vitest suite.
- `npm run test:e2e` - run Playwright end-to-end tests.
- `npm run test:e2e:local` - build first, then run the Playwright smoke tests.
- `npm run knip` - check for dead code and unused exports.
- `npm run format:check` - verify formatting with Prettier.
- `npm run data:grammar:export` - regenerate the public grammar JSON bundle from source.
- `npm run db:migrations:list` - compare local and linked Supabase migrations.
- `npm run db:push:dry-run` - preview pending Supabase migration changes.
- `npm run db:push` - apply pending Supabase migrations to the linked project.

## Environment Setup

Start with `.env.example` and fill in only the services you need. The most common values are:

- Supabase URL and anon/service-role keys for auth and server-side data access.
- Resend API keys and sender addresses for contact and notification flows.
- Optional Upstash or Vercel KV settings for shared rate limiting.
- AI provider keys for Shenute AI and embedding workflows.
- OCR service settings for the server-side OCR proxy.

For production and external callbacks, the canonical site URL should be `https://www.copticcompass.com`.

## Validation Before PRs

For CI parity from a clean checkout, run the same core checks locally:

```bash
npm ci
npm run format:check
npm run knip
npm run lint
npm run test
npm run build
```

If you change routing, auth, metadata, redirects, or major UI flows, also install the Playwright browser and run the smoke suite:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

## Documentation

For deep dives into the technical architecture, environment setup, API surfaces, or localization guidelines, start with the [Docs Overview](docs/README.md):

- [Architecture & Workflows](docs/architecture.md)
- [Coptic Compass Brand Book](docs/coptic-compass-brand-guide.md)
- [UI Guide](docs/ui-guide.md)
- [Dictionary JSON Guide](docs/dictionary-json.md)
- [Environment & Deployment Setup](docs/environment-setup.md)
- [API, AI, and Data Workflows](docs/api-and-workflows.md)
- [AI & RAG Distillation Pipeline](docs/distillation.md)
- [Dutch Localization Style Guide](docs/dutch-localization-style-guide.md)

## Contributing

Contributions are welcome! Whether it's lexical corrections, UI refinements, or pedagogical improvements, we'd love your help.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and review our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

## License & Attribution

- **Source code:** [MIT License](LICENSE)
- **Content & Data:** Grammar lessons, dictionary data, and publication metadata are subject to specific academic rights. Please preserve scholarly attribution and source context when reusing material.
- **THOTH AI Credits:** Created by Dr. So Miyagawa (University of Tsukuba). [Learn more](https://somiyagawa.github.io/THOTH.AI/).
