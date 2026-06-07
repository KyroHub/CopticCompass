import {
  SHENUTE_ICON_CLASS,
  ShenuteActionGroupLabel,
} from "./ShenuteClientPrimitives";

import type { ShenuteStarterPrompt } from "./shenuteOptions";

type ShenuteWelcomePanelCopy = {
  starterPromptsTitle: string;
  welcomeDescription: string;
  welcomeTitle: string;
};

type ShenuteWelcomePanelProps = {
  copy: ShenuteWelcomePanelCopy;
  isDisabled: boolean;
  onSelectPrompt: (prompt: string) => void;
  starterPrompts: ReadonlyArray<ShenuteStarterPrompt>;
};

export function ShenuteWelcomePanel({
  copy,
  isDisabled,
  onSelectPrompt,
  starterPrompts,
}: ShenuteWelcomePanelProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-b border-line bg-elevated/55 p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coptic-soft text-2xl text-coptic shadow-sm">
            <span className="font-coptic leading-none">Ϣ</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold leading-6 text-ink md:text-lg">
              {copy.welcomeTitle}
            </h2>
            <p className="hidden max-w-2xl truncate text-sm text-muted lg:block">
              {copy.welcomeDescription}
            </p>
          </div>
        </div>
        <div>
          <ShenuteActionGroupLabel className="mb-2">
            {copy.starterPromptsTitle}
          </ShenuteActionGroupLabel>
          <div className="grid gap-2 md:grid-cols-3">
            {starterPrompts.map((starterPrompt) => {
              const Icon = starterPrompt.icon;

              return (
                <button
                  key={starterPrompt.prompt}
                  type="button"
                  onClick={() => onSelectPrompt(starterPrompt.prompt)}
                  disabled={isDisabled}
                  className="group flex min-h-12 w-full items-start gap-3 rounded-lg border border-line bg-surface/88 px-3 py-2.5 text-left text-sm font-medium leading-5 text-ink shadow-sm transition hover:border-coptic/35 hover:bg-coptic-soft/45 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-14 md:py-3"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted transition group-hover:bg-coptic-soft group-hover:text-coptic">
                    <Icon className={SHENUTE_ICON_CLASS.action} />
                  </span>
                  <span className="min-w-0">{starterPrompt.prompt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
