# Environment & Deployment Setup

This document covers runtime assumptions, environment variables, Supabase webhooks, and CI/CD configuration.

## Runtime Assumptions

- Production is currently designed around Next.js running on the Node.js runtime, typically on Vercel.
- Cloudflare works well in front of the app as DNS, CDN, or proxy, but the app is not currently structured for Cloudflare Workers or other Edge-only runtimes.
- Some server modules read local project files at build or request time, including dictionary JSON files in `public/data`, grammar exports, and source timestamps used by the sitemap.
- If you later want to move more of the app to Edge or Worker runtimes, these filesystem reads should be replaced with build-time imports, generated manifests, or storage/API-backed lookups.

## Environment Setup

Copy the example file only if you want to enable Supabase auth, profile avatars, contact email, owner notifications, or distributed rate limiting locally:

```bash
cp .env.example .env.local
```

Then replace the placeholder values in `.env.local` with your own local credentials.

Additional notes:

- `SUPABASE_SERVICE_ROLE_KEY` is only needed for trusted server-side workflows such as internal message persistence or notification dispatching.
- `CONTACT_EMAIL` is the public contact inbox destination.
- `OWNER_ALERT_EMAIL` is for operational alerts such as new signups or exercise submissions.
- `NOTIFICATION_FROM_EMAIL` is the sender identity used by app-generated notification emails.

Important:

- `.env.local` is gitignored and should never be committed.
- `.env.example` contains placeholders only and is safe to track.
- If you skip environment setup, public pages and the read-only grammar API still work, but auth, dashboards, avatar uploads, instructor review, and email-backed features may be unavailable.

## Environment Variable Reference

The baseline local template lives in `.env.example`. The list below highlights
the most important variables by subsystem. Deployment-provided variables such as
`VERCEL_URL`, `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `NODE_ENV`, and
rarely changed optional tuning knobs may not need local placeholders. When a new
manual environment variable becomes required for local development or rollout,
add it to `.env.example` and this guide together.

### Core App and Supabase

- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

In production, set `NEXT_PUBLIC_SITE_URL` and `SITE_URL` to `https://www.copticcompass.com` so auth callbacks, metadata, sitemaps, structured data, and generated share links use the canonical domain.

### Shenute AI / LLM Routing

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_CHAT_MODEL`
- `OPENROUTER_EMBEDDING_MODEL`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_TITLE`
- `GEMINI_API_KEY`
- `GEMINI_CHAT_MODEL` (optional)
- `GEMINI_EMBEDDING_MODEL` (optional)
- `GEMINI_EMBEDDING_OUTPUT_DIMENSION` (default `3072`)
- `HF_TOKEN`
- `HF_CHAT_MODEL` (optional)
- `HF_CHAT_TIMEOUT_MS` (optional)
- `HF_CHAT_MAX_RETRIES` (optional)
- `HF_CHAT_RETRY_BASE_MS` (optional)
- `HF_EMBEDDING_MODEL` (optional)
- `THOTH_API_KEY`
- `THOTH_BASE_URL`
- `THOTH_RESPONSE_MODE`
- `THOTH_CHAT_TIMEOUT_MS`

In production, set `OPENROUTER_HTTP_REFERER` to `https://www.copticcompass.com` and keep `OPENROUTER_APP_TITLE` as `Coptic Compass`.

### OCR

- `OCR_SERVICE_URL`
- `OCR_UPLOAD_FIELD`
- `OCR_MAX_UPLOAD_BYTES`

`OCR_SERVICE_URL` must use `https:`. The OCR proxy intentionally ignores
unexpected query parameters and form fields instead of forwarding them upstream.

### Distributed Rate Limiting

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Use either the Upstash Redis names or the Vercel KV-compatible aliases. In
production, protected routes fail closed when no shared backend is configured.

### RAG Ingestion Tuning

- `RAG_EMBEDDING_BATCH_SIZE`
- `RAG_INSERT_BATCH_SIZE`
- `RAG_OCR_TIMEOUT_MS`
- `RAG_OCR_MAX_RETRIES`
- `RAG_DB_INSERT_MAX_RETRIES`
- `RAG_RETRY_BASE_MS`
- `RAG_VECTOR_DIMENSIONS`
- `RAG_THOTH_ENABLED`
- `RAG_THOTH_PROOFCHECK_REQUIRED`
- `RAG_THOTH_CHUNK_INPUT_LIMIT`
- `RAG_THOTH_JSON_SAMPLE_LIMIT`
- `RAG_THOTH_RECONCILE_TEXT_LIMIT`

