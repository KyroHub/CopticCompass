import Link from "next/link";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import StructuredData from "@/components/StructuredData";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getTranslation } from "@/lib/i18n";
import {
  getDevelopersPath,
  getGrammarPath,
  getLocalizedHomePath,
} from "@/lib/locale";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { createBreadcrumbStructuredData } from "@/lib/structuredData";

import type { Metadata } from "next";

const developerCopy = {
  en: {
    title: "Developers",
    seoTitle: "Coptic Compass Grammar + Shenute AI APIs for Developers",
    description:
      "Explore the public Coptic Compass grammar API plus Shenute AI chat and OCR-backed image integration patterns for developer workflows.",
    eyebrow: "Developer Platform",
    heroTitle: "Build on grammar and Shenute AI APIs",
    heroDescription:
      "The grammar API exposes a read-only, versioned dataset for lessons, concepts, examples, exercises, footnotes, and sources, while /api/chat powers Shenute AI interactions with provider selection and OCR-backed image context.",
    primaryCta: "Open API Docs",
    secondaryCta: "View OpenAPI JSON",
    discoveryTitle: "Start here",
    discoveryDescription:
      "Most integrations should begin with the API index, which documents the available resource families and the current dataset version.",
    workflowTitle: "Typical workflow",
    workflowItems: [
      "Call /api/v1/grammar to discover the current endpoints and dataset version.",
      "Fetch /api/v1/grammar/lessons for the published lesson index.",
      "Load /api/v1/grammar/lessons/[slug] for full lesson payloads.",
      "Use /api/openapi.json when generating clients or importing the schema into tooling.",
      "Send POST /api/chat requests for Shenute AI responses (default provider: openrouter).",
      "Send image OCR requests to POST /api/ocr so Coptic Compass forwards them to OCR_SERVICE_URL.",
    ],
    integrationTitle: "Integration notes",
    integrationItems: [
      "Responses are read-only and versioned with schemaVersion, datasetVersion, and generatedAt metadata.",
      "The public dataset only exposes published lessons and their related concepts, examples, exercises, footnotes, and sources.",
      "The lesson filter accepts either a lesson slug or a canonical lesson id.",
      "For browser apps on another origin, a backend proxy is the safest default.",
      "Shenute AI supports provider values: openrouter, gemini, and hf.",
      "Image upload and camera capture flows run OCR first and append extracted text under [Image OCR Context] before calling /api/chat.",
      "Set OCR_SERVICE_URL and optionally OCR_UPLOAD_FIELD when your OCR backend requires a specific multipart field name.",
      "The /api/ocr endpoint proxies multipart OCR uploads and returns upstream OCR responses to the client.",
    ],
    endpointsTitle: "High-value endpoints",
    endpoints: [
      {
        href: "/api/v1/grammar",
        label: "/api/v1/grammar",
        description: "Discovery index for the public grammar API.",
      },
      {
        href: "/api/v1/grammar/lessons?status=published",
        label: "/api/v1/grammar/lessons?status=published",
        description: "Published lesson index for public integrations.",
      },
      {
        href: "/api/v1/grammar/manifest",
        label: "/api/v1/grammar/manifest",
        description: "Manifest with dataset-level metadata and counts.",
      },
      {
        href: "/api/openapi.json",
        label: "/api/openapi.json",
        description: "Machine-readable OpenAPI document.",
      },
      {
        href: "/api/chat",
        label: "/api/chat",
        description: "Shenute AI chat endpoint with provider routing and fallback handling.",
      },
      {
        href: "/api/ocr",
        label: "/api/ocr",
        description: "OCR proxy endpoint that forwards image uploads to OCR_SERVICE_URL.",
      },
    ],
    exampleTitle: "Example request",
    exampleCaption:
      "A minimal server-side fetch that lists published lesson titles.",
    resourcesTitle: "Related resources",
    resources: [
      {
        href: "/api-docs",
        label: "Swagger UI",
        description: "Interactive reference for exploring every endpoint.",
      },
      {
        href: "/api/openapi.json",
        label: "OpenAPI JSON",
        description:
          "Import into Postman, SDK generators, or internal tooling.",
      },
      {
        href: "/api/v1/grammar",
        label: "API index",
        description: "Read the current API capabilities and example routes.",
      },
      {
        href: getGrammarPath("en"),
        label: "Grammar hub",
        description: "See the public content the API is exposing.",
      },
      {
        href: "/chat",
        label: "Shenute AI Chat",
        description: "Reference UI for provider selection plus OCR-backed image and camera messaging.",
      },
      {
        href: "/api/ocr",
        label: "OCR proxy endpoint",
        description: "Send multipart OCR requests without exposing your upstream OCR service URL.",
      },
    ],
    breadcrumbLabel: "Developers",
    code: `const response = await fetch(
  "https://kyrilloswannes.com/api/v1/grammar/lessons",
);

const payload = await response.json();
const lessonTitles = payload.data.map((lesson) => lesson.title.en);`,
    chatExampleTitle: "Shenute AI request example",
    chatExampleCaption:
      "A minimal POST request to /api/chat using OpenRouter as provider.",
    chatCode: `const response = await fetch("https://kyrilloswannes.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inferenceProvider: "openrouter",
    messages: [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Translate this Coptic sentence." }],
      },
    ],
  }),
});

const streamOrText = await response.text();`,
    ocrExampleTitle: "OCR integration notes",
    ocrExampleCaption:
      "Clients can call /api/ocr, and Coptic Compass forwards to OCR_SERVICE_URL then returns the upstream OCR response.",
    ocrCode: `# .env.local
OCR_SERVICE_URL=https://your-ocr-service/upload
# Optional for strict OCR backends:
OCR_UPLOAD_FIELD=file

curl -X POST "https://kyrilloswannes.com/api/ocr?lang=cop" \
  -F "file=@/path/to/coptic-image.jpg"

# Proxy OCR flow
# 1) client POSTs to /api/ocr
# 2) server forwards to OCR_SERVICE_URL
# 3) upstream OCR response is returned to the client`,
  },
  nl: {
    title: "Ontwikkelaars",
    seoTitle: "Koptisch Kompas grammatica- en Shenute AI-API's voor ontwikkelaars",
    description:
      "Verken de publieke grammatica-API van Koptisch Kompas plus Shenute AI-chat en OCR-ondersteunde afbeeldingsintegratie voor ontwikkelaars.",
    eyebrow: "Developerplatform",
    heroTitle: "Bouw voort op grammatica- en Shenute AI-API's",
    heroDescription:
      "De grammatica-API biedt een alleen-lezen, geversioneerde dataset voor lessen, begrippen, voorbeelden, oefeningen, voetnoten en bronnen, terwijl /api/chat Shenute AI-interacties levert met providerkeuze en OCR-context voor afbeeldingen.",
    primaryCta: "Open API-docs",
    secondaryCta: "Bekijk OpenAPI JSON",
    discoveryTitle: "Begin hier",
    discoveryDescription:
      "De meeste integraties starten best bij de API-index, waar de beschikbare resourcefamilies en de huidige datasetversie worden uitgelegd.",
    workflowTitle: "Typische workflow",
    workflowItems: [
      "Roep /api/v1/grammar aan om de huidige endpoints en datasetversie te ontdekken.",
      "Gebruik /api/v1/grammar/lessons voor de index van gepubliceerde lessen.",
      "Laad /api/v1/grammar/lessons/[slug] voor volledige lespayloads.",
      "Gebruik /api/openapi.json om clients te genereren of het schema in tooling te importeren.",
      "Verstuur POST /api/chat-requests voor Shenute AI-antwoorden (standaardprovider: openrouter).",
      "Stuur OCR-afbeeldingsrequests naar POST /api/ocr zodat Coptic Compass ze doorstuurt naar OCR_SERVICE_URL.",
    ],
    integrationTitle: "Integratienotities",
    integrationItems: [
      "Responses zijn alleen-lezen en bevatten schemaVersion, datasetVersion en generatedAt.",
      "De publieke dataset bevat alleen gepubliceerde lessen en de bijbehorende begrippen, voorbeelden, oefeningen, voetnoten en bronnen.",
      "De lesson-filter accepteert zowel een slug als een canonieke les-id.",
      "Voor browser-apps op een andere origin is een backendproxy de veiligste standaardoptie.",
      "Shenute AI ondersteunt providers: openrouter, gemini en hf.",
      "Bij upload van afbeeldingen of cameracaptures draait OCR eerst; de geëxtraheerde tekst wordt toegevoegd onder [Image OCR Context] vóór de call naar /api/chat.",
      "Stel OCR_SERVICE_URL in en optioneel OCR_UPLOAD_FIELD als je OCR-backend een vaste multipart veldnaam vereist.",
      "Het endpoint /api/ocr proxyt multipart OCR-uploads en geeft het upstream OCR-resultaat terug aan de client.",
    ],
    endpointsTitle: "Belangrijke endpoints",
    endpoints: [
      {
        href: "/api/v1/grammar",
        label: "/api/v1/grammar",
        description: "Ontdekkingsindex voor de publieke grammatica-API.",
      },
      {
        href: "/api/v1/grammar/lessons?status=published",
        label: "/api/v1/grammar/lessons?status=published",
        description:
          "Index van gepubliceerde lessen voor publieke integraties.",
      },
      {
        href: "/api/v1/grammar/manifest",
        label: "/api/v1/grammar/manifest",
        description: "Manifest met datasetmetadata en aantallen.",
      },
      {
        href: "/api/openapi.json",
        label: "/api/openapi.json",
        description: "Machineleesbaar OpenAPI-document.",
      },
      {
        href: "/api/chat",
        label: "/api/chat",
        description: "Shenute AI-chatendpoint met provider-routering en fallback-afhandeling.",
      },
      {
        href: "/api/ocr",
        label: "/api/ocr",
        description: "OCR-proxyendpoint dat afbeelding-uploads doorstuurt naar OCR_SERVICE_URL.",
      },
    ],
    exampleTitle: "Voorbeeldrequest",
    exampleCaption:
      "Een minimale server-side fetch die de titels van gepubliceerde lessen ophaalt.",
    resourcesTitle: "Verwante bronnen",
    resources: [
      {
        href: "/api-docs",
        label: "Swagger UI",
        description: "Interactieve referentie om alle endpoints te verkennen.",
      },
      {
        href: "/api/openapi.json",
        label: "OpenAPI JSON",
        description: "Importeer in Postman, SDK-generators of interne tooling.",
      },
      {
        href: "/api/v1/grammar",
        label: "API-index",
        description: "Lees de huidige mogelijkheden en voorbeeldroutes.",
      },
      {
        href: getGrammarPath("nl"),
        label: "Grammatica-overzicht",
        description: "Bekijk de publieke inhoud die de API ontsluit.",
      },
      {
        href: "/chat",
        label: "Shenute AI-chat",
        description: "Referentie-UI met providerkeuze en OCR-ondersteunde beeld- en cameraberichten.",
      },
      {
        href: "/api/ocr",
        label: "OCR-proxyendpoint",
        description: "Verstuur multipart OCR-requests zonder je upstream OCR-service-URL te publiceren.",
      },
    ],
    breadcrumbLabel: "Ontwikkelaars",
    code: `const response = await fetch(
  "https://kyrilloswannes.com/api/v1/grammar/lessons",
);

const payload = await response.json();
const lessonTitles = payload.data.map((lesson) => lesson.title.en);`,
    chatExampleTitle: "Voorbeeld Shenute AI-request",
    chatExampleCaption:
      "Een minimale POST-request naar /api/chat met OpenRouter als provider.",
    chatCode: `const response = await fetch("https://kyrilloswannes.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inferenceProvider: "openrouter",
    messages: [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Vertaal deze Koptische zin." }],
      },
    ],
  }),
});

const streamOfText = await response.text();`,
    ocrExampleTitle: "OCR-integratienotities",
    ocrExampleCaption:
      "Clients kunnen /api/ocr aanroepen; Coptic Compass stuurt door naar OCR_SERVICE_URL en geeft de upstream OCR-response terug.",
    ocrCode: `# .env.local
OCR_SERVICE_URL=https://jouw-ocr-service/upload
# Optioneel voor strikte OCR-backends:
OCR_UPLOAD_FIELD=file

curl -X POST "https://kyrilloswannes.com/api/ocr?lang=cop" \
  -F "file=@/pad/naar/koptische-afbeelding.jpg"

# OCR-proxyflow
# 1) client POST naar /api/ocr
# 2) server stuurt door naar OCR_SERVICE_URL
# 3) upstream OCR-response terug naar client`,
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const copy = developerCopy[resolvedLocale];

  return createLocalizedPageMetadata({
    title: copy.seoTitle,
    description: copy.description,
    path: "/developers",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized developer guide for the public grammar API surface.
 */
export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const copy = developerCopy[resolvedLocale];

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
      <StructuredData
        data={createBreadcrumbStructuredData([
          {
            name: getTranslation(resolvedLocale, "nav.home"),
            path: getLocalizedHomePath(resolvedLocale),
          },
          {
            name: copy.breadcrumbLabel,
            path: getDevelopersPath(resolvedLocale),
          },
        ])}
      />

      <BreadcrumbTrail
        items={[
          {
            label: getTranslation(resolvedLocale, "nav.home"),
            href: getLocalizedHomePath(resolvedLocale),
          },
          { label: copy.breadcrumbLabel },
        ]}
      />

      <PageHeader
        eyebrow={copy.eyebrow}
        eyebrowVariant="badge"
        title={copy.heroTitle}
        description={copy.heroDescription}
        tone="sky"
        size="compact"
      />

      <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            {copy.discoveryTitle}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.discoveryDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/api-docs" className="btn-secondary">
              {copy.primaryCta}
            </Link>
            <Link href="/api/openapi.json" className="btn-secondary">
              {copy.secondaryCta}
            </Link>
            <Link href="/api/v1/grammar" className="btn-secondary">
              /api/v1/grammar
            </Link>
          </div>
        </SurfacePanel>

        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.workflowTitle}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.workflowItems.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-800/80 dark:bg-stone-950/50"
              >
                {item}
              </li>
            ))}
          </ul>
        </SurfacePanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                {copy.endpointsTitle}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                {copy.title}
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {copy.endpoints.map((endpoint) => (
              <Link
                key={endpoint.href}
                href={endpoint.href}
                className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-5 py-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70 dark:border-stone-800/80 dark:bg-stone-950/50 dark:hover:border-sky-900/70 dark:hover:bg-sky-950/20"
              >
                <p className="font-mono text-sm text-sky-700 dark:text-sky-300">
                  {endpoint.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-300">
                  {endpoint.description}
                </p>
              </Link>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.integrationTitle}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.integrationItems.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-800/80 dark:bg-stone-950/50"
              >
                {item}
              </li>
            ))}
          </ul>
        </SurfacePanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.exampleTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.exampleCaption}
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-950 px-4 py-4 text-sm leading-6 text-stone-100 dark:border-stone-800/80">
            <code>{copy.code}</code>
          </pre>
        </SurfacePanel>

        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.resourcesTitle}
          </p>
          <div className="mt-4 space-y-3">
            {copy.resources.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="block rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70 dark:border-stone-800/80 dark:bg-stone-950/50 dark:hover:border-sky-900/70 dark:hover:bg-sky-950/20"
              >
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {resource.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-300">
                  {resource.description}
                </p>
              </Link>
            ))}
          </div>
        </SurfacePanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.chatExampleTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.chatExampleCaption}
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-950 px-4 py-4 text-sm leading-6 text-stone-100 dark:border-stone-800/80">
            <code>{copy.chatCode}</code>
          </pre>
        </SurfacePanel>

        <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {copy.ocrExampleTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {copy.ocrExampleCaption}
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-950 px-4 py-4 text-sm leading-6 text-stone-100 dark:border-stone-800/80">
            <code>{copy.ocrCode}</code>
          </pre>
        </SurfacePanel>
      </section>
    </PageShell>
  );
}
