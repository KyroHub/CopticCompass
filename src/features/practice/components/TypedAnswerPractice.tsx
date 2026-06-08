"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import type { TypedFlashcardAnswerResult } from "@/features/practice/lib/typedAnswer";
import { cx } from "@/lib/classes";
import type { TranslationKey } from "@/lib/i18n";

export function TypedAnswerPractice({
  onChange,
  onCheck,
  status,
  value,
  shouldShake,
}: {
  onChange: (value: string) => void;
  onCheck: () => void;
  status: TypedFlashcardAnswerResult | null;
  value: string;
  shouldShake?: boolean;
}) {
  const { t } = useLanguage();
  let feedbackContent = null;

  if (status) {
    const Icon = status === "correct" ? CheckCircle2 : AlertTriangle;
    let feedbackKey: TranslationKey = "practice.saved.typeAnswerIncorrect";
    let feedbackClassName = "text-danger";

    if (status === "correct") {
      feedbackKey = "practice.saved.typeAnswerCorrect";
      feedbackClassName = "text-coptic";
    } else if (status === "empty") {
      feedbackKey = "practice.saved.typeAnswerEmpty";
      feedbackClassName = "text-warning";
    }

    feedbackContent = (
      <p
        className={cx(
          "mt-2 flex items-center justify-center gap-2 text-sm font-semibold sm:justify-start",
          feedbackClassName,
        )}
        aria-live="polite"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {t(feedbackKey)}
      </p>
    );
  }

  return (
    <div className="text-left">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCheck();
            }
          }}
          aria-label={t("practice.saved.typeAnswerLabel")}
          placeholder={t("practice.saved.typeAnswerPlaceholder")}
          className={cx(
            "font-coptic",
            "h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-lg font-semibold text-coptic shadow-inner outline-none transition-colors placeholder:text-sm placeholder:font-sans placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20",
            shouldShake && "animate-shake",
          )}
        />
        <button
          type="button"
          onClick={onCheck}
          className={buttonClassName({
            className: "h-11 shrink-0 px-4",
            size: "sm",
            variant: "secondary",
          })}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.checkTypedAnswer")}
        </button>
      </div>
      {feedbackContent}
    </div>
  );
}
