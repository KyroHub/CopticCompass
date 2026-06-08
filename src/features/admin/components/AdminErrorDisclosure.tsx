import { ChevronDown } from "lucide-react";

import { StatusNotice } from "@/components/StatusNotice";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import type { ReactNode } from "react";

const adminErrorDisclosureCopy = {
  en: {
    hideDetails: "Hide technical details",
    showDetails: "Show technical details",
    technicalDetails: "Technical details",
  },
  nl: {
    hideDetails: "Technische details verbergen",
    showDetails: "Technische details tonen",
    technicalDetails: "Technische details",
  },
} as const;

function formatTechnicalDetails(details: unknown) {
  if (details === null || typeof details === "undefined") {
    return null;
  }

  if (typeof details === "string") {
    const trimmedDetails = details.trim();
    return trimmedDetails.length > 0 ? trimmedDetails : null;
  }

  if (details instanceof Error) {
    return [details.name, details.message, details.stack]
      .filter(Boolean)
      .join("\n");
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

type AdminErrorDisclosureProps = {
  className?: string;
  language: Language;
  message: ReactNode;
  technicalDetails?: unknown;
  title?: ReactNode;
  tone?: "error" | "warning";
};

export function AdminTechnicalDetails({
  details,
  language,
}: {
  details: unknown;
  language: Language;
}) {
  const copy = adminErrorDisclosureCopy[language];
  const formattedDetails = formatTechnicalDetails(details);

  if (!formattedDetails) {
    return null;
  }

  return (
    <details
      className={surfacePanelClassName({
        shadow: "soft",
        className: "group mt-4 p-3 border-current/20",
      })}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] [&::-webkit-details-marker]:hidden">
        <span>{copy.technicalDetails}</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="group-open:hidden">{copy.showDetails}</span>
          <span className="hidden group-open:inline">{copy.hideDetails}</span>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
          />
        </span>
      </summary>
      <pre
        className={cx(
          "mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-elevated p-3",
          "font-mono text-xs font-normal leading-5 text-muted",
        )}
      >
        {formattedDetails}
      </pre>
    </details>
  );
}

export function AdminErrorDisclosure({
  className,
  language,
  message,
  technicalDetails,
  title,
  tone = "error",
}: AdminErrorDisclosureProps) {
  return (
    <StatusNotice align="left" className={className} size="compact" tone={tone}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{message}</div>

      <AdminTechnicalDetails details={technicalDetails} language={language} />
    </StatusNotice>
  );
}
