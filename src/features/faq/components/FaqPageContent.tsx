import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  FAQ_BREADCRUMB_LABEL,
  getFaqPageCopy,
  type FaqAnswerBlock,
  type FaqTextRun,
} from "@/features/faq/lib/faq";
import { cx } from "@/lib/classes";
import { getTranslation } from "@/lib/i18n";
import {
  getContactPath,
  getEntryPath,
  getLocalizedHomePath,
} from "@/lib/locale";
import type { Language } from "@/types/i18n";

type FaqPageContentProps = {
  locale: Language;
};

function renderFaqRunContent(run: FaqTextRun, isLinked = false) {
  let content: ReactNode = run.text;

  if (run.coptic) {
    content = (
      <span className={cx("font-coptic", !isLinked && "text-ink")}>
        {content}
      </span>
    );
  }

  if (run.emphasis) {
    content = <em>{content}</em>;
  }

  if (run.strong) {
    content = (
      <strong className={cx("font-semibold", !isLinked && "text-ink")}>
        {content}
      </strong>
    );
  }

  return content;
}

function renderFaqRun(run: FaqTextRun, key: string, locale: Language) {
  if (run.entryId) {
    return (
      <Link
        key={key}
        href={getEntryPath(run.entryId, locale)}
        prefetch={false}
        className="rounded-sm text-accent-strong underline decoration-accent/45 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {renderFaqRunContent(run, true)}
      </Link>
    );
  }

  const content = renderFaqRunContent(run);

  return <Fragment key={key}>{content}</Fragment>;
}

function renderFaqBlock(
  block: FaqAnswerBlock,
  index: number,
  locale: Language,
) {
  const content = block.runs.map((run, runIndex) =>
    renderFaqRun(run, `${index}-${runIndex}-${run.text}`, locale),
  );

  if (block.type === "quote") {
    return (
      <blockquote
        key={index}
        className="rounded-lg border-l-4 border-accent/70 bg-elevated px-4 py-3 font-medium leading-7 text-ink dark:bg-elevated/60"
      >
        {content}
      </blockquote>
    );
  }

  return <p key={index}>{content}</p>;
}

export function FaqPageContent({ locale }: FaqPageContentProps) {
  const copy = getFaqPageCopy(locale);
  const supportCopy =
    locale === "nl"
      ? {
          cta: "Contact",
          description:
            "Stuur een bericht als u een vraag mist of extra context bij een antwoord nodig heeft.",
          eyebrow: "Ondersteuning",
          title: "Heeft u nog een vraag?",
        }
      : {
          cta: "Contact",
          description:
            "Send a note if a question is missing or if an answer needs more context.",
          eyebrow: "Support",
          title: "Still have a question?",
        };

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
        align="left"
        breadcrumbs={[
          {
            label: getTranslation(locale, "nav.home"),
            href: getLocalizedHomePath(locale),
          },
          { label: FAQ_BREADCRUMB_LABEL },
        ]}
        spacing="compact"
        title={copy.title}
        tone="brand"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(17rem,1fr)] lg:items-start">
        <SurfacePanel
          as="section"
          rounded="lg"
          variant="default"
          className="divide-y divide-line overflow-hidden shadow-sm"
        >
          {copy.items.map((item) => (
            <details
              id={item.id}
              key={item.id}
              className="group scroll-mt-32 transition-colors open:bg-elevated/45"
            >
              <summary className="cursor-pointer px-5 py-4 text-base font-semibold leading-7 text-ink marker:text-accent-strong transition-colors hover:bg-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30 md:px-6 md:py-5 md:text-lg">
                {item.question}
              </summary>
              <div className="space-y-4 px-5 pb-5 text-sm leading-7 text-muted md:px-6 md:pb-6 md:text-base md:leading-8">
                {item.answer.map((block, index) =>
                  renderFaqBlock(block, index, locale),
                )}
              </div>
            </details>
          ))}
        </SurfacePanel>

        <aside className="hidden lg:sticky lg:top-28 lg:block">
          <SurfacePanel
            as="section"
            rounded="lg"
            variant="subtle"
            className="p-5 md:p-6"
            aria-labelledby="faq-support-heading"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-coptic/20 bg-coptic-soft/45 text-coptic dark:bg-coptic-soft/20">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {supportCopy.eyebrow}
            </p>
            <h2
              id="faq-support-heading"
              className="mt-3 text-lg font-semibold leading-7 text-ink"
            >
              {supportCopy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              {supportCopy.description}
            </p>
            <Link
              href={getContactPath(locale)}
              className={buttonClassName({
                className: "mt-5 w-full",
                variant: "secondary",
              })}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {supportCopy.cta}
            </Link>
          </SurfacePanel>
        </aside>
      </div>
    </PageShell>
  );
}
