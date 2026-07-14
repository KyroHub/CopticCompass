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
- `NOTIFICATION_WORKER_BEARER_TOKEN` is a long random shared secret used by the Next.js app and Supabase Edge Function to wake queued notification delivery without comparing service-role keys.

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
- `NOTIFICATION_WORKER_BEARER_TOKEN`

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

This repo includes a Supabase Edge Function at `supabase/functions/process-content-release` for background delivery of approved content releases. Marketing releases are delivered only through provider-native Resend Broadcasts with Segments and Topics. Queueing writes durable `content_release_targets` first, so retries can skip accepted targets and resume failed targets without recreating provider Broadcasts. If the required Broadcast configuration is missing, sending fails closed with an actionable admin error; the worker does not fall back to direct per-recipient Email API sends.

To enable background release sends in a Supabase project:

1. Set function secrets for `NOTIFICATION_FROM_EMAIL`,
   `RESEND_API_KEY_FULL_ACCESS`, the relevant Resend Segment IDs, and the
   matching Resend Topic IDs.
2. Deploy the function: `supabase functions deploy process-content-release --project-ref <your-project-ref>`
3. Make sure the latest release delivery migrations have been pushed so
   `content_releases` includes the queue metadata columns and
   `content_release_targets` exists.

The worker validates its bearer token in code, so callers must send the
configured bearer auth header.

Each release target follows a two-step Resend lifecycle: create a draft
Broadcast, persist its provider ID, then send the saved Broadcast. A fully
successful run marks the release `sent`; a mixed result marks it
`partially_failed` and leaves accepted targets immutable for the next admin
retry.

### Queued Notification Email Delivery

This repo includes a Supabase Edge Function at
`supabase/functions/process-notification-email` for generic notification emails.
The Next.js app calls `enqueue_notification_email_job` so the logical
`notification_events` row and durable `notification_email_jobs` row are created
or reused atomically. Direct function invocation after enqueue is only a
low-latency wake-up; the durable job row is the source of truth.

To enable queued notification email sends in a Supabase project:

1. Set function secrets for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, and
   `NOTIFICATION_WORKER_BEARER_TOKEN`. Set the same
   `NOTIFICATION_WORKER_BEARER_TOKEN` in the Next.js deployment environment so
   the app can wake the worker after queueing a job. Generate it with a command
   such as `openssl rand -base64 48`.
2. Deploy the function: `supabase functions deploy process-notification-email --project-ref <your-project-ref>`
3. Make sure the latest notification email migrations have been pushed so
   `public.notification_email_jobs`, `enqueue_notification_email_job`,
   `claim_notification_email_jobs`, and `retry_notification_email_job` exist.

The worker claims eligible jobs through the service-role-only
`claim_notification_email_jobs` database function. A claim sets `processing`,
increments `attempt_count`, and writes a five-minute lease. Queued,
retry-scheduled, and expired-lease jobs are all claimable, which lets the
worker recover after crashes. Do not grant this claim function to `anon` or
`authenticated`; it leases jobs and is intended only for trusted background
workers.

Provider retry policy:

- retryable: network errors, HTTP 408, 429, most 5xx responses, and Resend
  `409 concurrent_idempotent_requests`
- permanent: malformed requests, invalid sender/recipient, unauthorized keys,
  and Resend `409 invalid_idempotent_request`
- schedule: roughly 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours,
  with deterministic jitter

Every Resend Email API request includes a stable `Idempotency-Key` derived from
the notification event and job IDs. The job payload is not rewritten between
retries, so the same key is reused with the same body.

For scheduled recovery, invoke `process-notification-email` every minute without
a `jobId`; the worker will claim a bounded batch of eligible jobs. Supabase
supports this with `pg_cron` plus `pg_net`, and recommends storing the project
URL and auth token in Supabase Vault. Keep a valid Supabase JWT in the
`Authorization` bearer header for the Edge Function gateway, and send the
dedicated `NOTIFICATION_WORKER_BEARER_TOKEN` in the
`X-Notification-Worker-Token` header for the worker's own authorization check.
The worker uses the service-role key internally only for service-role-only
database RPCs.

