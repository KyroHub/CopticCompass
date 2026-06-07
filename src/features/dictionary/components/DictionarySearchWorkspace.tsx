"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { buttonClassName, iconButtonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { SegmentedControl } from "@/components/SegmentedControl";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import type {
  DialectFilter,
  DictionaryEtymologyFilter,
  DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import type { DictionaryResultMode } from "@/features/dictionary/hooks/useDictionaryResultMode";
import { cx } from "@/lib/classes";
import { useMediaQuery } from "@/lib/useMediaQuery";

import {
  DictionaryAdvancedFilterControls,
  DictionaryFilterControls,
  DictionaryPronunciationControls,
} from "./DictionaryFilters";
import { DictionarySearchBar } from "./DictionarySearchBar";

import type { ReactNode, RefObject } from "react";

type DictionarySearchWorkspaceProps = {
  exactMatch: boolean;
  hasGreek: boolean;
  hasInflections: boolean;
  hasRelatedEntries: boolean;
  isKeyboardOpen: boolean;
  onAppend: (char: string) => void;
  onBackspace: () => void;
  onClearFilters: () => void;
  onQueryChange: (value: string) => void;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onToggleKeyboard: () => void;
  query: string;
  resultMode: DictionaryResultMode;
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedDialect: DialectFilter;
  selectedEtymology: DictionaryEtymologyFilter;
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter;
  setExactMatch: (value: boolean) => void;
  setHasGreek: (value: boolean) => void;
  setHasInflections: (value: boolean) => void;
  setHasRelatedEntries: (value: boolean) => void;
  setSelectedDialect: (value: DialectFilter) => void;
  setSelectedEtymology: (value: DictionaryEtymologyFilter) => void;
  setSelectedPartOfSpeech: (value: DictionaryPartOfSpeechFilter) => void;
  setResultMode: (mode: DictionaryResultMode) => void;
};

type CollapsibleFilterSectionProps = {
  activeCount?: number;
  children: ReactNode;
  className?: string;
  defaultOpen?: "desktop" | boolean;
  title: string;
};

