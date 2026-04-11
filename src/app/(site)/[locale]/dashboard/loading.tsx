"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pageShellAccents } from "@/components/PageShell";
import { RouteLoadingState } from "@/components/RouteLoadingState";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getDashboardCopy } from "@/features/dashboard/lib/dashboardCopy";

function LoadingBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-stone-200/80 dark:bg-stone-800/80 ${className}`}
    />
  );
}

/**
 * Renders the loading skeleton for the localized learner dashboard.
 */
export default function Loading() {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);

  return (
    <RouteLoadingState
      title={copy.loading.title}
      description={copy.loading.description}
      tone="brand"
      panelClassName="max-w-5xl"
      accents={[
        pageShellAccents.topLeftSkyOrb,
        pageShellAccents.bottomRightEmeraldOrb,
      ]}
      skeleton={
        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <LoadingBlock className="h-5 w-32" />
              <LoadingBlock className="h-12 w-72 max-w-full" />
              <LoadingBlock className="h-4 w-80 max-w-full" />
            </div>
            <LoadingBlock className="h-11 w-32" />
          </div>

          <SurfacePanel
            rounded="3xl"
            className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8"
          >
            <div className="flex-1 space-y-3">
              <LoadingBlock className="h-8 w-56 max-w-full" />
              <LoadingBlock className="h-4 w-64 max-w-full" />
            </div>
            <LoadingBlock className="h-16 w-16 rounded-full" />
          </SurfacePanel>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <SurfacePanel rounded="3xl" className="space-y-4 p-6 md:p-8">
              <LoadingBlock className="h-6 w-40" />
              <LoadingBlock className="h-24 w-full" />
              <LoadingBlock className="h-24 w-full" />
            </SurfacePanel>

            <SurfacePanel
              rounded="3xl"
              variant="subtle"
              className="space-y-4 p-6 md:p-8"
            >
              <LoadingBlock className="h-6 w-36" />
              <LoadingBlock className="h-16 w-full" />
              <LoadingBlock className="h-16 w-full" />
              <LoadingBlock className="h-16 w-full" />
            </SurfacePanel>
          </div>

          <SurfacePanel rounded="3xl" className="space-y-5 p-6 md:p-8">
            <LoadingBlock className="h-7 w-52" />
            <LoadingBlock className="h-28 w-full" />
            <LoadingBlock className="h-28 w-full" />
          </SurfacePanel>
        </div>
      }
    />
  );
}
