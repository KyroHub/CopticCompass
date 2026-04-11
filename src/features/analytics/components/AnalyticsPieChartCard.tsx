"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

import { SurfacePanel } from "@/components/SurfacePanel";
import { antinoou } from "@/lib/fonts";

import type { CSSProperties, ReactNode } from "react";

const CHART_LEGEND_STYLE = {
  fontFamily: `${antinoou.style.fontFamily}, serif`,
  fontSize: "12px",
  paddingTop: "20px",
} satisfies CSSProperties;

type AnalyticsPieChartCardProps = {
  chartCellStroke: string;
  data: Array<Record<string, unknown>>;
  footer?: ReactNode;
  isThemeReady: boolean;
  onSliceClick: (data: unknown) => void;
  palette: string[];
  title: ReactNode;
  tooltipContentStyle: CSSProperties;
  tooltipItemStyle: CSSProperties;
};

export function AnalyticsPieChartCard({
  chartCellStroke,
  data,
  footer,
  isThemeReady,
  onSliceClick,
  palette,
  title,
  tooltipContentStyle,
  tooltipItemStyle,
}: AnalyticsPieChartCardProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    if (!chartContainer) {
      return;
    }

    const updateChartSize = () => {
      setChartSize({
        height: chartContainer.clientHeight,
        width: chartContainer.clientWidth,
      });
    };

    updateChartSize();

    const resizeObserver = new ResizeObserver(() => {
      updateChartSize();
    });
    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const hasMeasuredChartSize = chartSize.width > 0 && chartSize.height > 0;
  const chartPlaceholder = (
    <div className="h-full w-full rounded-2xl bg-stone-100/70 dark:bg-stone-900/40" />
  );

  return (
    <SurfacePanel
      rounded="3xl"
      shadow="soft"
      className="flex h-full flex-col p-6"
    >
      <h2 className="mb-6 border-b border-stone-200 pb-3 text-2xl font-bold text-stone-800 dark:border-stone-800 dark:text-stone-300">
        {title}
      </h2>

      <div ref={chartContainerRef} className="mb-6 h-[300px] min-w-0 w-full">
        {isThemeReady && hasMeasuredChartSize ? (
          <PieChart width={chartSize.width} height={chartSize.height}>
            <Tooltip
              contentStyle={{
                ...tooltipContentStyle,
                fontFamily: `${antinoou.style.fontFamily}, serif`,
              }}
              itemStyle={tooltipItemStyle}
            />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              isAnimationActive={false}
              onClick={onSliceClick}
              className="cursor-pointer"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={palette[index % palette.length]}
                  stroke={chartCellStroke}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Pie>
          </PieChart>
        ) : (
          chartPlaceholder
        )}
      </div>

      {footer}
    </SurfacePanel>
  );
}
