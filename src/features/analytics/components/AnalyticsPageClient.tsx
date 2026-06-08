"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import {
  FilterBar,
  FilterMenu,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import {
  type AnalyticsSnapshotMap,
  ETYMOLOGY_FILTERS,
  type EtymologyFilter,
} from "@/features/analytics/lib/analytics";
import {
  buildAnalyticsChartDrilldown,
  buildAnalyticsStatDrilldown,
  type AnalyticsDrilldownPage,
  type AnalyticsDrilldown,
} from "@/features/analytics/lib/analyticsDrilldown";
import { DictionaryResultsSection } from "@/features/dictionary/components/DictionaryResultsSection";
import {
  type AnalyticsDialect,
  dialectFilterOptions,
  getDialectFilterOptionLabel,
} from "@/features/dictionary/config";
import type { DictionaryClientEntry } from "@/features/dictionary/types";
import { cx } from "@/lib/classes";
import type { TranslationKey } from "@/lib/i18n";
import { getDictionaryPath, getLocalizedHomePath } from "@/lib/locale";

import { AnalyticsSlideOver } from "./AnalyticsSlideOver";

const ANALYTICS_DRILLDOWN_PAGE_SIZE = 50;

const AnalyticsChartsSection = dynamic(
  () =>
    import("./AnalyticsChartsSection").then((module) => ({
      default: module.AnalyticsChartsSection,
    })),
  {
    ssr: false,
    loading: () => <AnalyticsChartsPlaceholder />,
  },
);

type AnalyticsStatCardProps = {
  accentClassName: string;
  title: string;
  value: string;
  valueClassName?: string;
  onClick?: () => void;
};

type AnalyticsChartsCalloutProps = {
  description: string;
  loadLabel: string;
  onLoadCharts: () => void;
  title: string;
};

type AnalyticsDrilldownFetchError = "initial" | "more" | null;

function getEtymologyFilterLabel(
  etymology: EtymologyFilter,
  t: ReturnType<typeof useLanguage>["t"],
) {
  switch (etymology) {
    case "ALL":
      return t("analytics.filterEtymologyAll" as TranslationKey);
    case "Egy":
      return t("analytics.filterEtymologyEgy" as TranslationKey);
    case "Gr":
      return t("analytics.filterEtymologyGr" as TranslationKey);
    case "Lat":
      return t("analytics.filterEtymologyLat" as TranslationKey);
    case "Sem":
      return t("analytics.filterEtymologySem" as TranslationKey);
    case "Unknown":
      return t("analytics.filterEtymologyUnknown" as TranslationKey);
  }
}

function cleanFilterLabel(label: string) {
  return label.replace(/:$/, "");
}

function getSelectedFilterLabel(
  options: readonly FilterMenuOption[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function AnalyticsStatCard({
  accentClassName,
  title,
  value,
  valueClassName = "text-3xl font-bold text-ink md:text-4xl",
  onClick,
}: AnalyticsStatCardProps) {
  const cardContent = (
    <>
      <div
        className={cx(
          "absolute inset-y-4 left-0 w-1 rounded-r-full",
          accentClassName,
        )}
      />
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
        {title}
      </h2>
      <p className={valueClassName}>{value}</p>
    </>
  );

  if (!onClick) {
    return (
      <SurfacePanel
        rounded="lg"
        variant="subtle"
        shadow="soft"
        className="relative overflow-hidden p-4 pl-5 md:p-5 md:pl-6"
      >
        {cardContent}
      </SurfacePanel>
    );
  }

  return (
    <button
      type="button"
      className={surfacePanelClassName({
        className: cx(
          "relative overflow-hidden text-left",
          "cursor-pointer select-none transition-all duration-200 hover:-translate-y-px hover:border-accent/40 hover:bg-surface active:translate-y-0 dark:hover:bg-elevated",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
          "p-4 pl-5 md:p-5 md:pl-6",
        ),
        rounded: "lg",
        shadow: "soft",
        variant: "subtle",
      })}
      onClick={onClick}
    >
      {cardContent}
    </button>
  );
}

function AnalyticsChartsPlaceholder() {
  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 items-start mb-8">
        <AnalyticsChartSkeletonCard />
        <AnalyticsChartSkeletonCard />
      </div>
      <div className="grid lg:grid-cols-2 gap-8 items-start mb-8">
        <AnalyticsChartSkeletonCard />
        <AnalyticsChartSkeletonCard />
      </div>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <AnalyticsChartSkeletonCard />
        <AnalyticsChartSkeletonCard />
      </div>
    </>
  );
}

function AnalyticsChartSkeletonCard() {
  return (
    <SurfacePanel
      rounded="lg"
      shadow="soft"
      className="flex h-full flex-col p-5"
    >
      <div className="mb-6 h-8 w-48 rounded-full bg-elevated/70" />
      <div className="h-[300px] w-full rounded-lg bg-elevated/70" />
    </SurfacePanel>
  );
}

function AnalyticsChartsCallout({
  description,
  loadLabel,
  onLoadCharts,
  title,
}: AnalyticsChartsCalloutProps) {
  return (
    <SurfacePanel rounded="lg" shadow="soft" className="p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        <button
          type="button"
          className={buttonClassName({ variant: "primary" })}
          onClick={onLoadCharts}
        >
          {loadLabel}
        </button>
      </div>
    </SurfacePanel>
  );
}

type AnalyticsPageClientProps = {
  snapshots: AnalyticsSnapshotMap;
};

type AnalyticsChartClickPayload = {
  name?: string;
  payload?: {
    originalName?: string;
  };
};

function isAnalyticsChartClickPayload(
  value: unknown,
): value is AnalyticsChartClickPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AnalyticsChartClickPayload;
  return (
    candidate.payload === undefined || typeof candidate.payload === "object"
  );
}

