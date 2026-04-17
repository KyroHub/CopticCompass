"use client";

import { ArrowLeft, Filter } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { CompactSelect } from "@/components/CompactSelect";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import {
  type AnalyticsSnapshotMap,
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

function AnalyticsStatCard({
  accentClassName,
  title,
  value,
  valueClassName = "text-5xl font-bold text-stone-800 dark:text-stone-200",
  onClick,
}: AnalyticsStatCardProps) {
  const cardContent = (
    <>
      <div
        className={cx(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl",
          accentClassName,
        )}
      />
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <p className={valueClassName}>{value}</p>
    </>
  );

  if (!onClick) {
    return (
      <SurfacePanel
        rounded="3xl"
        variant="subtle"
        shadow="soft"
        className="relative overflow-hidden p-6"
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
          "relative overflow-hidden p-6 text-left",
          "cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        ),
        rounded: "3xl",
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
      rounded="3xl"
      shadow="soft"
      className="flex h-full flex-col p-6"
    >
      <div className="mb-6 h-8 w-48 rounded-full bg-stone-200/80 dark:bg-stone-800/80" />
      <div className="h-[300px] w-full rounded-2xl bg-stone-100/80 dark:bg-stone-900/50" />
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
    <SurfacePanel rounded="3xl" shadow="soft" className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
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
  const [requiresChartInteraction, setRequiresChartInteraction] =
    useState(false);
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);
  const activeDrilldownKeyRef = useRef("");
  const chartsSectionRef = useRef<HTMLDivElement | null>(null);

  const { language, t } = useLanguage();
  const stats =
    snapshots[selectedDialect]?.[selectedEtymology] ?? snapshots.ALL.ALL;

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia("(max-width: 767px)");

    const syncChartLoadingMode = () => {
      setRequiresChartInteraction(mobileMediaQuery.matches);
    };

    syncChartLoadingMode();
    mobileMediaQuery.addEventListener("change", syncChartLoadingMode);

    return () => {
      mobileMediaQuery.removeEventListener("change", syncChartLoadingMode);
    };
  }, []);

  useEffect(() => {
    if (requiresChartInteraction || shouldRenderCharts) {
      return;
    }

    const chartsSection = chartsSectionRef.current;
    if (!chartsSection) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = window.setTimeout(() => {
        setShouldRenderCharts(true);
      }, 200);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderCharts(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(chartsSection);

    return () => {
      observer.disconnect();
    };
  }, [requiresChartInteraction, shouldRenderCharts]);

  useEffect(() => {
    if (!slideOverFilter) {
      activeDrilldownKeyRef.current = "";
      setSlideOverResults([]);
      setSlideOverDictionaryLength(0);
      setSlideOverTotalMatches(0);
      setHasMoreSlideOverResults(false);
      setSlideOverLoading(false);
      setSlideOverLoadingMore(false);
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
    setSlideOverLoading(true);
    setSlideOverLoadingMore(false);

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
        type: type as
          | "derivation"
          | "etymology"
          | "gender"
          | "pos"
          | "relations"
          | "verb",
      }),
    );
  };

  let chartsContent = <AnalyticsChartsPlaceholder />;

  if (requiresChartInteraction) {
    chartsContent = (
      <AnalyticsChartsCallout
        description={t("analytics.mobileChartsDescription" as TranslationKey)}
        loadLabel={t("analytics.loadCharts" as TranslationKey)}
        onLoadCharts={() => setShouldRenderCharts(true)}
        title={t("analytics.visualBreakdowns" as TranslationKey)}
      />
    );
  }

  if (shouldRenderCharts) {
    chartsContent = (
      <AnalyticsChartsSection onChartClick={handleChartClick} stats={stats} />
    );
  }

  return (
    <PageShell
      className="min-h-screen flex flex-col items-center p-6 pb-20 md:p-10"
      contentClassName="w-full pt-10"
      width="standard"
      accents={[
        pageShellAccents.heroEmeraldArc,
        pageShellAccents.topRightSkyOrbInset,
      ]}
    >
      <div className="mb-10 space-y-8">
        <BreadcrumbTrail
          items={[
            { label: t("nav.home"), href: getLocalizedHomePath(language) },
            { label: t("nav.dictionary"), href: getDictionaryPath(language) },
            { label: t("nav.analytics") },
          ]}
        />

        <PageHeader
          title={t("analytics.title")}
          align="left"
          size="compact"
          tone="analytics"
        />

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Link
              href={getDictionaryPath(language)}
              prefetch={false}
              className={buttonClassName({ variant: "secondary" })}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("analytics.back")}
            </Link>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <SurfacePanel
              variant="subtle"
              shadow="soft"
              className="flex items-center space-x-3 rounded-2xl p-3 px-4 dark:border-stone-700"
            >
              <span className="inline-flex items-center whitespace-nowrap text-stone-500 dark:text-stone-400">
                <Filter className="h-4 w-4" />
              </span>
              <CompactSelect
                id="analytics-dialect-filter"
                label={t("analytics.filter")}
                name="dialect"
                value={selectedDialect}
                onChange={(e) =>
                  setSelectedDialect(e.target.value as AnalyticsDialect)
                }
                className="text-stone-700 dark:text-stone-200"
              >
                {dialectFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getDialectFilterOptionLabel(option.value, t)}
                  </option>
                ))}
              </CompactSelect>
            </SurfacePanel>

            <SurfacePanel
              variant="subtle"
              shadow="soft"
              className="flex items-center space-x-3 rounded-2xl p-3 px-4 dark:border-stone-700"
            >
              <CompactSelect
                id="analytics-etymology-filter"
                label={t("analytics.filterEtymology" as TranslationKey)}
                name="etymology"
                value={selectedEtymology}
                onChange={(e) =>
                  setSelectedEtymology(e.target.value as EtymologyFilter)
                }
                className="text-stone-700 dark:text-stone-200"
              >
                <option value="ALL">
                  {t("analytics.filterEtymologyAll" as TranslationKey)}
                </option>
                <option value="Egy">
                  {t("analytics.filterEtymologyEgy" as TranslationKey)}
                </option>
                <option value="Gr">
                  {t("analytics.filterEtymologyGr" as TranslationKey)}
                </option>
              </CompactSelect>
            </SurfacePanel>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
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
          valueClassName="text-4xl font-bold"
          onClick={() => handleStatClick("unknown")}
        />
        <AnalyticsStatCard
          accentClassName="bg-[rgb(var(--danger)/0.12)]"
          title={t("analytics.meaningUncertain")}
          value={stats.uncertainMeaning.toLocaleString()}
          valueClassName="text-4xl font-bold"
          onClick={() => handleStatClick("uncertain")}
        />
      </div>

      <div ref={chartsSectionRef}>{chartsContent}</div>

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
