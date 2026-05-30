"use client";

import Link from "next/link";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getGrammarPath, getLocalizedHomePath } from "@/lib/locale";

const code = `const response = await fetch(
  "https://www.copticcompass.com/api/v1/grammar/lessons",
);

const payload = await response.json();
const lessonTitles = payload.data.map((lesson) => lesson.title.en);`;

const dictionaryCode = `const response = await fetch(
  "https://www.copticcompass.com/api/v1/dictionary/search?q=ⲙⲟⲓ&dialect=B&limit=10",
);

const page = await response.json();
const firstEntry = page.entries[0];`;

const shenuteCode = `const response = await fetch("https://www.copticcompass.com/api/shenute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inferenceProvider: "thoth",
    messages: [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Translate this Coptic sentence." }],
      },
    ],
  }),
});

const streamOrText = await response.text();`;

const ocrCode = `# .env.local
OCR_SERVICE_URL=https://your-ocr-service/upload
# Optional for strict OCR backends:
OCR_UPLOAD_FIELD=file

curl -X POST "https://www.copticcompass.com/api/ocr?lang=cop" \\
  -F "file=@/path/to/coptic-image.jpg"

# Proxy OCR flow
# 1) client POSTs to /api/ocr
# 2) server forwards to OCR_SERVICE_URL
# 3) upstream OCR response is returned to the client`;

const SECTION_EYEBROW_CLASS =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted";
const BODY_TEXT_CLASS = "text-sm leading-7 text-muted";
const LIST_ITEM_CLASS =
  "rounded-lg border border-line/80 bg-elevated/65 px-4 py-3";
const LINK_CARD_CLASS =
  "rounded-lg border border-line/80 bg-elevated/65 px-5 py-4 transition-colors hover:border-accent/35 hover:bg-accent-soft/45";
const RESOURCE_CARD_CLASS =
  "block rounded-lg border border-line/80 bg-elevated/65 px-4 py-4 transition-colors hover:border-accent/35 hover:bg-accent-soft/45";
const CODE_BLOCK_CLASS =
  "mt-5 overflow-x-auto rounded-lg border border-line/70 bg-ink px-4 py-4 text-sm leading-6 text-paper dark:bg-black/60";

