"use client";

import Link from "next/link";
import { useId, useMemo } from "react";

import { Badge } from "@/components/Badge";
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/Dialog";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  AppFlashcardDeckId,
  AppFlashcardDeckOption,
} from "@/features/practice/lib/deckRegistry";
import {
  getDeckKindLabelKey,
  getDeckPickerGroups,
  getDeckScopeText,
  getPracticeDeckPath,
} from "@/features/practice/lib/practicePageHelpers";
import { cx } from "@/lib/classes";

export function DeckPickerDialog({
  activeDeckId,
  deckOptions,
  isOpen,
  isPersistenceEnabled,
  language,
  onClose,
  privateDeckLoginPath,
}: {
  activeDeckId: AppFlashcardDeckId;
  deckOptions: readonly AppFlashcardDeckOption[];
  isOpen: boolean;
  isPersistenceEnabled: boolean;
  language: "en" | "nl";
  onClose: () => void;
  privateDeckLoginPath: string;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const deckGroups = useMemo(
    () => getDeckPickerGroups(deckOptions),
    [deckOptions],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex-row items-start justify-between gap-3 sm:items-center">
          <div>
            <DialogTitle>{t("practice.deckSelector.title")}</DialogTitle>
            <DialogDescription className="mt-1">
              {t("practice.deckSelector.description")}
            </DialogDescription>
          </div>
          <DialogCloseButton aria-label={t("practice.deckSelector.close")} />
        </DialogHeader>

        <div className="max-h-[calc(100dvh-8.5rem)] space-y-5 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-h-[34rem] sm:p-4">
          {deckGroups.map((group) => {
            const groupTitleId = `${titleId}-${group.id}`;

            return (
              <section
                key={group.id}
                aria-labelledby={groupTitleId}
                className="space-y-2"
              >
                <div className="px-1">
                  <h3
                    id={groupTitleId}
                    className="text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {t(group.titleKey)}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {t(group.descriptionKey)}
                  </p>
                </div>

                <div className="space-y-2">
                  {group.options.map((option) => {
                    const isActive = option.id === activeDeckId;
                    const isLockedPrivateDeck =
                      !isPersistenceEnabled && option.kind === "saved";
                    const deckPath = getPracticeDeckPath({
                      deckId: option.id,
                      isPersistenceEnabled,
                      language,
                      privateDeckLoginPath,
                    });
                    const rowClassName = cx(
                      "grid w-full gap-3 rounded-lg border px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                      isActive
                        ? "border-coptic/30 bg-coptic/5 text-coptic"
                        : "border-line bg-elevated/70 text-ink hover:border-coptic/25 hover:bg-elevated",
                    );
                    const rowContent = (
                      <>
                        <span className="min-w-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {t(option.titleKey)}
                            </span>
                            {isActive ? (
                              <Badge tone="coptic" size="xs">
                                {t("practice.deckSelector.current")}
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                            {t(option.descriptionKey)}
                          </span>
                          <span className="mt-2 block truncate text-xs font-semibold text-muted">
                            {getDeckScopeText({ deck: option, t })}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <Badge
                            tone={
                              option.kind === "saved" ? "accent" : "surface"
                            }
                            size="xs"
                          >
                            {t(getDeckKindLabelKey(option.kind))}
                          </Badge>
                          {isLockedPrivateDeck ? (
                            <Badge tone="accent" size="xs">
                              {t("practice.deckSelector.signInRequired")}
                            </Badge>
                          ) : (
                            <Badge tone="surface" size="xs">
                              {option.sourceCount}{" "}
                              {t("practice.deckSelector.cards")}
                            </Badge>
                          )}
                        </span>
                      </>
                    );

                    if (isActive) {
                      return (
                        <div key={option.id} className={rowClassName}>
                          {rowContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={option.id}
                        href={deckPath}
                        prefetch={false}
                        onClick={onClose}
                        className={rowClassName}
                      >
                        {rowContent}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