### Embedding Network Retry Tuning

- `HF_EMBEDDING_TIMEOUT_MS`
- `HF_EMBEDDING_MAX_RETRIES`
- `HF_EMBEDDING_RETRY_BASE_MS`
- `OPENROUTER_EMBEDDING_TIMEOUT_MS`
- `OPENROUTER_EMBEDDING_MAX_RETRIES`
- `OPENROUTER_EMBEDDING_RETRY_BASE_MS`

### Shenute Feedback and Translation Helpers

- `CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED`
- `CHAT_FEEDBACK_THOTH_INPUT_LIMIT`
- `NMT_TRANSLATOR_SPACE`
- `NMT_TRANSLATOR_TIMEOUT_MS`

### Distillation Pipeline

The distillation scripts also use:

- `DISTILL_EXTRACT_PAGE_SIZE`
- `DISTILL_TEACHER_MAX_RETRIES`
- `DISTILL_TEACHER_RETRY_BASE_MS`
- `DISTILL_TEACHER_RETRY_MAX_MS`
- `DISTILL_TEACHER_TIMEOUT_MS`

See `docs/distillation.md` for the pipeline-specific workflow.

### Observability

- `SCALABILITY_LOGGING`
- `NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED`
- `NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH`
- `NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG`

`SCALABILITY_LOGGING` enables additional server-side diagnostic logging.
`NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED=true` makes Vercel Analytics and Speed
Insights wait for the user's stored analytics consent before loading client
scripts. The optional Vercel observability base path and JSON client config are
used only in production Vercel deployments to customize the Analytics and Speed
Insights script sources, endpoints, or data attributes.

### Security Headers

- `CSP_REPORT_ONLY`
- `CSP_REPORT_URI`

Set `CSP_REPORT_ONLY=true` only when you are ready to collect browser reports for
a stricter, non-enforcing CSP. The enforced CSP keeps `style-src 'unsafe-inline'`
for Next.js and Tailwind compatibility; report-only mode removes inline script
and style fallbacks so violations can be reviewed before any enforcement change.
Use `CSP_REPORT_URI` to point reports at a trusted relative or HTTPS endpoint.

### Avatar Storage

Profile avatars intentionally use a public Supabase Storage bucket because the
product displays them as public profile media. Anyone with an avatar object URL
can fetch that image, so users should not treat profile pictures as private
documents. Uploads are limited at the bucket level to JPEG, PNG, or WebP files up
to 1 MB, and the profile update action still validates that persisted avatar URLs
belong to the authenticated user's own avatar path.

## Supabase Webhooks & Background Work

### Signup Alert Webhook

This repo includes a Supabase Edge Function at `supabase/functions/profile-signup-alert` that sends an owner alert whenever a new row is inserted into `public.profiles`.

To enable signup alerts in a Supabase project:

1. Set function secrets for `RESEND_API_KEY`, `OWNER_ALERT_EMAIL`, and `NOTIFICATION_FROM_EMAIL`.
2. Deploy the function: `supabase functions deploy profile-signup-alert --project-ref <your-project-ref>`
3. Create a database webhook on `public.profiles` for `INSERT` events.
4. Choose `Supabase Edge Functions` as the webhook target, select `profile-signup-alert`, and configure the required auth header.

The function rejects unauthenticated requests in code as well, so the webhook
must send the configured bearer auth header.

### Background Release Delivery

This repo includes a Supabase Edge Function at `supabase/functions/process-content-release` for background delivery of approved content releases. When Resend segment configuration is available, the worker hands release sends off to provider-native broadcasts. If that configuration is missing, it falls back to direct per-recipient delivery from the worker.

To enable background release sends in a Supabase project:

1. Set function secrets for `NOTIFICATION_FROM_EMAIL` and at least one Resend key: `RESEND_API_KEY` or `RESEND_API_KEY_FULL_ACCESS`.
2. Deploy the function: `supabase functions deploy process-content-release --project-ref <your-project-ref>`
3. Make sure the latest release delivery migrations have been pushed so `content_releases` includes the queue metadata columns.

The worker validates its bearer token in code, so callers must send the
configured bearer auth header.

### Queued Notification Email Delivery

