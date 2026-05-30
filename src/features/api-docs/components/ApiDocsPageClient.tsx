"use client";

import Link from "next/link";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import { SwaggerDocsClient } from "@/features/api-docs/components/SwaggerDocsClient";
import {
  getDevelopersPath,
  getGrammarPath,
  getLocalizedHomePath,
} from "@/lib/locale";

const SHENUTE_API_EXAMPLES = {
  en: `const response = await fetch("https://www.copticcompass.com/api/shenute", {
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

const result = await response.text();`,
  nl: `const response = await fetch("https://www.copticcompass.com/api/shenute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inferenceProvider: "thoth",
    messages: [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Leg deze Koptische zin uit." }],
      },
    ],
  }),
});

const result = await response.text();`,
};

const DICTIONARY_API_EXAMPLES = {
  en: `const response = await fetch(
  "https://www.copticcompass.com/api/v1/dictionary/search?q=ⲙⲟⲓ&dialect=B&partOfSpeech=V&limit=10",
);

const page = await response.json();
const headwords = page.entries.map((entry) => entry.headword);`,
  nl: `const response = await fetch(
  "https://www.copticcompass.com/api/v1/dictionary/search?q=ⲙⲟⲓ&dialect=B&partOfSpeech=V&limit=10",
);

const page = await response.json();
const trefwoorden = page.entries.map((entry) => entry.headword);`,
};

const OCR_INTEGRATION_EXAMPLES = {
  en: `# .env.local
OCR_SERVICE_URL=https://your-ocr-service/upload
# Optional when your backend expects a specific multipart field:
OCR_UPLOAD_FIELD=file

curl -X POST "https://www.copticcompass.com/api/ocr?lang=cop" \\
  -F "file=@/path/to/coptic-image.jpg"

# Proxy flow
# 1) Client sends multipart/form-data to /api/ocr
# 2) Coptic Compass forwards to OCR_SERVICE_URL
# 3) Upstream OCR response is returned to the client`,
  nl: `# .env.local
OCR_SERVICE_URL=https://your-ocr-service/upload
# Optioneel wanneer uw backend een specifieke multipart-veldnaam verwacht:
OCR_UPLOAD_FIELD=file

curl -X POST "https://www.copticcompass.com/api/ocr?lang=cop" \\
  -F "file=@/path/to/coptic-image.jpg"

# Proxyflow
# 1) Client stuurt multipart/form-data naar /api/ocr
# 2) Coptic Compass stuurt door naar OCR_SERVICE_URL
# 3) De upstream OCR-response wordt teruggegeven aan de client`,
};

const BODY_TEXT_CLASS = "text-sm leading-7 text-muted";
const API_HIGHLIGHT_CLASS =
  "rounded-lg border border-line/80 bg-elevated/65 px-4 py-3 text-center text-sm font-medium leading-6 text-ink";
const API_CARD_TITLE_CLASS = "text-xl font-semibold text-ink";
const CODE_BLOCK_CLASS =
  "overflow-x-auto rounded-lg border border-line/70 bg-ink px-4 py-4 text-sm leading-6 text-paper dark:bg-black/60";

function ApiDocsOverview() {
  const { t } = useLanguage();
  return (
    <p className={BODY_TEXT_CLASS}>
      {t("apiDocs.overviewStart")} <code>/api/openapi.json</code>{" "}
      {t("apiDocs.overviewOpenApi")} <code>/api/v1/grammar</code>,{" "}
      {t("apiDocs.overviewDictionary")} <code>/api/v1/dictionary/search</code>,{" "}
      {t("apiDocs.overviewShenute")} <code>/api/shenute</code>,{" "}
      {t("apiDocs.overviewEnd")} <code>/api/ocr</code>.
    </p>
  );
}

function DictionaryApiDescription() {
  const { t } = useLanguage();
  return (
    <p className={BODY_TEXT_CLASS}>
      {t("apiDocs.dictionaryDescriptionStart")}{" "}
      <code>GET /api/v1/dictionary/search</code>{" "}
      {t("apiDocs.dictionaryDescriptionFilters")} <code>q</code>,{" "}
      <code>dialect</code>, <code>partOfSpeech</code>, <code>exact</code>,{" "}
      <code>limit</code>, {t("apiDocs.shenuteDescriptionJoin")}{" "}
      <code>offset</code>. {t("apiDocs.dictionaryDescriptionIndex")}{" "}
      <code>/api/v1/dictionary/search-index</code>.
    </p>
  );
}

function ShenuteApiDescription() {
  const { t } = useLanguage();
  return (
    <p className={BODY_TEXT_CLASS}>
      {t("apiDocs.shenuteDescriptionStart")} <code>POST /api/shenute</code>{" "}
      {t("apiDocs.shenuteDescriptionWith")}{" "}
      {t("apiDocs.shenuteDescriptionProviders")} <code>thoth</code>,{" "}
      <code>openrouter</code>, <code>gemini</code>,{" "}
      {t("apiDocs.shenuteDescriptionJoin")} <code>hf</code>.{" "}
      {t("apiDocs.shenuteDescriptionFallback")}
    </p>
  );
}

