import { Clock3 } from "lucide-react";

import { buttonClassName } from "@/components/Button";

import {
  SHENUTE_ICON_CLASS,
  SHENUTE_UTILITY_BADGE_CLASS,
  SHENUTE_UTILITY_SUMMARY_CLASS,
  ShenuteSurfaceHeading,
} from "./ShenuteClientPrimitives";
import { ShenuteSavedSessionsPanel } from "./ShenuteSavedSessionsPanel";

import type { SavedChatSession } from "./shenuteClientUtils";
import type { ShenuteCopy } from "./shenuteCopy";
import type { SyntheticEvent } from "react";

type ShenuteSessionSidebarProps = {
  activeSessionId: string | null;
  copy: ShenuteCopy;
  hasUnsavedConversationChanges: boolean;
  language: "en" | "nl";
  onLoadSession: (
    sessionId: string,
  ) => Promise<{ sessionId?: string; success: boolean }>;
  onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  sessionCountLabel: string;
  sessionLoadingId: string | null;
  sessionStatus: string | null;
  sessions: SavedChatSession[];
};

export function ShenuteSessionSidebar({
  activeSessionId,
  copy,
  hasUnsavedConversationChanges,
  language,
  onLoadSession,
  onToggle,
  sessionCountLabel,
  sessionLoadingId,
  sessionStatus,
  sessions,
}: ShenuteSessionSidebarProps) {
  return (
    <details
      data-shenute-utility-details
      className="group relative hidden shrink-0 sm:block"
      onToggle={onToggle}
    >
      <summary
        aria-label={`${copy.conversationHistory}: ${sessionCountLabel}`}
        title={copy.conversationHistory}
        className={buttonClassName({
          size: "sm",
          variant: "secondary",
          className: `${SHENUTE_UTILITY_SUMMARY_CLASS} relative`,
        })}
      >
        <Clock3 className={SHENUTE_ICON_CLASS.action} />
        <span className={SHENUTE_UTILITY_BADGE_CLASS}>{sessions.length}</span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-3 shadow-panel group-open:block">
        <div className="mb-3 flex items-center justify-between gap-3">
          <ShenuteSurfaceHeading>
            {copy.conversationHistory}
          </ShenuteSurfaceHeading>
          <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-muted">
            {sessionCountLabel}
          </span>
        </div>
        {sessionStatus ? (
          <p className="mb-2 truncate text-xs text-muted">{sessionStatus}</p>
        ) : null}
        <div className="max-h-[min(24rem,calc(100dvh-14rem))] overflow-y-auto pr-1">
          <ShenuteSavedSessionsPanel
            activeSessionId={activeSessionId}
            copy={copy}
            hasUnsavedConversationChanges={hasUnsavedConversationChanges}
            language={language}
            onLoadSession={onLoadSession}
            sessionLoadingId={sessionLoadingId}
            sessions={sessions}
            showMobileHeader={false}
          />
        </div>
      </div>
    </details>
  );
}
