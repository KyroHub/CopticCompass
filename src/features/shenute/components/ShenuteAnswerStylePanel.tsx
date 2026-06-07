import type { ShenuteProvider } from "@/features/shenute/shared";
import { cx } from "@/lib/classes";

import {
  SHENUTE_ADAPTIVE_DIALOG_CLASS,
  SHENUTE_DIALOG_BACKDROP_CLASS,
  SHENUTE_ICON_CLASS,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";

import type { ShenuteProviderOption } from "./shenuteOptions";

type ShenuteAnswerStyleCopy = {
  aiMode: string;
  aiModeDescription: string;
  closeAnswerStyleControls: string;
};

type ShenuteAnswerStylePanelProps = {
  copy: ShenuteAnswerStyleCopy;
  inferenceProvider: ShenuteProvider;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  onClose: () => void;
  onSelectProvider: (provider: ShenuteProvider) => void;
  providerOptions: ReadonlyArray<ShenuteProviderOption>;
  selectedProviderOption: ShenuteProviderOption;
};

export function ShenuteAnswerStylePanel({
  copy,
  inferenceProvider,
  isLoading,
  isShenuteAccessBlocked,
  onClose,
  onSelectProvider,
  providerOptions,
  selectedProviderOption,
}: ShenuteAnswerStylePanelProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={cx(
          SHENUTE_DIALOG_BACKDROP_CLASS,
          "z-[60] sm:bg-transparent sm:backdrop-blur-0",
        )}
        onClick={onClose}
      />
      <div
        id="shenute-answer-style-panel"
        role="dialog"
        aria-labelledby="shenute-answer-style-label"
        className={cx(
          SHENUTE_ADAPTIVE_DIALOG_CLASS,
          "z-[70] sm:w-[min(28rem,calc(100vw_-_2rem))] sm:p-3",
        )}
      >
        <ShenuteSurfaceHeader
          closeLabel={copy.closeAnswerStyleControls}
          onClose={onClose}
          titleId="shenute-answer-style-label"
        >
          {copy.aiMode}
        </ShenuteSurfaceHeader>
        <p className="mt-1 text-xs leading-5 text-muted">
          {copy.aiModeDescription}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="shenute-answer-style-label"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {providerOptions.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === inferenceProvider;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={`${option.label}. ${option.description}`}
                onClick={() => onSelectProvider(option.value)}
                disabled={isLoading || isShenuteAccessBlocked}
                className={cx(
                  "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-coptic/55 bg-coptic-soft text-ink shadow-sm"
                    : "border-line bg-surface/88 text-muted hover:border-accent/35 hover:bg-elevated hover:text-ink",
                )}
              >
                <span
                  className={cx(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-coptic text-paper"
                      : "bg-elevated text-muted",
                  )}
                >
                  <Icon className={SHENUTE_ICON_CLASS.panel} />
                </span>
                <span className="min-w-0 text-sm font-semibold leading-5">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 rounded-lg border border-line bg-elevated px-3 py-2 text-xs leading-5 text-muted">
          <span className="font-semibold text-ink">
            {selectedProviderOption.label}:
          </span>{" "}
          {selectedProviderOption.description}
        </p>
      </div>
    </>
  );
}