function OcrApiDescription() {
  const { t } = useLanguage();
  return (
    <p className={BODY_TEXT_CLASS}>
      {t("apiDocs.shenuteDescriptionStart")} <code>POST /api/ocr</code>{" "}
      {t("apiDocs.ocrDescriptionForward")} <code>OCR_SERVICE_URL</code>,{" "}
      {t("apiDocs.ocrDescriptionReturn")} <code>?lang=cop</code>{" "}
      {t("apiDocs.ocrDescriptionAfterLang")} <code>OCR_UPLOAD_FIELD</code>{" "}
      {t("apiDocs.ocrDescriptionEnd")}
    </p>
  );
}

export function ApiDocsPageClient() {
  const { t, language } = useLanguage();

  const highlights = [
    t("apiDocs.highlight.0"),
    t("apiDocs.highlight.1"),
    t("apiDocs.highlight.2"),
    t("apiDocs.highlight.3"),
    t("apiDocs.highlight.4"),
    t("apiDocs.highlight.5"),
    t("apiDocs.highlight.6"),
  ];

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <AppPageIntro
        align="center"
        breadcrumbs={[
          {
            label: t("nav.home"),
            href: getLocalizedHomePath(language),
          },
          {
            label: t("nav.developers"),
            href: getDevelopersPath(language),
          },
          { label: t("apiDocs.breadcrumbLabel") },
        ]}
        title={t("apiDocs.title")}
        description={t("apiDocs.description")}
        tone="brand"
      />

      <div className="space-y-8 md:space-y-9">
        <SurfacePanel
          as="section"
          rounded="lg"
          variant="elevated"
          className="space-y-5 p-6 md:p-8"
        >
          <div className="flex flex-wrap gap-3">
            <Link
              href={getDevelopersPath(language)}
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.developerGuideLabel")}
            </Link>
            <Link
              href="/api/openapi.json"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.openApiLabel")}
            </Link>
            <Link
              href="/api/v1/grammar"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.apiIndexLabel")}
            </Link>
            <Link
              href="/api/v1/dictionary/search"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.dictionarySearchLabel")}
            </Link>
            <Link
              href="/api/shenute"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.shenuteEndpointLabel")}
            </Link>
            <Link
              href="/api/ocr"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.ocrProxyLabel")}
            </Link>
            <Link
              href="/shenute"
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.shenuteUiLabel")}
            </Link>
            <Link
              href={getGrammarPath(language)}
              className={buttonClassName({ variant: "secondary" })}
            >
              {t("apiDocs.grammarHubLabel")}
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {highlights.map((highlight) => (
              <div key={highlight} className={API_HIGHLIGHT_CLASS}>
                {highlight}
              </div>
            ))}
          </div>

          <ApiDocsOverview />
        </SurfacePanel>

        <section className="grid gap-6 xl:grid-cols-3">
          <SurfacePanel
            as="article"
            rounded="lg"
            variant="elevated"
            className="space-y-4 p-6 md:p-8"
          >
            <h2 className={API_CARD_TITLE_CLASS}>
              {t("apiDocs.dictionaryTitle")}
            </h2>
            <DictionaryApiDescription />
            <pre className={CODE_BLOCK_CLASS}>
              <code>{DICTIONARY_API_EXAMPLES[language]}</code>
            </pre>
          </SurfacePanel>

          <SurfacePanel
            as="article"
            rounded="lg"
            variant="elevated"
            className="space-y-4 p-6 md:p-8"
          >
            <h2 className={API_CARD_TITLE_CLASS}>
              {t("apiDocs.shenuteTitle")}
            </h2>
            <ShenuteApiDescription />
            <pre className={CODE_BLOCK_CLASS}>
              <code>{SHENUTE_API_EXAMPLES[language]}</code>
            </pre>
          </SurfacePanel>

          <SurfacePanel
            as="article"
            rounded="lg"
            variant="elevated"
            className="space-y-4 p-6 md:p-8"
          >
            <h2 className={API_CARD_TITLE_CLASS}>{t("apiDocs.ocrTitle")}</h2>
            <OcrApiDescription />
            <pre className={CODE_BLOCK_CLASS}>
              <code>{OCR_INTEGRATION_EXAMPLES[language]}</code>
            </pre>
          </SurfacePanel>
        </section>

        <SurfacePanel
          as="section"
          rounded="lg"
          variant="elevated"
          className="overflow-hidden p-2 md:p-4"
        >
          <SwaggerDocsClient specUrl="/api/openapi.json" />
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
