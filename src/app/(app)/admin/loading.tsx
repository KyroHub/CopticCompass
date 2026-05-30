"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pageShellAccents } from "@/components/PageShell";
import { RouteLoadingState } from "@/components/RouteLoadingState";
import { SkeletonBlock as LoadingBlock } from "@/components/SkeletonBlock";
import { SurfacePanel } from "@/components/SurfacePanel";
import { adminRouteCopy } from "@/features/admin/lib/adminRouteCopy";

/**
 * Renders the loading skeleton for the private instructor workspace.
 */
export default function Loading() {
  const { language } = useLanguage();
  const copy = adminRouteCopy[language];

  return (
    <RouteLoadingState
      title={copy.loadingTitle}
      description={copy.loadingDescription}
      tone="brand"
      panelClassName="max-w-5xl"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
      skeleton={
        <div className="space-y-6">
          <div className="space-y-3">
            <LoadingBlock className="h-5 w-40" />
            <LoadingBlock className="h-12 w-80 max-w-full" />
            <LoadingBlock className="h-4 w-[34rem] max-w-full" />
          </div>

          {[0, 1].map((cardIndex) => (
            <SurfacePanel
              key={cardIndex}
              as="section"
              rounded="lg"
              className="space-y-5 p-6 md:p-8"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <LoadingBlock className="h-7 w-56 max-w-full" />
                  <LoadingBlock className="h-4 w-44 max-w-full" />
                </div>
                <LoadingBlock className="h-9 w-28" />
              </div>
              <LoadingBlock className="h-24 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <LoadingBlock className="h-12 w-full" />
                <LoadingBlock className="h-12 w-full" />
              </div>
              <LoadingBlock className="h-36 w-full" />
            </SurfacePanel>
          ))}
        </div>
      }
    />
  );
}