Manual recovery is available from the admin notification card for failed and
dead-letter jobs. Admins must enter a reason; the
`retry_notification_email_job` function writes
`notification_email_job_audit_events`, resets the job to `queued`, and blocks
retry for actively suppressed recipients unless the event payload is classified
as required transactional mail.

The same migration creates three RLS-protected audit tables:

- `audience_consent_events` for append-only topic consent evidence
- `audience_suppressions` for restrictions that override marketing preferences
- `provider_webhook_events` for idempotent provider webhook intake

Only admins receive read policies. Writes are reserved for trusted service-role
workflows so browser clients cannot manufacture consent, suppression, or
provider-delivery evidence.

The audience-preference management migration adds the service-role-only
`apply_audience_preferences`, `confirm_audience_opt_in_request`, and
`apply_audience_preference_request` functions. It also adds
`audience_preference_requests` for hashed, 30-minute, single-use links. Keep all
three functions unavailable to `anon` and `authenticated`; the Next.js server
actions enforce explicit POSTs and IP plus email-hash rate limits before issuing
preference links.

The localized privacy policy now documents the implemented contact and mailing
data flow, processors, consent handling, delivery events, and proposed retention
periods. The site owner or qualified legal reviewer should approve that wording
and the retention periods before the related application release reaches
production.

### Resend Webhook Capture

The Next.js route `POST /api/resend/webhook` receives Resend provider events.
Configure the webhook in Resend with these event types:

- `contact.updated`
- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.failed`
- `email.bounced`
- `email.complained`
- `email.suppressed`

Set `RESEND_WEBHOOK_SECRET` to the Svix signing secret Resend gives you. The
route reads the raw body and verifies the `svix-id`, `svix-timestamp`, and
`svix-signature` headers before storing the event in
`provider_webhook_events`.

Roll out processing in two steps:

1. Leave `RESEND_WEBHOOK_PROCESSING_ENABLED=false` to capture verified events
   without side effects.
2. After captured payloads match expectations, set
   `RESEND_WEBHOOK_PROCESSING_ENABLED=true`.

When processing is enabled, provider events may only make local state more
restrictive: global unsubscribes clear all marketing topics and create an active
suppression, Topic opt-outs clear only the matching local topic, and bounces,
complaints, or suppressed events create active suppressions. Provider webhooks
never opt a local topic in.

Signed email lifecycle events also update stored delivery state. Events with an
`email_id` are matched to transactional notification deliveries, while events
with a Resend `broadcast_id` are matched to `content_release_targets`. Broadcast
feedback stores provider acceptance, delay, delivery, bounce, complaint, and
suppression separately, keeps only sanitized diagnostic codes, and applies
status precedence so a late delayed webhook cannot downgrade a delivered or
terminal target.

The admin system workspace surfaces operational alerts from bounded database
metrics for stale email jobs, expired leases, dead-letter jobs, failed webhooks,
complaints, stale content releases, audience sync drift, and elevated recent
bounces. Treat those dashboard alerts as the first fallback when email delivery
itself is degraded.

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
the official CLI through a trusted supported channel instead of adding it to
this app's dependency tree. If the CLI reports that a newer version is
available, update it through the same install channel you originally used
before important production rollouts when practical.

### Resend Audience Sync

Audience opt-ins can be mirrored into Resend Contacts, Segments, and Topics so provider-native broadcasts are possible.
Set these app environment variables where your Next.js server runs:

- `RESEND_API_KEY_FULL_ACCESS`
- `RESEND_LESSONS_SEGMENT_ID`
- `RESEND_BOOKS_SEGMENT_ID`
- `RESEND_GENERAL_SEGMENT_ID`
- `RESEND_LESSONS_TOPIC_ID`
- `RESEND_BOOKS_TOPIC_ID`
- `RESEND_GENERAL_TOPIC_ID`
- Optional localized segment ids:
  `RESEND_LESSONS_EN_SEGMENT_ID`, `RESEND_LESSONS_NL_SEGMENT_ID`,
  `RESEND_BOOKS_EN_SEGMENT_ID`, `RESEND_BOOKS_NL_SEGMENT_ID`,
  `RESEND_GENERAL_EN_SEGMENT_ID`, and `RESEND_GENERAL_NL_SEGMENT_ID`

Segments are targeting groups only. Do not treat Segment membership as consent
evidence. Topic subscriptions are synchronized explicitly from Supabase topic
booleans, and Broadcast sends require the matching Topic ID.

### Communication Branding

Email and release copy should identify the product as `Coptic Compass` with the
descriptor `Digital Coptology Platform`. The shared runtime constants live in
`supabase/functions/_shared/mailRendering.ts`, with
`src/lib/communications/mailBrand.ts` kept as the Next.js compatibility
re-export; update the shared module first when the public communication
identity changes.

The branded email surfaces currently include:

- contact-message owner notifications
- audience opt-in confirmation emails
- content release previews and sends
- generic notification emails that do not provide a custom HTML or React email
  template

Keep `NOTIFICATION_FROM_EMAIL` configured with a verified sender identity in
Resend. If the sender display name is managed in Resend rather than the env var,
it should still read as Coptic Compass in delivered mail clients.

Supabase Edge Functions that call the direct Resend Email API should use
`supabase/functions/_shared/resendEmail.ts` for payload construction,
idempotency headers, reply-to handling, tags, and non-throwing error results.
Resend Broadcasts remain separate because release sends create, persist, and
send provider Broadcast drafts.

### Email Tracking Policy

The application does not intentionally enable email open or click tracking in
code. Prefer provider acceptance, delivery, delay, bounce, complaint,
unsubscribe, and suppression events for operational observability. Do not use
engagement data to silently expand consent, add Topics, or widen audience
membership. If tracking is enabled in a provider dashboard later, update the
privacy policy and this guide before rollout.

### Mailing Retention

The database function `run_mailing_retention` reports or applies cleanup for
short-lived mailing tokens and detailed delivery payloads. It defaults to
dry-run mode and is executable only by trusted service-role/database-owner
contexts.

Preview the current impact before enabling cleanup:

```sql
select *
from public.run_mailing_retention(true);
```

Apply the cleanup only after the preview matches expectations:

```sql
select *
from public.run_mailing_retention(false);
```

Current retention windows:

- expired, unconfirmed double opt-in requests: delete after 30 days
- expired preference-management links: delete after 30 days
- raw provider webhook payloads: redact after 90 days
- terminal notification-event payloads: redact after 90 days
- successful queued email HTML/text bodies: redact after 90 days

The function preserves append-only consent evidence, active preferences,
suppression records, failed/dead-letter job bodies, sanitized delivery states,
and aggregate counts. Keep failed or dead-letter records intact until an admin
has completed recovery or intentionally abandoned the job.

For scheduled execution, create the job only after at least one successful
manual dry run. Supabase projects can use `pg_cron`; keep the job body limited
to the same database function so manual and scheduled cleanup cannot drift:

```sql
select cron.schedule(
  'mailing-retention-daily',
  '17 2 * * *',
  $$select public.run_mailing_retention(false);$$
);
```

### DMARC Rollout

As of 2026-07-14, the public root-domain DMARC record resolves as:

```txt
v=DMARC1; p=none; rua=mailto:dmarc@kyrilloswannes.com
```

Treat that value as the immediate rollback record before each enforcement step.
Before changing DNS, confirm every legitimate mail source aligns SPF or DKIM
with the visible From domain. At minimum, verify Resend still marks
`updates.copticcompass.com` as verified, the DKIM selector
`resend._domainkey.updates.copticcompass.com` resolves, and no other service is
sending as `@copticcompass.com` without alignment.

Recommended staged rollout:

1. Keep `p=none` while collecting at least two normal sending cycles of DMARC
   aggregate reports.
2. Move to `p=quarantine; pct=25` after aligned traffic is confirmed.
3. Increase to full `p=quarantine` for at least two normal sending cycles.
4. Move to `p=reject` only after aggregate reports show no legitimate
   misaligned senders.

Do not combine a DMARC enforcement change with a sender-domain, From-address,
or Resend-domain reconfiguration. If legitimate traffic starts failing, restore
the rollback record above, wait for DNS propagation, and re-check provider
alignment before retrying enforcement.

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