This repo includes a Supabase Edge Function at
`supabase/functions/process-notification-email` for generic notification emails.
The Next.js app inserts jobs into `public.notification_email_jobs` and invokes
the worker with the queued `jobId`.

To enable queued notification email sends in a Supabase project:

1. Set function secrets for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `RESEND_API_KEY`, and `NOTIFICATION_FROM_EMAIL`.
2. Deploy the function: `supabase functions deploy process-notification-email --project-ref <your-project-ref>`
3. Make sure the latest notification email migrations have been pushed so
   `public.notification_email_jobs` exists.

### Migration Rollout

Supabase migrations live under `supabase/migrations`. Before deployment, compare and preview the linked project state:

```bash
npm run db:migrations:list
npm run db:push:dry-run
```

When the dry run matches the intended rollout, apply the pending migrations:

```bash
npm run db:push
```

The migration scripts expect the Supabase CLI to be available on `PATH`. Install
it through a trusted external channel rather than adding the `supabase` npm CLI
package to this dependency tree while its critical malware advisory remains
active. If the Supabase CLI reports that a newer version is available, update it
through the same install channel you originally used before important production
rollouts when practical.

### Resend Audience Sync

Audience opt-ins can be mirrored into Resend Contacts and Segments so provider-native broadcasts are possible.
Set these app environment variables where your Next.js server runs:

- `RESEND_API_KEY_FULL_ACCESS`
- `RESEND_LESSONS_SEGMENT_ID`
- `RESEND_BOOKS_SEGMENT_ID`
- `RESEND_GENERAL_SEGMENT_ID`
- Optional localized segment ids:
  `RESEND_LESSONS_EN_SEGMENT_ID`, `RESEND_LESSONS_NL_SEGMENT_ID`,
  `RESEND_BOOKS_EN_SEGMENT_ID`, `RESEND_BOOKS_NL_SEGMENT_ID`,
  `RESEND_GENERAL_EN_SEGMENT_ID`, and `RESEND_GENERAL_NL_SEGMENT_ID`

### Communication Branding

Email and release copy should identify the product as `Coptic Compass` with the
descriptor `Digital Coptology Platform`. The shared runtime constants live in
`src/lib/communications/mailBrand.ts`; update that file first when the public
communication identity changes.

The branded email surfaces currently include:

- contact-message owner notifications
- audience opt-in confirmation emails
- content release previews and sends
- generic notification emails that do not provide a custom HTML or React email
  template

Keep `NOTIFICATION_FROM_EMAIL` configured with a verified sender identity in
Resend. If the sender display name is managed in Resend rather than the env var,
it should still read as Coptic Compass in delivered mail clients.

## CI/CD (GitHub Actions + Vercel)

The CI workflow in `.github/workflows/ci.yml` now includes Vercel deployment jobs:

- PRs to `main` (same-repo PRs) deploy a preview after checks pass.
- Pushes to `main` deploy production after checks pass.

Set these repository secrets in GitHub before enabling deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

If these secrets are missing, the deploy jobs are skipped and CI checks still run.

## Cloudflare in Front of Vercel

Cloudflare is the proxied CDN in front of the Vercel deployment for
`copticcompass.com` and `www.copticcompass.com`. Keep SSL/TLS on `Full (strict)`
while the Vercel certificate is healthy.

### Cache Posture

The production Cloudflare zone uses a conservative rule order:

1. Bypass dynamic, authenticated, and write-oriented traffic.
2. Cache static public assets.
3. Cache anonymous public pages with a short edge TTL.
4. Cache read-only public APIs while respecting origin cache headers.

Do not cache authenticated traffic, administrative routes, AI/OCR routes, or
write-oriented API routes.

### App-Side Support

- `next.config.ts` sends long-lived public cache headers for static public
  assets.
- `src/proxy.ts` excludes static asset requests from request-bound proxy work so
  asset requests do not do session or nonce work.
- High fan-out navigation links use `prefetch={false}` where prefetching would
  create avoidable Vercel and Cloudflare traffic.

### Verification

Run each check twice. The first request may show `MISS`; the second should show
`HIT` for cached public pages and APIs.

```bash
curl -I https://www.copticcompass.com/en
curl -I https://www.copticcompass.com/api/openapi.json
```

Expected behavior:

- Static assets and cached public pages/APIs should usually show
  `cf-cache-status: HIT` on repeat requests.
- Dynamic, authenticated, and write-oriented routes should show `BYPASS`,
  `DYNAMIC`, or no cache HIT.
