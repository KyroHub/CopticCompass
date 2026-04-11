"use client";

import { useMemo } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import type { AnalyticsSnapshot } from "@/features/analytics/lib/analytics";
import { useAnalyticsThemeColors } from "@/features/analytics/lib/useAnalyticsThemeColors";
import type { TranslationKey } from "@/lib/i18n";

import { AnalyticsPieChartCard } from "./AnalyticsPieChartCard";

type AnalyticsChartType =
  | "derivation"
  | "etymology"
  | "gender"
  | "pos"
  | "relations"
  | "verb";

type AnalyticsChartsSectionProps = {
  onChartClick: (data: unknown, type: AnalyticsChartType) => void;
  stats: AnalyticsSnapshot;
};

/**
 * Builds the localized chart payloads for the analytics dashboard after the
 * user scrolls near the chart section, keeping the initial page shell lighter.
 */
export function AnalyticsChartsSection({
  onChartClick,
  stats,
}: AnalyticsChartsSectionProps) {
  const { colors, isThemeReady } = useAnalyticsThemeColors();
  const { t } = useLanguage();

  const posChartData = useMemo(
    () =>
      stats.posChartData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name:
          t(`dict.${datum.name.toLowerCase()}` as TranslationKey) ?? datum.name,
      })),
    [stats.posChartData, t],
  );
  const genderChartData = useMemo(
    () =>
      stats.genderChartData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name: datum.name,
      })),
    [stats.genderChartData],
  );
  const etymologyChartData = useMemo(
    () =>
      stats.etymologyChartData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name: t(datum.name as TranslationKey),
      })),
    [stats.etymologyChartData, t],
  );
  const derivationChartData = useMemo(
    () =>
      stats.derivationalMorphologyData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name: t(datum.name as TranslationKey),
      })),
    [stats.derivationalMorphologyData, t],
  );
  const verbChartData = useMemo(
    () =>
      stats.verbCompletenessData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name: t(datum.name as TranslationKey),
      })),
    [stats.verbCompletenessData, t],
  );
  const relationChartData = useMemo(
    () =>
      stats.relationTypeData.map((datum) => ({
        ...datum,
        originalName: datum.name,
        name: t(datum.name as TranslationKey),
      })),
    [stats.relationTypeData, t],
  );

  return (
    <>
      <div className="mb-8 grid items-start gap-8 lg:grid-cols-2">
        <AnalyticsPieChartCard
          title={t("analytics.posBreakdown")}
          data={posChartData}
          palette={colors.palettes.pos}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "pos")}
        />

        <AnalyticsPieChartCard
          title={
            <>
              {t("analytics.nounGenders")}{" "}
              <span className="text-lg font-normal text-stone-500">
                ({stats.totalNouns} {t("analytics.total")})
              </span>
            </>
          }
          footer={
            <div className="mt-auto rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 shadow-sm dark:border-stone-800/50 dark:bg-stone-950/40">
              <div className="mb-2 flex items-center justify-between text-sm text-[rgb(var(--accent-strong))]">
                <span>{t("analytics.verbalNouns")}</span>
                <span className="font-bold">{stats.verbalNouns}</span>
              </div>
              <div className="my-2 h-px w-full bg-stone-300 dark:bg-stone-800" />
              <div className="flex justify-between font-bold text-stone-700 dark:text-stone-300">
                <span>{t("analytics.totalMasculine")}</span>
                <span>{stats.totalMasculine}</span>
              </div>
            </div>
          }
          data={genderChartData}
          palette={colors.palettes.gender}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "gender")}
        />
      </div>

      <div className="mb-8 grid items-start gap-8 lg:grid-cols-2">
        <AnalyticsPieChartCard
          title={t("analytics.etymology" as TranslationKey)}
          data={etymologyChartData}
          palette={colors.palettes.etymology}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "etymology")}
        />

        <AnalyticsPieChartCard
          title={t("analytics.derivation" as TranslationKey)}
          data={derivationChartData}
          palette={colors.palettes.derivation}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "derivation")}
        />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <AnalyticsPieChartCard
          title={t("analytics.verbCompleteness" as TranslationKey)}
          data={verbChartData}
          palette={colors.palettes.verb}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "verb")}
        />

        <AnalyticsPieChartCard
          title={t("analytics.relations" as TranslationKey)}
          data={relationChartData}
          palette={colors.palettes.relations}
          chartCellStroke={colors.chartCellStroke}
          isThemeReady={isThemeReady}
          tooltipContentStyle={colors.tooltipContentStyle}
          tooltipItemStyle={colors.tooltipItemStyle}
          onSliceClick={(data) => onChartClick(data, "relations")}
        />
      </div>
    </>
  );
}
