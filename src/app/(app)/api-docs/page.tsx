import Link from "next/link";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SwaggerDocsClient } from "@/features/grammar/components/SwaggerDocsClient";
import { getDevelopersPath, getGrammarPath } from "@/lib/locale";
import { createPageMetadata } from "@/lib/metadata";

import type { Metadata } from "next";

export const metadata: Metadata = createPageMetadata({
  title: "Coptic Compass Grammar + Shenute AI API Docs",
  description:
    "Swagger-powered API documentation for the public Coptic Compass grammar dataset plus Shenute AI chat and OCR-assisted integration guidance.",
  path: "/api-docs",
});

const docsHighlights = [
  "Read-only and versioned responses",
  "Swagger UI plus raw OpenAPI JSON",
  "Lesson filters accept slug or canonical id",
  "Rights metadata included in the dataset",
  "Shenute AI chat endpoint available at /api/chat",
  "OCR proxy endpoint available at /api/ocr",
  "Image and camera chat flow supports OCR-backed prompts",
];

const chatApiExample = `const response = await fetch("https://kyrilloswannes.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inferenceProvider: "thoth",
    messages: [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Explain this Coptic phrase." }],
      },
    ],
  }),
});

const result = await response.text();`;

const ocrIntegrationExample = `# .env.local
OCR_SERVICE_URL=https://your-ocr-service/upload
# Optional when your backend expects a specific multipart field:
OCR_UPLOAD_FIELD=file

curl -X POST "https://kyrilloswannes.com/api/ocr?lang=cop" \
  -F "file=@/path/to/coptic-image.jpg"

# Proxy flow
# 1) Client sends multipart/form-data to /api/ocr
# 2) Coptic Compass forwards to OCR_SERVICE_URL
# 3) Upstream OCR response is returned to the client`;

/**
 * Renders the Swagger-backed documentation page for the public grammar API.
 */
export default function ApiDocsPage() {
  return (
    <PageShell
      className="min-h-screen flex flex-col items-center p-6 md:p-10"
      contentClassName="w-full space-y-10 pt-10"
      width="standard"
      accents={[
        pageShellAccents.topRightSkyOrb,
        pageShellAccents.bottomLeftEmeraldOrbSoft,
      ]}
    >
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/en" },
          { label: "Developers", href: getDevelopersPath("en") },
          { label: "API Docs" },
        ]}
      />

      <PageHeader
        eyebrow="Developer Docs"
        eyebrowVariant="badge"
        title="Coptic Compass Grammar + Shenute AI Docs"
        description="Explore the public grammar dataset in Swagger and integrate Shenute AI chat with provider selection and OCR-backed image context."
        tone="sky"
        size="compact"
      />

      <section className="section-card space-y-5">
        <div className="flex flex-wrap gap-3">
          <Link href={getDevelopersPath("en")} className="btn-secondary">
            Developer Guide
          </Link>
          <Link href="/api/openapi.json" className="btn-secondary">
            OpenAPI JSON
          </Link>
          <Link href="/api/v1/grammar" className="btn-secondary">
            API Index
          </Link>
          <Link href="/api/chat" className="btn-secondary">
            Chat Endpoint
          </Link>
          <Link href="/api/ocr" className="btn-secondary">
            OCR Proxy
          </Link>
          <Link href="/chat" className="btn-secondary">
            Chat UI
          </Link>
          <Link href={getGrammarPath("en")} className="btn-secondary">
            Grammar Hub
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docsHighlights.map((highlight) => (
            <div
              key={highlight}
              className="badge-accent justify-center px-4 py-3 text-center text-sm"
            >
              {highlight}
            </div>
          ))}
        </div>

        <p className="text-sm leading-7 text-muted">
          Public consumers should usually start with{" "}
          <code>/api/v1/grammar</code> for discovery or{" "}
          <code>/api/openapi.json</code> for tooling. The public dataset only
          exposes published lessons and their related records. Shenute AI is
          available through <code>/api/chat</code>, with <code>openrouter</code>
          as the default provider when no explicit provider is supplied. OCR
          requests can be proxied through <code>/api/ocr</code> instead of
          calling the upstream OCR service directly.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="section-card space-y-4">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Shenute AI Chat API
          </h2>
          <p className="text-sm leading-7 text-muted">
            Use <code>POST /api/chat</code> with a UI-message payload. Supported
            providers are <code>openrouter</code>, <code>gemini</code>, and
            <code>hf</code>. When Hugging Face is rate-limited, the API can fall
            back to configured alternatives.
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-950 px-4 py-4 text-sm leading-6 text-stone-100 dark:border-stone-800/80">
            <code>{chatApiExample}</code>
          </pre>
        </article>

        <article className="section-card space-y-4">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            OCR Proxy API
          </h2>
          <p className="text-sm leading-7 text-muted">
            Use <code>POST /api/ocr</code> with multipart form data. Coptic
            Compass forwards the file to <code>OCR_SERVICE_URL</code>, then
            returns the upstream OCR response body and content-type to the
            client. You can pass <code>?lang=cop</code> (or another language)
            and set <code>OCR_UPLOAD_FIELD</code> when your backend expects a
            specific upload field name.
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-950 px-4 py-4 text-sm leading-6 text-stone-100 dark:border-stone-800/80">
            <code>{ocrIntegrationExample}</code>
          </pre>
        </article>
      </section>

      <section className="section-card overflow-hidden">
        <SwaggerDocsClient specUrl="/api/openapi.json" />
      </section>
    </PageShell>
  );
}
