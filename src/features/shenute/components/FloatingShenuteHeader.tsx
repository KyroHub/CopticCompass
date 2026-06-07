import { Download, ExternalLink, Minus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { iconButtonClassName as sharedIconButtonClassName } from "@/components/Button";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import type { ChatMessageLike } from "@/features/shenute/shared";

import { FLOATING_SHENUTE_ICON_BUTTON_CLASS } from "./floatingShenuteClasses";

type FloatingShenuteHeaderCopy = {
  contextAware: string;
  fullWorkspace: string;
  fullWorkspaceHint: string;
  minimize: string;
  saveHistory: string;
};

type FloatingShenuteHeaderProps = {
  copy: FloatingShenuteHeaderCopy;
  onMinimize: () => void;
  onOpenWorkspace: () => void;
  onSaveHistory: () => void;
  pageContextLabel: string;
  saveStatus: string | null;
  typedMessages: ChatMessageLike[];
};

export function FloatingShenuteHeader({
  copy,
  onMinimize,
  onOpenWorkspace,
  onSaveHistory,
  pageContextLabel,
  saveStatus,
  typedMessages,
}: FloatingShenuteHeaderProps) {
  const iconButtonClassName = sharedIconButtonClassName({
    className: FLOATING_SHENUTE_ICON_BUTTON_CLASS,
  });

  return (
    <header
      className={surfacePanelClassName({
        className: "border-b border-line/80 px-4 py-3",
      })}
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coptic-soft text-coptic shadow-sm">
            <span className="font-coptic leading-none">Ϣ</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              Shenute AI
            </p>
            <Badge
              tone="coptic"
              size="xs"
              className="mt-1 max-w-full truncate px-2 py-0.5 text-[11px]"
            >
              {copy.contextAware}: {pageContextLabel}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {saveStatus ? (
            <span className="hidden max-w-24 truncate text-[11px] font-medium text-coptic sm:inline">
              {saveStatus}
            </span>
          ) : null}
          <Link
            href="/shenute"
            aria-label={copy.fullWorkspace}
            title={copy.fullWorkspaceHint}
            onClick={onOpenWorkspace}
            className={iconButtonClassName}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={copy.saveHistory}
            title={copy.saveHistory}
            onClick={onSaveHistory}
            disabled={typedMessages.length === 0}
            className={iconButtonClassName}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={copy.minimize}
            title={copy.minimize}
            onClick={onMinimize}
            className={iconButtonClassName}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
