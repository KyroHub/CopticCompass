"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { pageShellAccents } from "@/components/PageShell";
import { RouteErrorState } from "@/components/RouteErrorState";
import { getDashboardCopy } from "@/features/dashboard/lib/dashboardCopy";
import { getGrammarPath } from "@/lib/locale";

/**
 * Renders the fallback error boundary for the localized learner dashboard.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);

  useEffect(() => {
    console.error("Localized dashboard route failed to render", error);
  }, [error]);

  return (
    <RouteErrorState
      title={copy.error.title}
      description={copy.error.description}
      details={copy.error.details}
      tone="brand"
      primaryHref={getGrammarPath(language)}
      primaryLabel={copy.error.primaryLabel}
      reset={reset}
      accents={[
        pageShellAccents.topLeftSkyOrb,
        pageShellAccents.bottomRightEmeraldOrb,
      ]}
    />
  );
}
