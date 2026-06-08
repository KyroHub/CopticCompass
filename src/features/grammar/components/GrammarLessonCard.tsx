"use client";

import { ArrowRight, BookOpenText, Clock3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import type { GrammarLessonIndexItem } from "@/content/grammar/schema";
import { getGrammarLessonPath } from "@/features/grammar/lib/grammarPaths";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

type GrammarLessonCardProps = {
  lesson: GrammarLessonIndexItem;
  language: Language;
  t: (
    key:
      | "grammar.lessonBadge"
      | "home.comingSoon"
      | "grammar.openLesson"
      | "grammar.inPreparation",
  ) => string;
};

export function GrammarLessonCard({
  lesson,
  language,
  t,
}: GrammarLessonCardProps) {
  const isAvailable = lesson.status === "published";
  const sharedClassName =
    "group relative flex min-h-[20rem] flex-col justify-between overflow-hidden p-7 text-left backdrop-blur-sm transition-all duration-200 md:p-8";

  const content = (
    <>
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div
            className={cx(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              isAvailable
                ? "bg-coptic-soft text-coptic"
                : "bg-elevated text-muted",
            )}
          >
            {isAvailable ? (
              <BookOpenText className="h-5 w-5" />
            ) : (
              <Clock3 className="h-5 w-5" />
            )}
          </div>
          <Badge tone={isAvailable ? "accent" : "flat"} size="xs" caps>
            {isAvailable ? t("grammar.lessonBadge") : t("home.comingSoon")}
          </Badge>
        </div>

        <h2
          className={cx(
            "mb-3 text-2xl font-semibold",
            isAvailable ? "text-ink" : "text-muted",
          )}
        >
          {lesson.title[language]}
        </h2>
        <p
          className={cx(
            "text-sm leading-7",
            isAvailable ? "text-muted" : "text-muted/70",
          )}
        >
          {lesson.summary[language]}
        </p>
      </div>

      <span
        className={cx(
          "relative mt-8 inline-flex items-center gap-2 text-sm font-semibold",
          isAvailable ? "text-coptic" : "text-muted/70",
        )}
      >
        {isAvailable ? t("grammar.openLesson") : t("grammar.inPreparation")}
        {isAvailable && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
    </>
  );

  if (!isAvailable) {
    return (
      <div
        className={surfacePanelClassName({
          variant: "subtle",
          shadow: "soft",
          className: cx(sharedClassName, "cursor-not-allowed opacity-90"),
        })}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={getGrammarLessonPath(lesson.slug, language)}
      prefetch={false}
      className={surfacePanelClassName({
        variant: "default",
        shadow: "soft",
        className: cx(
          sharedClassName,
          "cursor-pointer hover:-translate-y-0.5 hover:border-coptic/35 hover:bg-surface",
        ),
      })}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-coptic/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {content}
    </Link>
  );
}