function CollapsibleFilterSection({
  activeCount = 0,
  children,
  className,
  defaultOpen = false,
  title,
}: CollapsibleFilterSectionProps) {
  const contentId = useId();
  const hasUserToggledRef = useRef(false);
  const isDesktopViewport = useMediaQuery("(min-width: 768px)");
  const [isOpen, setIsOpen] = useState(defaultOpen === true);

  useEffect(() => {
    if (defaultOpen === "desktop" && !hasUserToggledRef.current) {
      setIsOpen(isDesktopViewport);
    }
  }, [defaultOpen, isDesktopViewport]);

  function toggleExpanded() {
    hasUserToggledRef.current = true;
    setIsOpen((current) => !current);
  }

  return (
    <div className="border-t border-line pt-4 md:grid md:gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={toggleExpanded}
        className="group flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg -mx-2 px-2 text-left text-muted transition-colors hover:bg-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:mx-0 md:px-0 md:hover:bg-transparent"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-semibold uppercase tracking-widest transition-colors group-hover:text-ink">
            {title}
          </span>
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-semibold text-paper dark:bg-elevated dark:text-ink dark:ring-1 dark:ring-line">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 transition-transform group-hover:text-ink",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={contentId}
        className={cx(
          "min-w-0",
          isOpen ? "mt-3 grid gap-2 md:mt-0" : "hidden",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DictionarySearchWorkspace({
  exactMatch,
  hasGreek,
  hasInflections,
  hasRelatedEntries,
  isKeyboardOpen,
  onAppend,
  onBackspace,
  onClearFilters,
  onQueryChange,
  onSelectionChange,
  onToggleKeyboard,
  query,
  resultMode,
  searchInputRef,
  selectedDialect,
  selectedEtymology,
  selectedPartOfSpeech,
  setExactMatch,
  setHasGreek,
  setHasInflections,
  setHasRelatedEntries,
  setSelectedDialect,
  setSelectedEtymology,
  setSelectedPartOfSpeech,
  setResultMode,
}: DictionarySearchWorkspaceProps) {
  const { t } = useLanguage();
  const controlsPanelId = useId();
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const standardFilterCount = [
    selectedPartOfSpeech !== "ALL",
    selectedDialect !== "ALL",
    selectedEtymology !== "ALL",
  ].filter(Boolean).length;
  const advancedFilterCount = [
    exactMatch,
    hasGreek,
    hasInflections,
    hasRelatedEntries,
  ].filter(Boolean).length;
  const activeFilterCount = standardFilterCount + advancedFilterCount;
  const hasActiveFilters = activeFilterCount > 0;
  const canShowPronunciationControls =
    selectedDialect === "ALL" || selectedDialect === "B";
  const panelControlClassName = "w-full min-w-0";
  const panelTriggerClassName = "w-full min-w-0";
  const panelRowClassName =
    "grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start";

  const controlsToggle = (
    <button
      type="button"
      onClick={() => setIsControlsOpen((current) => !current)}
      aria-controls={controlsPanelId}
      aria-expanded={isControlsOpen}
      aria-label={t("dict.controls")}
      title={t("dict.controls")}
      className={iconButtonClassName({
        active: isControlsOpen,
        className: "relative h-9 w-9 border-transparent sm:h-10 sm:w-10",
      })}
    >
      <SlidersHorizontal className="h-5 w-5" />
      {hasActiveFilters ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold leading-none text-paper ring-2 ring-surface dark:bg-elevated dark:text-ink dark:ring-surface">
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="relative z-30 flex flex-col gap-2">
      <DictionarySearchBar
        isKeyboardOpen={isKeyboardOpen}
        onAppend={onAppend}
        onBackspace={onBackspace}
        onQueryChange={onQueryChange}
        onSelectionChange={onSelectionChange}
        onToggleKeyboard={onToggleKeyboard}
        query={query}
        searchInputRef={searchInputRef}
        trailingControls={controlsToggle}
      />

      {isControlsOpen ? (
        <section
          id={controlsPanelId}
          className={surfacePanelClassName({
            variant: "elevated",
            shadow: "panel",
            className: "p-3 sm:p-4",
          })}
        >
          <div className="grid gap-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t("dict.controls")}
              </h2>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className={buttonClassName({
                    className: "h-8 shrink-0 px-2.5 text-xs",
                    size: "sm",
                    variant: "ghost",
                  })}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("dict.clearFilters")}
                </button>
              ) : null}
            </div>

            <div className={panelRowClassName}>
              <h3 className="flex h-11 items-center text-xs font-semibold uppercase tracking-widest text-muted">
                {t("dict.resultView")}
              </h3>
              <SegmentedControl
                className="w-full min-w-0"
                controlClassName="mt-0 grid grid-cols-2"
                label={t("dict.resultView")}
                labelClassName="sr-only"
                layout="wrap"
                onChange={(value) =>
                  setResultMode(value as DictionaryResultMode)
                }
                options={[
                  {
                    label: t("dict.resultMode.compact"),
                    value: "compact",
                  },
                  {
                    label: t("dict.resultMode.detailed"),
                    value: "detailed",
                  },
                ]}
                tone="neutral"
                value={resultMode}
                variant="flush"
              />
            </div>

            <CollapsibleFilterSection
              activeCount={standardFilterCount}
              className="sm:grid-cols-2 lg:grid-cols-3"
              defaultOpen="desktop"
              title={t("dict.filters")}
            >
              <DictionaryFilterControls
                controlClassName={panelControlClassName}
                selectedDialect={selectedDialect}
                selectedEtymology={selectedEtymology}
                selectedPartOfSpeech={selectedPartOfSpeech}
                setSelectedDialect={setSelectedDialect}
                setSelectedEtymology={setSelectedEtymology}
                setSelectedPartOfSpeech={setSelectedPartOfSpeech}
                triggerClassName={panelTriggerClassName}
              />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection
              activeCount={advancedFilterCount}
              className="sm:grid-cols-2 lg:grid-cols-4"
              title={t("dict.advanced")}
            >
              <DictionaryAdvancedFilterControls
                controlClassName={panelControlClassName}
                exactMatch={exactMatch}
                hasGreek={hasGreek}
                hasInflections={hasInflections}
                hasRelatedEntries={hasRelatedEntries}
                setExactMatch={setExactMatch}
                setHasGreek={setHasGreek}
                setHasInflections={setHasInflections}
                setHasRelatedEntries={setHasRelatedEntries}
                triggerClassName={panelTriggerClassName}
              />
            </CollapsibleFilterSection>

            {canShowPronunciationControls ? (
              <CollapsibleFilterSection
                className="sm:grid-cols-2"
                title={t("dict.pronunciation")}
              >
                <DictionaryPronunciationControls
                  controlClassName={panelControlClassName}
                  selectedDialect={selectedDialect}
                  triggerClassName={panelTriggerClassName}
                />
              </CollapsibleFilterSection>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
