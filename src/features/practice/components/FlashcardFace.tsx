"use client";

import { BookOpen, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { SpeakButton } from "@/features/dictionary/components/SpeakButton";
import { AnswerContextPanel } from "@/features/practice/components/AnswerContextPanel";
import { TypedAnswerPractice } from "@/features/practice/components/TypedAnswerPractice";
import {
  getCandidateAnswerSpeechText,
  getCandidateFrontSpeechText,
  getCandidatePrimaryLink,
  getFlashcardHintText,
} from "@/features/practice/lib/practicePageHelpers";
import type {
  AppFlashcardDeckItem,
  AppFlashcardSide,
} from "@/features/practice/lib/practiceSessionTypes";
import type { TypedFlashcardAnswerResult } from "@/features/practice/lib/typedAnswer";
import { cx } from "@/lib/classes";
import { antinoou } from "@/lib/fonts";

function FlashcardSideValue({
  side,
  speechText,
}: {
  side: AppFlashcardSide;
  speechText: string | null;
}) {
  const isCoptic = side.kind === "coptic";

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-3">
      <p
        className={
          isCoptic
            ? `${antinoou.className} max-w-full break-words text-4xl leading-tight text-coptic [overflow-wrap:anywhere] sm:text-5xl md:text-6xl`
            : "line-clamp-3 max-w-3xl text-base font-semibold leading-6 text-ink md:line-clamp-none md:text-3xl md:leading-10"
        }
      >
        {side.text}
      </p>
      {speechText ? (
        <SpeakButton
          copticText={speechText}
          className="h-10 w-10 border border-line bg-elevated"
        />
      ) : null}
    </div>
  );
}

function FlashcardHintPanel({ hintText }: { hintText: string }) {
  const { t } = useLanguage();

  return (
    <div className="rounded-md border border-accent/20 bg-accent-soft/60 px-3 py-3 text-left">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-strong">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        {t("practice.saved.hintTitle")}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">
        {hintText}
      </p>
    </div>
  );
}

export function FlashcardFace({
  isHintVisible,
  isRevealed,
  item,
  onTypedAnswerChange,
  onTypedAnswerCheck,
  typedAnswer,
  typedAnswerStatus,
  shouldShake,
}: {
  isHintVisible: boolean;
  isRevealed: boolean;
  item: AppFlashcardDeckItem;
  onTypedAnswerChange: (value: string) => void;
  onTypedAnswerCheck: () => void;
  typedAnswer: string;
  typedAnswerStatus: TypedFlashcardAnswerResult | null;
  shouldShake?: boolean;
}) {
  const { t } = useLanguage();
  const { candidate } = item;
  const hintText = getFlashcardHintText(candidate, t);
  const isTypingCard = candidate.back.kind === "coptic";
  const primaryLink = getCandidatePrimaryLink(candidate);
  const backFaceScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (backFaceScrollRef.current) {
      backFaceScrollRef.current.scrollTop = 0;
    }
  }, [item.candidate.id]);

  return (
    <div className="card-perspective w-full h-[24rem] sm:h-[26rem] md:h-[30rem]">
      <div className={cx("card-inner", isRevealed && "is-flipped")}>
        {/* CARD FRONT FACE */}
        <div
          className="card-face card-front rounded-lg border border-line bg-elevated/45 p-4 shadow-soft md:p-6"
          aria-hidden={isRevealed}
        >
          {primaryLink ? (
            <div className="flex justify-end w-full">
              <Link
                href={primaryLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName({
                  className: "h-9 px-3 text-xs max-sm:hidden",
                  size: "sm",
                  variant: "secondary",
                })}
                tabIndex={isRevealed ? -1 : 0}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {t(primaryLink.labelKey)}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center md:gap-6 md:py-10">
            <div className="w-full space-y-2 md:space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t(candidate.front.labelKey)}
              </p>
              <FlashcardSideValue
                side={candidate.front}
                speechText={getCandidateFrontSpeechText(candidate)}
              />
            </div>

            <div className="w-full rounded-lg border border-line bg-elevated/70 px-4 py-3 md:px-6 md:py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t(candidate.back.labelKey)}
              </p>
              {isTypingCard ? (
                <div className="mt-3 space-y-3 text-left">
                  {isHintVisible ? (
                    <FlashcardHintPanel hintText={hintText} />
                  ) : null}
                  <TypedAnswerPractice
                    value={typedAnswer}
                    status={typedAnswerStatus}
                    onChange={onTypedAnswerChange}
                    onCheck={onTypedAnswerCheck}
                    shouldShake={shouldShake}
                  />
                </div>
              ) : (
                <div className="mt-3">
                  {isHintVisible ? (
                    <FlashcardHintPanel hintText={hintText} />
                  ) : null}
                  <p className="text-base font-medium text-muted">
                    {t("practice.saved.hiddenAnswer")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD BACK FACE */}
        <div
          className="card-face card-back rounded-lg border border-line border-l-4 border-l-coptic/40 bg-surface p-4 shadow-soft md:p-6"
          aria-hidden={!isRevealed}
        >
          {primaryLink ? (
            <div className="flex justify-end w-full">
              <Link
                href={primaryLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName({
                  className: "h-9 px-3 text-xs max-sm:hidden",
                  size: "sm",
                  variant: "secondary",
                })}
                tabIndex={isRevealed ? 0 : -1}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {t(primaryLink.labelKey)}
              </Link>
            </div>
          ) : null}

          <div
            ref={backFaceScrollRef}
            className="flex flex-1 flex-col items-center justify-start gap-2 py-3 text-center md:gap-4 md:py-8 overflow-y-auto w-full"
          >
            <div className="w-full my-auto flex flex-col items-center gap-2 md:gap-4">
              <div className="w-full space-y-1 md:space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t(candidate.front.labelKey)}
                </p>
                <FlashcardSideValue
                  side={candidate.front}
                  speechText={getCandidateFrontSpeechText(candidate)}
                />
              </div>

              <div className="w-full rounded-lg border border-coptic/20 bg-coptic/5 px-4 py-3 md:px-6 md:py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t(candidate.back.labelKey)}
                </p>
                <div className="mt-2">
                  <FlashcardSideValue
                    side={candidate.back}
                    speechText={getCandidateAnswerSpeechText(candidate)}
                  />
                </div>
              </div>

              <div className="w-full text-left">
                <AnswerContextPanel key={candidate.id} candidate={candidate} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
