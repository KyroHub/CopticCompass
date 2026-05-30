"use client";

import { Flag, Heart, Share2 } from "lucide-react";
import { useCallback, useState, type ComponentType } from "react";

import { AuthGatedActionButton } from "@/components/AuthGatedActionButton";
import { buttonClassName, iconButtonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import type { LexicalEntry } from "@/features/dictionary/types";

type EntryActionIntent = "favorite" | "report" | "share";

type EntryActionBarProps = {
  compact?: boolean;
  entry: LexicalEntry;
};

type EntryActionBarPanelProps = EntryActionBarProps & {
  initialIntent?: EntryActionIntent;
};

type EntryActionBarPanelComponent = ComponentType<EntryActionBarPanelProps>;

const compactActionButtonClassName = iconButtonClassName({
  className: "h-8 w-8 bg-elevated",
});

export function EntryActionBar({
  compact = false,
  ...props
}: EntryActionBarProps) {
  const { t } = useLanguage();
  const [Panel, setPanel] = useState<EntryActionBarPanelComponent | null>(null);
  const [initialIntent, setInitialIntent] = useState<
    EntryActionIntent | undefined
  >();
  const lockedMessage = t("entry.actions.loginPrompt");

  const loadPanel = useCallback(
    (intent?: EntryActionIntent) => {
      if (intent) {
        setInitialIntent(intent);
      }

      if (Panel) {
        return;
      }

      void import("./EntryActionBarPanel").then((module) => {
        setPanel(() => module.EntryActionBarPanel);
      });
    },
    [Panel],
  );

  if (Panel) {
    return <Panel {...props} compact={compact} initialIntent={initialIntent} />;
  }

  if (compact) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={t("entry.actions.share")}
            title={t("entry.actions.share")}
            className={compactActionButtonClassName}
            onClick={() => loadPanel("share")}
            onFocus={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
          >
            <Share2 className="h-4 w-4" />
            <span className="sr-only">{t("entry.actions.share")}</span>
          </button>

          <span
            onFocusCapture={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
            onPointerDownCapture={() => loadPanel("favorite")}
          >
            <AuthGatedActionButton
              className={compactActionButtonClassName}
              isAuthenticated={false}
              isReady
              lockedContent={
                <>
                  <Heart className="h-4 w-4" />
                  <span className="sr-only">{t("entry.actions.favorite")}</span>
                </>
              }
              lockedMessage={lockedMessage}
            >
              <Heart className="h-4 w-4" />
              <span className="sr-only">{t("entry.actions.favorite")}</span>
            </AuthGatedActionButton>
          </span>

          <span
            onFocusCapture={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
            onPointerDownCapture={() => loadPanel("report")}
          >
            <AuthGatedActionButton
              className={compactActionButtonClassName}
              isAuthenticated={false}
              isReady
              lockedContent={
                <>
                  <Flag className="h-4 w-4" />
                  <span className="sr-only">{t("entry.actions.report")}</span>
                </>
              }
              lockedMessage={lockedMessage}
            >
              <Flag className="h-4 w-4" />
              <span className="sr-only">{t("entry.actions.report")}</span>
            </AuthGatedActionButton>
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
            {t("entry.actions.eyebrow")}
          </p>
          <p className="text-sm leading-6 text-muted">
            {t("entry.actions.description")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClassName({
              className: "gap-2 px-4",
              variant: "secondary",
            })}
            onClick={() => loadPanel("share")}
            onFocus={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
          >
            <Share2 className="h-4 w-4" />
            {t("entry.actions.share")}
          </button>

          <span
            onFocusCapture={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
            onPointerDownCapture={() => loadPanel("favorite")}
          >
            <AuthGatedActionButton
              className={buttonClassName({
                className: "gap-2 px-4",
                variant: "secondary",
              })}
              isAuthenticated={false}
              isReady
              lockedMessage={lockedMessage}
            >
              <Heart className="h-4 w-4" />
              {t("entry.actions.favorite")}
            </AuthGatedActionButton>
          </span>

          <span
            onFocusCapture={() => loadPanel()}
            onMouseEnter={() => loadPanel()}
            onPointerDownCapture={() => loadPanel("report")}
          >
            <AuthGatedActionButton
              className={buttonClassName({
                className: "gap-2 px-4",
                variant: "secondary",
              })}
              isAuthenticated={false}
              isReady
              lockedMessage={lockedMessage}
            >
              <Flag className="h-4 w-4" />
              {t("entry.actions.report")}
            </AuthGatedActionButton>
          </span>
        </div>
      </div>
    </div>
  );
}
