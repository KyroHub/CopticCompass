"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { pageShellAccents } from "@/components/PageShell";
import { RouteErrorState } from "@/components/RouteErrorState";
import { AdminTechnicalDetails } from "@/features/admin/components/AdminErrorDisclosure";
import { adminRouteCopy } from "@/features/admin/lib/adminRouteCopy";
import { getDashboardPath } from "@/lib/locale";

/**
 * Renders the fallback error boundary for the private instructor workspace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useLanguage();
  const copy = adminRouteCopy[language];

  useEffect(() => {
    console.error("Admin route failed to render", error);
  }, [error]);

  return (
    <RouteErrorState
      title={copy.errorTitle}
      description={copy.errorDescription}
      details={
        <>
          <p>{copy.errorDetails}</p>
          <AdminTechnicalDetails
            details={{
              digest: error.digest,
              message: error.message,
              name: error.name,
            }}
            language={language}
          />
        </>
      }
      noticeTitle={copy.errorNoticeTitle}
      tone="brand"
      primaryHref={getDashboardPath(language)}
      primaryLabel={copy.errorPrimaryLabel}
      reset={reset}
      retryLabel={copy.errorRetryLabel}
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    />
  );
}