export function DevelopersPageClient() {
  const { t, language } = useLanguage();

  const endpoints = [
    {
      href: "/api/v1/grammar",
      label: "/api/v1/grammar",
      description: t("developers.endpoints.grammar.desc"),
    },
    {
      href: "/api/v1/grammar/lessons?status=published",
      label: "/api/v1/grammar/lessons?status=published",
      description: t("developers.endpoints.lessons.desc"),
    },
    {
      href: "/api/v1/grammar/manifest",
      label: "/api/v1/grammar/manifest",
      description: t("developers.endpoints.manifest.desc"),
    },
    {
      href: "/api/openapi.json",
      label: "/api/openapi.json",
      description: t("developers.endpoints.openapi.desc"),
    },
    {
      href: "/api/v1/dictionary/search?q=ⲙⲟⲓ&dialect=B",
      label: "/api/v1/dictionary/search",
      description: t("developers.endpoints.dictionarySearch.desc"),
    },
    {
      href: "/api/v1/dictionary/search-index",
      label: "/api/v1/dictionary/search-index",
      description: t("developers.endpoints.dictionaryIndex.desc"),
    },
    {
      href: "/api/shenute",
      label: "/api/shenute",
      description: t("developers.endpoints.shenute.desc"),
    },
    {
      href: "/api/ocr",
      label: "/api/ocr",
      description: t("developers.endpoints.ocr.desc"),
    },
  ];

  const resources = [
    {
      href: "/api-docs",
      label: t("developers.resources.swagger.label"),
      description: t("developers.resources.swagger.desc"),
    },
    {
      href: "/api/openapi.json",
      label: t("developers.resources.openapi.label"),
      description: t("developers.resources.openapi.desc"),
    },
    {
      href: "/api/v1/grammar",
      label: t("developers.resources.apiIndex.label"),
      description: t("developers.resources.apiIndex.desc"),
    },
    {
      href: "/api/v1/dictionary/search?q=ⲙⲟⲓ",
      label: t("developers.resources.dictionary.label"),
      description: t("developers.resources.dictionary.desc"),
    },
    {
      href: getGrammarPath(language),
      label: t("developers.resources.grammarHub.label"),
      description: t("developers.resources.grammarHub.desc"),
    },
    {
      href: "/shenute",
      label: t("developers.resources.shenute.label"),
      description: t("developers.resources.shenute.desc"),
    },
    {
      href: "/api/ocr",
      label: t("developers.resources.ocr.label"),
      description: t("developers.resources.ocr.desc"),
    },
  ];

  const workflowItems = [
    t("developers.workflow.0"),
    t("developers.workflow.1"),
    t("developers.workflow.2"),
    t("developers.workflow.3"),
    t("developers.workflow.4"),
    t("developers.workflow.5"),
    t("developers.workflow.6"),
  ];

  const integrationItems = [
    t("developers.integration.0"),
    t("developers.integration.1"),
    t("developers.integration.2"),
    t("developers.integration.3"),
    t("developers.integration.4"),
    t("developers.integration.5"),
    t("developers.integration.6"),
    t("developers.integration.7"),
    t("developers.integration.8"),
    t("developers.integration.9"),
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
          { label: t("developers.breadcrumbLabel") },
        ]}
        title={t("developers.heroTitle")}
        description={t("developers.heroDescription")}
        tone="brand"
      />

      <div className="space-y-8 md:space-y-9">
        <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong dark:text-accent">
              {t("developers.discoveryTitle")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              {t("developers.discoveryDescription")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/api-docs"
                className={buttonClassName({ variant: "secondary" })}
              >
                {t("developers.primaryCta")}
              </Link>
              <Link
                href="/api/openapi.json"
                className={buttonClassName({ variant: "secondary" })}
              >
                {t("developers.secondaryCta")}
              </Link>
              <Link
                href="/api/v1/grammar"
                className={buttonClassName({ variant: "secondary" })}
              >
                /api/v1/grammar
              </Link>
              <Link
                href="/api/v1/dictionary/search"
                className={buttonClassName({ variant: "secondary" })}
              >
                /api/v1/dictionary/search
              </Link>
            </div>
          </SurfacePanel>

          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.workflowTitle")}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              {workflowItems.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </SurfacePanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={SECTION_EYEBROW_CLASS}>
                  {t("developers.endpointsTitle")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  {t("developers.title")}
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {endpoints.map((endpoint) => (
                <Link
                  key={endpoint.href}
                  href={endpoint.href}
                  className={LINK_CARD_CLASS}
                >
                  <p className="font-mono text-sm text-accent-strong dark:text-accent">
                    {endpoint.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {endpoint.description}
                  </p>
                </Link>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.integrationTitle")}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              {integrationItems.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </SurfacePanel>
        </section>

        <section className="grid gap-6">
          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.exampleTitle")}
            </p>
            <p className={`mt-3 ${BODY_TEXT_CLASS}`}>
              {t("developers.exampleCaption")}
            </p>
            <pre className={CODE_BLOCK_CLASS}>
              <code>{code}</code>
            </pre>
          </SurfacePanel>

          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.dictionaryExampleTitle")}
            </p>
            <p className={`mt-3 ${BODY_TEXT_CLASS}`}>
              {t("developers.dictionaryExampleCaption")}
            </p>
            <pre className={CODE_BLOCK_CLASS}>
              <code>{dictionaryCode}</code>
            </pre>
          </SurfacePanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.resourcesTitle")}
            </p>
            <div className="mt-4 space-y-3">
              {resources.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className={RESOURCE_CARD_CLASS}
                >
                  <p className="font-medium text-ink">{resource.label}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {resource.description}
                  </p>
                </Link>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.shenuteExampleTitle")}
            </p>
            <p className={`mt-3 ${BODY_TEXT_CLASS}`}>
              {t("developers.shenuteExampleCaption")}
            </p>
            <pre className={CODE_BLOCK_CLASS}>
              <code>{shenuteCode}</code>
            </pre>
          </SurfacePanel>

          <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
            <p className={SECTION_EYEBROW_CLASS}>
              {t("developers.ocrExampleTitle")}
            </p>
            <p className={`mt-3 ${BODY_TEXT_CLASS}`}>
              {t("developers.ocrExampleCaption")}
            </p>
            <pre className={CODE_BLOCK_CLASS}>
              <code>{ocrCode}</code>
            </pre>
          </SurfacePanel>
        </section>
      </div>
    </PageShell>
  );
}
