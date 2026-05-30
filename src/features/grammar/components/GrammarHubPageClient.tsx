"use client";

import { Layers3 } from "lucide-react";
import Link from "next/link";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import type { GrammarLessonIndexItem } from "@/content/grammar/schema";
import { DEFAULT_GRAMMAR_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import { getPracticePath, getLocalizedHomePath } from "@/lib/locale";

import { GrammarLessonCard } from "./GrammarLessonCard";

type GrammarHubPageClientProps = {
  lessons: GrammarLessonIndexItem[];
};

export default function GrammarHubPageClient({
  lessons,
}: GrammarHubPageClientProps) {
  const { language, t } = useLanguage();

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroCopticBand,
        pageShellAccents.topRightGoldWashInset,
        pageShellAccents.bottomLeftCopticWashSoft,
      ]}
    >
      <AppPageIntro
        spacing="compact"
        actionsClassName="w-full sm:w-auto"
        actions={
          <Link
            href={getPracticePath(language, DEFAULT_GRAMMAR_PRACTICE_DECK_ID)}
            className={buttonClassName({
              className: "w-full sm:w-auto",
              variant: "primary",
            })}
          >
            <Layers3 className="h-4 w-4" />
            {t("grammar.practiceGrammar")}
          </Link>
        }
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.grammar") },
        ]}
        title={t("grammar.title")}
      />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <GrammarLessonCard
            key={lesson.slug}
            lesson={lesson}
            language={language}
            t={t}
          />
        ))}
      </div>
    </PageShell>
  );
}
