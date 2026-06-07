import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import {
  formatAdminRagLogTimestamp,
  formatAdminRagNumber,
  type AdminRagLogEntry,
} from "@/lib/admin/ragDashboard";
import type { Language } from "@/types/i18n";

import type { AdminRagIngestionCopy } from "./adminRagIngestionCopy";

export function AdminRagLogsPanel({
  bulkJsonPending,
  copy,
  dashboardLogs,
  isPending,
  language,
}: {
  bulkJsonPending: boolean;
  copy: AdminRagIngestionCopy;
  dashboardLogs: AdminRagLogEntry[];
  isPending: boolean;
  language: Language;
}) {
  return (
    <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.logs}
        </p>
        <p className="text-[11px] text-muted">
          {formatAdminRagNumber(dashboardLogs.length, language)} {copy.entries}
        </p>
      </div>

      {dashboardLogs.length === 0 ? (
        <SurfacePanel shadow="soft" className="px-4 py-3 text-xs text-muted">
          {isPending || bulkJsonPending ? copy.logsRunning : copy.logsEmpty}
        </SurfacePanel>
      ) : (
        <div
          className={surfacePanelClassName({
            shadow: "soft",
            className:
              "max-h-64 space-y-1 overflow-y-auto p-3 font-mono text-[11px]",
          })}
          aria-live="polite"
        >
          {dashboardLogs.map((log, index) => (
            <p
              key={`${log.timestamp}-${index}`}
              className="leading-relaxed text-muted"
            >
              {log.line ? (
                <span>{log.line}</span>
              ) : (
                <>
                  <span className="text-accent-strong dark:text-accent">
                    [{formatAdminRagLogTimestamp(log.timestamp, language)}]
                  </span>{" "}
                  {log.sourcePath ? (
                    <span className="text-coptic">{log.sourcePath} </span>
                  ) : null}
                  <span>{log.message}</span>
                </>
              )}
            </p>
          ))}
        </div>
      )}
    </SurfacePanel>
  );
}
