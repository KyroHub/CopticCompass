import { SlidersHorizontal } from "lucide-react";

import { buttonClassName } from "@/components/Button";
import type { ShenuteProvider } from "@/features/shenute/shared";
import { cx } from "@/lib/classes";

import type { ShenuteProviderOption } from "./shenuteOptions";

type FloatingShenuteProviderControlsCopy = {
  aiMode: string;
  aiModeDescription: string;
  answerStyleControls: string;
  provider: string;
};

type FloatingShenuteProviderControlsProps = {
  copy: FloatingShenuteProviderControlsCopy;
  inferenceProvider: ShenuteProvider;
  isAnswerStylePanelOpen: boolean;
  isDisabled: boolean;
  onSelectProvider: (provider: ShenuteProvider) => void;
  onTogglePanel: () => void;
  providerOptions: ShenuteProviderOption[];
  selectedProviderOption: ShenuteProviderOption;
};

export function FloatingShenuteProviderControls({
  copy,
  inferenceProvider,
  isAnswerStylePanelOpen,
  isDisabled,
  onSelectProvider,
  onTogglePanel,
  providerOptions,
  selectedProviderOption,
}: FloatingShenuteProviderControlsProps) {
  return (
    <div className="border-b border-line/80 px-4 py-2.5">
      <button
        type="button"
        aria-expanded={isAnswerStylePanelOpen}
        aria-label={copy.answerStyleControls}
        title={copy.answerStyleControls}
        onClick={onTogglePanel}
        disabled={isDisabled}
        className={buttonClassName({
          fullWidth: true,
          size: "sm",
          variant: "secondary",
          className:
            "h-10 justify-start gap-2 border-line/80 bg-surface/88 px-3 text-left text-xs",
        })}
      >
        <SlidersHorizontal
          className="h-4 w-4 shrink-0 text-coptic"
          aria-hidden="true"
        />
        <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-muted">
          {copy.provider}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink">
          {selectedProviderOption.label}
        </span>
      </button>
      {isAnswerStylePanelOpen ? (
        <div
          role="dialog"
          aria-label={copy.aiMode}
          className="mt-2 rounded-lg border border-line/80 bg-elevated/70 p-2 shadow-soft"
        >
          <div className="mb-2">
            <p className="text-xs font-semibold text-ink">{copy.aiMode}</p>
            <p className="text-[11px] leading-4 text-muted">
              {copy.aiModeDescription}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label={copy.aiMode}
            className="grid min-w-0 gap-1.5 sm:grid-cols-2"
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
                  onClick={() => {
                    onSelectProvider(option.value);
                  }}
                  disabled={isDisabled}
                  className={cx(
                    "flex min-h-10 w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                    isActive
                      ? "border-coptic/55 bg-coptic-soft text-ink shadow-sm"
                      : "border-line bg-surface/88 text-muted hover:border-accent/35 hover:bg-elevated hover:text-ink",
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-coptic text-paper"
                        : "bg-elevated text-muted",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate font-semibold">
                      {option.label}
                    </span>
                    <span className="block truncate text-[11px] font-normal">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
