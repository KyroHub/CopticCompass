import { Clock3 } from "lucide-react";

import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

import { SHENUTE_ICON_CLASS } from "./ShenuteClientPrimitives";
import { getMessageAvatarClassName } from "./shenuteClientUtils";

type ShenuteThinkingIndicatorCopy = {
  assistantLabel: string;
  thinkingElapsed: string;
  thinkingLongHint: string;
};

type ShenuteThinkingIndicatorProps = {
  copy: ShenuteThinkingIndicatorCopy;
  selectedProviderLabel: string;
  thinkingElapsedLabel: string;
  thinkingElapsedSeconds: number;
  thinkingStatusMessage: string;
};

export function ShenuteThinkingIndicator({
  copy,
  selectedProviderLabel,
  thinkingElapsedLabel,
  thinkingElapsedSeconds,
  thinkingStatusMessage,
}: ShenuteThinkingIndicatorProps) {
  return (
    <div className="mr-auto flex w-full max-w-full gap-2 sm:max-w-[52rem] sm:gap-3">
      <div
        className={cx(
          "mt-6 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm sm:flex",
          getMessageAvatarClassName("assistant"),
        )}
      >
        <span className="font-coptic text-base leading-none">Ϣ</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {copy.assistantLabel}
        </p>
        <div
          aria-live="polite"
          className={surfacePanelClassName({
            shadow: "soft",
            className:
              "rounded-bl-sm px-3 py-2.5 ring-1 ring-line/60 sm:px-4 sm:py-3",
          })}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="relative flex h-2.5 w-2.5 shrink-0"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coptic/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coptic" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {thinkingStatusMessage}
            </span>
            <span
              aria-label={`${copy.thinkingElapsed} ${thinkingElapsedLabel}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-elevated px-2 py-0.5 text-xs font-semibold text-muted"
            >
              <Clock3 className={SHENUTE_ICON_CLASS.meta} />
              {thinkingElapsedLabel}
            </span>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center gap-1"
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coptic delay-100" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coptic delay-200" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coptic delay-300" />
            </span>
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              {thinkingElapsedSeconds >= 20
                ? copy.thinkingLongHint
                : selectedProviderLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