/**
 * Serializes the active analytics drilldown state into the public API query
 * shape so the slide-over can request only the current page of entries.
 */
function buildAnalyticsDrilldownUrl(options: {
  drilldown: AnalyticsDrilldown;
  limit: number;
  offset: number;
  selectedDialect: AnalyticsDialect;
  selectedEtymology: EtymologyFilter;
}) {
  const params = new URLSearchParams({
    dialect: options.selectedDialect,
    etymology: options.selectedEtymology,
    kind: options.drilldown.kind,
    limit: String(options.limit),
    offset: String(options.offset),
    title: options.drilldown.title,
  });

  if (options.drilldown.kind === "stat") {
    params.set("statType", options.drilldown.type);
  } else {
    params.set("chartType", options.drilldown.chartType);
    params.set("originalName", options.drilldown.originalName);
  }

  return `/api/v1/analytics/drilldown?${params.toString()}`;
}

export default function AnalyticsPageClient({
  snapshots,
}: AnalyticsPageClientProps) {
  const [selectedDialect, setSelectedDialect] = useState<AnalyticsDialect>("B");
  const [selectedEtymology, setSelectedEtymology] =
    useState<EtymologyFilter>("ALL");
  const [slideOverFilter, setSlideOverFilter] =
    useState<AnalyticsDrilldown | null>(null);
  const [slideOverResults, setSlideOverResults] = useState<
    DictionaryClientEntry[]
  >([]);
  const [slideOverDictionaryLength, setSlideOverDictionaryLength] = useState(0);
  const [slideOverTotalMatches, setSlideOverTotalMatches] = useState(0);
  const [hasMoreSlideOverResults, setHasMoreSlideOverResults] = useState(false);
  const [isSlideOverLoading, setSlideOverLoading] = useState(false);
  const [isSlideOverLoadingMore, setSlideOverLoadingMore] = useState(false);
  const [slideOverFetchError, setSlideOverFetchError] =
    useState<AnalyticsDrilldownFetchError>(null);
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);
  const activeDrilldownKeyRef = useRef("");

  const { language, t } = useLanguage();
  const stats =
    snapshots[selectedDialect]?.[selectedEtymology] ?? snapshots.ALL.ALL;
  const activeFilterCount = [
    selectedDialect !== "B",
    selectedEtymology !== "ALL",
  ].filter(Boolean).length;
  const dialectOptions: FilterMenuOption[] = dialectFilterOptions.map(
    (option) => ({
      label: getDialectFilterOptionLabel(option.value, t),
      shortLabel: option.value === "ALL" ? undefined : option.value,
      value: option.value,
    }),
  );
  const etymologyOptions: FilterMenuOption[] = ETYMOLOGY_FILTERS.map(
    (etymology) => ({
      label: getEtymologyFilterLabel(etymology, t),
      value: etymology,
    }),
  );

  useEffect(() => {
    if (!slideOverFilter) {
      activeDrilldownKeyRef.current = "";
      queueMicrotask(() => {
        setSlideOverResults([]);
        setSlideOverDictionaryLength(0);
        setSlideOverTotalMatches(0);
        setHasMoreSlideOverResults(false);
        setSlideOverLoading(false);
        setSlideOverLoadingMore(false);
        setSlideOverFetchError(null);
      });
      return;
    }

    const activeSlideOverFilter = slideOverFilter;
    const controller = new AbortController();
    const requestKey = JSON.stringify({
      drilldown: activeSlideOverFilter,
      selectedDialect,
      selectedEtymology,
    });
    activeDrilldownKeyRef.current = requestKey;
    queueMicrotask(() => {
      setSlideOverFetchError(null);
      setSlideOverLoading(true);
      setSlideOverLoadingMore(false);
    });

    async function loadDrilldownPage() {
      try {
        const response = await fetch(
          buildAnalyticsDrilldownUrl({
            drilldown: activeSlideOverFilter,
            limit: ANALYTICS_DRILLDOWN_PAGE_SIZE,
            offset: 0,
            selectedDialect,
            selectedEtymology,
          }),
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Analytics drilldown is unavailable");
        }

        const page = (await response.json()) as AnalyticsDrilldownPage;
        if (
          controller.signal.aborted ||
          activeDrilldownKeyRef.current !== requestKey
        ) {
          return;
        }

        setSlideOverDictionaryLength(page.totalEntries);
        setSlideOverFetchError(null);
        setSlideOverResults(page.entries);
        setSlideOverTotalMatches(page.totalMatches);
        setHasMoreSlideOverResults(page.hasMore);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.warn("Analytics drilldown data is unavailable.", error);
        if (activeDrilldownKeyRef.current !== requestKey) {
          return;
        }

        setSlideOverDictionaryLength(0);
        setSlideOverFetchError("initial");
        setSlideOverResults([]);
        setSlideOverTotalMatches(0);
        setHasMoreSlideOverResults(false);
      } finally {
        if (
          controller.signal.aborted ||
          activeDrilldownKeyRef.current !== requestKey
        ) {
          return;
        }

        setSlideOverLoading(false);
      }
    }

    void loadDrilldownPage();

    return () => {
      controller.abort();
    };
  }, [selectedDialect, selectedEtymology, slideOverFilter]);

  const loadMoreSlideOverResults = () => {
    if (
      !slideOverFilter ||
      isSlideOverLoading ||
      isSlideOverLoadingMore ||
      !hasMoreSlideOverResults
    ) {
      return;
    }

    const activeSlideOverFilter = slideOverFilter;
    const requestKey = activeDrilldownKeyRef.current;
    setSlideOverFetchError(null);
    setSlideOverLoadingMore(true);

    async function loadNextPage() {
      try {
        const response = await fetch(
          buildAnalyticsDrilldownUrl({
            drilldown: activeSlideOverFilter,
            limit: ANALYTICS_DRILLDOWN_PAGE_SIZE,
            offset: slideOverResults.length,
            selectedDialect,
            selectedEtymology,
          }),
        );
        if (!response.ok) {
          throw new Error("Analytics drilldown page is unavailable");
        }

        const page = (await response.json()) as AnalyticsDrilldownPage;
        if (activeDrilldownKeyRef.current !== requestKey) {
          return;
        }

        setSlideOverDictionaryLength(page.totalEntries);
        setSlideOverFetchError(null);
        setSlideOverResults((previousResults) =>
          activeDrilldownKeyRef.current === requestKey
            ? [...previousResults, ...page.entries]
            : previousResults,
        );
        setSlideOverTotalMatches(page.totalMatches);
        setHasMoreSlideOverResults(page.hasMore);
      } catch (error) {
        console.warn(
          "Analytics drilldown results could not be extended.",
          error,
        );
        if (activeDrilldownKeyRef.current === requestKey) {
          setSlideOverFetchError("more");
        }
      } finally {
        if (activeDrilldownKeyRef.current === requestKey) {
          setSlideOverLoadingMore(false);
        }
      }
    }

    void loadNextPage();
  };

  const handleStatClick = (type: "total" | "unknown" | "uncertain") => {
    setSlideOverFilter(
      buildAnalyticsStatDrilldown({
        totalTitle: t("analytics.totalRoots"),
        type,
        uncertainTitle: t("analytics.meaningUncertain"),
        unknownTitle: t("analytics.meaningUnknown"),
      }),
    );
  };

  const handleChartClick = (data: unknown, type: string) => {
    if (!isAnalyticsChartClickPayload(data) || !data.payload?.originalName) {
      return;
    }
    setSlideOverFilter(
      buildAnalyticsChartDrilldown({
        originalName: data.payload.originalName,
        title: data.name ?? data.payload.originalName,
        type: type as "derivation" | "etymology" | "gender" | "pos" | "verb",
      }),
    );
  };

  const chartsContent = shouldRenderCharts ? (
    <AnalyticsChartsSection onChartClick={handleChartClick} stats={stats} />
  ) : (
    <AnalyticsChartsCallout
      description={t("analytics.mobileChartsDescription" as TranslationKey)}
      loadLabel={t("analytics.loadCharts" as TranslationKey)}
      onLoadCharts={() => setShouldRenderCharts(true)}
      title={t("analytics.visualBreakdowns" as TranslationKey)}
    />
  );
  let slideOverErrorMessage: string | null = null;
  if (slideOverFetchError === "initial") {
    slideOverErrorMessage = t(
      "analytics.drilldownUnavailable" as TranslationKey,
    );
  } else if (slideOverFetchError === "more") {
    slideOverErrorMessage = t(
      "analytics.drilldownMoreUnavailable" as TranslationKey,
    );
  }
  const retrySlideOverResults =
    slideOverFetchError === "more"
      ? loadMoreSlideOverResults
      : () => {
          if (slideOverFilter) {
            setSlideOverFilter({ ...slideOverFilter });
          }
        };

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroCopticBand,
        pageShellAccents.topRightGoldWashInset,
      ]}
    >
      <AppPageIntro
        align="left"
        spacing="compact"
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.dictionary"), href: getDictionaryPath(language) },
          { label: t("nav.analyticsShort") },
        ]}
        actions={
          <Link
            href={getDictionaryPath(language)}
            prefetch={false}
            className={buttonClassName({
              className: "w-full sm:w-auto",
              variant: "secondary",
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("analytics.back")}
          </Link>
        }
        title={t("analytics.title")}
        tone="analytics"
      />

      <div className="app-sticky-panel relative isolate mb-8 flex flex-col gap-3 md:mb-10">
        <FilterBar
          activeCount={activeFilterCount}
          clearLabel={t("dict.clearFilters")}
          defaultOpen="desktop"
          label={t("dict.filters")}
          onClear={() => {
            setSelectedDialect("B");
            setSelectedEtymology("ALL");
          }}
        >
          <FilterMenu
            active={selectedDialect !== "B"}
            closeLabel={t("dict.hideFilters")}
            label={cleanFilterLabel(t("dict.dialect"))}
            menuLabel={cleanFilterLabel(t("dict.dialect"))}
            value={selectedDialect}
            valueLabel={getSelectedFilterLabel(dialectOptions, selectedDialect)}
            options={dialectOptions}
            onChange={(value) => setSelectedDialect(value as AnalyticsDialect)}
          />

          <FilterMenu
            active={selectedEtymology !== "ALL"}
            closeLabel={t("dict.hideFilters")}
            label={t("analytics.etymologyFilterLabel")}
            menuLabel={t("analytics.etymologyFilterLabel")}
            value={selectedEtymology}
            valueLabel={getSelectedFilterLabel(
              etymologyOptions,
              selectedEtymology,
            )}
            options={etymologyOptions}
            onChange={(value) => setSelectedEtymology(value as EtymologyFilter)}
          />
        </FilterBar>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <AnalyticsStatCard
          accentClassName="bg-[rgb(var(--accent)/0.12)]"
          title={t("analytics.totalRoots")}
          value={stats.totalRoots.toLocaleString()}
          onClick={() => handleStatClick("total")}
        />
        <AnalyticsStatCard
          accentClassName="bg-[rgb(var(--warning)/0.12)]"
          title={t("analytics.meaningUnknown")}
          value={stats.unknownMeaning.toLocaleString()}
          valueClassName="text-3xl font-bold text-ink"
          onClick={() => handleStatClick("unknown")}
        />
        <AnalyticsStatCard
          accentClassName="bg-[rgb(var(--danger)/0.12)]"
          title={t("analytics.meaningUncertain")}
          value={stats.uncertainMeaning.toLocaleString()}
          valueClassName="text-3xl font-bold text-ink"
          onClick={() => handleStatClick("uncertain")}
        />
      </div>

      <div>{chartsContent}</div>

      <AnalyticsSlideOver
        isOpen={!!slideOverFilter}
        onClose={() => setSlideOverFilter(null)}
        title={slideOverFilter?.title ?? "Details"}
      >
        <DictionaryResultsSection
          dictionaryLength={slideOverDictionaryLength}
          filteredResults={slideOverResults}
          hasMoreResults={hasMoreSlideOverResults}
          loading={Boolean(slideOverFilter) && isSlideOverLoading}
          loadingMore={isSlideOverLoadingMore}
          onLoadMore={loadMoreSlideOverResults}
          onRetry={retrySlideOverResults}
          errorActionLabel={t("dict.retrySearch" as TranslationKey)}
          errorMessage={slideOverErrorMessage}
          query=""
          selectedDialect={selectedDialect}
          selectedPartOfSpeech="ALL"
          scrollContainerId="analytics-slideover-scroll"
          totalMatches={slideOverTotalMatches}
        />
      </AnalyticsSlideOver>
    </PageShell>
  );
}
