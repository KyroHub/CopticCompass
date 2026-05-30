"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { cx } from "@/lib/classes";

import {
  formatEntryReportStatus,
  type EntryReportStatus,
} from "../lib/entryActions";

type EntryReportStatusBadgeProps = {
  className?: string;
  status: EntryReportStatus;
};

const STATUS_CLASSES: Record<EntryReportStatus, string> = {
  open: "border-warning/25 bg-warning/10 text-warning",
  reviewed:
    "border-accent/25 bg-accent-soft text-accent-strong dark:text-accent",
  resolved: "border-coptic/20 bg-coptic-soft text-coptic",
  dismissed: "border-line bg-elevated text-muted",
};

export function EntryReportStatusBadge({
  className,
  status,
}: EntryReportStatusBadgeProps) {
  const { language } = useLanguage();

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {formatEntryReportStatus(status, language)}
    </span>
  );
}
