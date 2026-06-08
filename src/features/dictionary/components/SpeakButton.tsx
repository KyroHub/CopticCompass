"use client";

import { useRef, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/Tooltip";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import { cx } from "@/lib/classes";

interface SpeakButtonProps {
  copticText: string;
  className?: string;
}

/**
 * Renders a compact pronunciation control when browser speech synthesis is
 * available.
 */
export function SpeakButton({ copticText, className }: SpeakButtonProps) {
  const { speakAuto, stop, isSpeaking, isSupported, isPremiumLoading } =
    useSpeech();
  const { t } = useLanguage();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hearLabel = t("dict.ttsHear");
  const stopLabel = t("dict.ttsStop");

  if (!isSupported || !copticText?.trim()) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovered(false);
    if (isSpeaking) {
      stop();
    } else {
      speakAuto(copticText);
    }
  };

  let icon;
  if (isPremiumLoading) {
    icon = (
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    );
  } else if (isSpeaking) {
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    );
  } else {
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }

  return (
    <Tooltip open={isHovered && !isSpeaking} onOpenChange={setIsHovered}>
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          onClick={handleClick}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          title={isSpeaking ? stopLabel : hearLabel}
          aria-label={isSpeaking ? stopLabel : `${hearLabel}: ${copticText}`}
          aria-pressed={isSpeaking}
          className={cx(
            "inline-flex cursor-pointer select-none shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
            isSpeaking
              ? "bg-coptic-soft text-coptic"
              : "text-muted hover:bg-elevated hover:text-ink",
            isPremiumLoading && "animate-pulse",
            className,
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent variant="micro" className="max-w-[200px]">
        {t("dict.ttsDisclaimer")}
        <TooltipArrow />
      </TooltipContent>
    </Tooltip>
  );
}
