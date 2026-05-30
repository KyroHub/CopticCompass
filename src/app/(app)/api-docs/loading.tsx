"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pageShellAccents } from "@/components/PageShell";
import { RouteLoadingState } from "@/components/RouteLoadingState";
import { SkeletonBlock as LoadingBlock } from "@/components/SkeletonBlock";
import { SurfacePanel } from "@/components/SurfacePanel";

const API_DOCS_LOADING_COPY = {
  en: {
    description:
      "Loading the OpenAPI explorer, developer shortcuts, and dataset notes.",
    title: "Preparing the API docs",
  },
  nl: {
    description:
      "De OpenAPI-verkenner, ontwikkelaarssnelkoppelingen en datasetnotities worden geladen.",
    title: "API-docs voorbereiden",
  },
} as const;

/**
 * Renders the loading skeleton for the API documentation page.
 */
export default function Loading() {
  const { language } = useLanguage();
  const copy = API_DOCS_LOADING_COPY[language];

  return (
    <RouteLoadingState
      title={copy.title}
      description={copy.description}
      tone="coptic"
      accents={[
        pageShellAccents.topRightGoldWash,
        pageShellAccents.bottomLeftCopticWashSoft,
      ]}
      skeleton={
        <div className="space-y-6">
          <SurfacePanel rounded="lg" className="space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap gap-3">
              <LoadingBlock className="h-11 w-40" />
              <LoadingBlock className="h-11 w-36" />
              <LoadingBlock className="h-11 w-32" />
              <LoadingBlock className="h-11 w-36" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((itemIndex) => (
                <LoadingBlock key={itemIndex} className="h-14 w-full" />
              ))}
            </div>
            <LoadingBlock className="h-4 w-full" />
            <LoadingBlock className="h-4 w-4/5" />
          </SurfacePanel>

          <SurfacePanel rounded="lg" className="space-y-4 p-6 md:p-8">
            <LoadingBlock className="h-8 w-56" />
            <LoadingBlock className="h-[32rem] w-full" />
          </SurfacePanel>
        </div>
      }
    />
  );
}
