"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/Badge";
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
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

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

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end bg-ink/35 p-2 backdrop-blur-sm sm:items-center sm:justify-center sm:p-3"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[min(44rem,calc(100dvh-1rem))] w-full max-w-3xl overflow-hidden rounded-t-lg border border-line bg-surface shadow-soft sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:items-center">
          <div>
            <h2
              id={titleId}
              className="text-sm font-semibold uppercase tracking-widest text-muted"
            >
              {t("practice.deckSelector.title")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
              {t("practice.deckSelector.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("practice.deckSelector.close")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-elevated text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

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
                        : "border-line bg-elevated/55 text-ink hover:border-coptic/25 hover:bg-elevated",
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
      </section>
    </div>,
    document.body,
  );
}
