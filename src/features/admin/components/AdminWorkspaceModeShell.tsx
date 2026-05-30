"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, type ReactNode } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  adminModeCardClassName,
  adminStickyPanelClassName,
} from "@/features/admin/components/adminControlStyles";
import type { AdminWorkspaceOverview } from "@/features/admin/lib/dashboardData";
import { usePersistentEnumState } from "@/features/admin/lib/uiState";
import {
  ADMIN_WORKSPACE_MODES,
  type AdminWorkspaceMode,
} from "@/features/admin/lib/workspaceMode";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

const workspaceModeShellCopy = {
  en: {
    description:
      "Switch between active review work, outbound communications, and system visibility without carrying the whole admin page with you.",
    labels: {
      communications: "Communications",
      review: "Review",
      system: "System",
    },
  },
  nl: {
    description:
      "Schakel tussen actieve beoordelingen, uitgaande communicatie en systeemoverzicht zonder de hele adminpagina mee te nemen.",
    labels: {
      communications: "Communicatie",
      review: "Beoordeling",
      system: "Systeem",
    },
  },
} as const satisfies Record<
  Language,
  {
    description: string;
    labels: Record<AdminWorkspaceMode, string>;
  }
>;

function formatAdminCount(value: number, language: Language) {
  return value.toLocaleString(language === "nl" ? "nl-BE" : "en-US");
}

function formatCountLabel(
  value: number,
  singular: string,
  plural: string,
  language: Language,
) {
  return `${formatAdminCount(value, language)} ${
    value === 1 ? singular : plural
  }`;
}

function getModeSummaryCount(
  mode: AdminWorkspaceMode,
  overview: AdminWorkspaceOverview,
) {
  switch (mode) {
    case "review":
      return (
        overview.pendingSubmissionCount +
        overview.openContactMessageCount +
        overview.openEntryReportCount
      );
    case "communications":
      return overview.actionableReleaseCount + overview.audienceSyncErrorCount;
    case "system":
      return overview.failedNotificationCount;
    default:
      return 0;
  }
}

function getModeLabel(mode: AdminWorkspaceMode, language: Language) {
  return workspaceModeShellCopy[language].labels[mode];
}

function getModeDescription(
  mode: AdminWorkspaceMode,
  overview: AdminWorkspaceOverview,
  language: Language,
) {
  if (language === "nl") {
    switch (mode) {
      case "review":
        return [
          formatCountLabel(
            overview.pendingSubmissionCount,
            "inzending",
            "inzendingen",
            language,
          ),
          formatCountLabel(
            overview.openContactMessageCount,
            "inboxgesprek",
            "inboxgesprekken",
            language,
          ),
          formatCountLabel(
            overview.openEntryReportCount,
            "rapport",
            "rapporten",
            language,
          ),
        ].join(", ");
      case "communications":
        return [
          formatCountLabel(
            overview.actionableReleaseCount,
            "actieve release",
            "actieve releases",
            language,
          ),
          formatCountLabel(
            overview.audienceSyncErrorCount,
            "synchronisatieprobleem",
            "synchronisatieproblemen",
            language,
          ),
        ].join(", ");
      case "system":
        return `${formatCountLabel(
          overview.failedNotificationCount,
          "mislukte melding",
          "mislukte meldingen",
          language,
        )} te controleren`;
      default:
        return "";
    }
  }

  switch (mode) {
    case "review":
      return `${formatCountLabel(
        overview.pendingSubmissionCount,
        "submission",
        "submissions",
        language,
      )}, ${formatCountLabel(
        overview.openContactMessageCount,
        "inbox thread",
        "inbox threads",
        language,
      )}, ${formatCountLabel(
        overview.openEntryReportCount,
        "report",
        "reports",
        language,
      )}`;
    case "communications":
      return `${formatCountLabel(
        overview.actionableReleaseCount,
        "active release",
        "active releases",
        language,
      )}, ${formatCountLabel(
        overview.audienceSyncErrorCount,
        "sync issue",
        "sync issues",
        language,
      )}`;
    case "system":
      return `${formatCountLabel(
        overview.failedNotificationCount,
        "failed notification",
        "failed notifications",
        language,
      )} to inspect`;
    default:
      return "";
  }
}

export function AdminWorkspaceModeShell({
  children,
  mode,
  overview,
}: {
  children: ReactNode;
  mode: AdminWorkspaceMode;
  overview: AdminWorkspaceOverview;
}) {
  const { language } = useLanguage();
  const copy = workspaceModeShellCopy[language];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [persistedMode, setPersistedMode] =
    usePersistentEnumState<AdminWorkspaceMode>(
      "admin-workspace:mode",
      "review",
      ADMIN_WORKSPACE_MODES,
    );
  const hasExplicitMode = searchParams.get("mode") !== null;

  useEffect(() => {
    if (hasExplicitMode || persistedMode === mode) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);

    if (persistedMode === "review") {
      nextParams.delete("mode");
    } else {
      nextParams.set("mode", persistedMode);
    }

    const nextQuery = nextParams.toString();
    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }, [
    hasExplicitMode,
    mode,
    pathname,
    persistedMode,
    router,
    searchParamsString,
  ]);

  function handleModeChange(nextMode: AdminWorkspaceMode) {
    if (nextMode === mode) {
      setPersistedMode(nextMode);
      return;
    }

    setPersistedMode(nextMode);

    const nextParams = new URLSearchParams(searchParamsString);
    if (nextMode === "review") {
      nextParams.delete("mode");
    } else {
      nextParams.set("mode", nextMode);
    }

    const nextQuery = nextParams.toString();
    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div className="space-y-6">
      <nav className={adminStickyPanelClassName()}>
        <p className="mb-3 text-xs leading-5 text-muted">{copy.description}</p>

        <div className="grid gap-2 md:grid-cols-3">
          {ADMIN_WORKSPACE_MODES.map((nextMode) => {
            const isActive = nextMode === mode;
            const summaryCount = getModeSummaryCount(nextMode, overview);

            return (
              <button
                key={nextMode}
                type="button"
                onClick={() => handleModeChange(nextMode)}
                aria-pressed={isActive}
                className={adminModeCardClassName({ active: isActive })}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cx(
                      "text-sm font-semibold",
                      isActive ? "text-ink" : "text-ink",
                    )}
                  >
                    {getModeLabel(nextMode, language)}
                  </span>
                  <span
                    className={cx(
                      "text-xs font-semibold",
                      isActive
                        ? "text-accent-strong dark:text-accent"
                        : "text-muted",
                    )}
                  >
                    {summaryCount}
                  </span>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-muted">
                  {getModeDescription(nextMode, overview, language)}
                </p>
              </button>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
