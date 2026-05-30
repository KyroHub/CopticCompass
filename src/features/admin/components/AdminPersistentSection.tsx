"use client";

import { ChevronDown } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { usePersistentDisclosureState } from "@/features/admin/lib/uiState";

const adminPersistentSectionCopy = {
  en: {
    collapse: "Collapse",
    open: "Open",
  },
  nl: {
    collapse: "Inklappen",
    open: "Openen",
  },
} as const;

export function AdminPersistentSection({
  defaultOpen = false,
  children,
  description,
  id,
  summary,
  title,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
  description: string;
  id: string;
  summary: string;
  title: string;
}) {
  const { language } = useLanguage();
  const copy = adminPersistentSectionCopy[language];
  const [isOpen, setIsOpen] = usePersistentDisclosureState(
    `admin-section:${id}`,
    defaultOpen,
  );

  return (
    <details
      id={id}
      className={surfacePanelClassName({
        rounded: "lg",
        variant: "elevated",
        className: "group app-anchor-section overflow-hidden",
      })}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden md:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {title}
            </h2>
            <span className="text-xs font-semibold text-muted">{summary}</span>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm font-medium text-muted">
          <span className="group-open:hidden">{copy.open}</span>
          <span className="hidden group-open:inline">{copy.collapse}</span>
          <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-line p-5 md:p-6">{children}</div>
    </details>
  );
}
