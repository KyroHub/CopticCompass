import { Clock3 } from "lucide-react";

import { cx } from "@/lib/classes";
import type { Language } from "@/lib/i18n";

import {
  SHENUTE_ICON_CLASS,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";
import {
  closeContainingDetails,
  formatSessionTimestamp,
  type SavedChatSession,
} from "./shenuteClientUtils";

type ShenuteSavedSessionsCopy = {
  closeMenu: string;
  conversationHistory: string;
  currentSession: string;
  loadingSession: string;
  loadSession: string;
  sessionDateMissing: string;
  sessionUnsavedBadge: string;
};

type ShenuteSavedSessionsPanelProps = {
  activeSessionId: string | null;
  copy: ShenuteSavedSessionsCopy;
  hasUnsavedConversationChanges: boolean;
  language: Language;
  onClose?: () => void;
  onLoadSession: (sessionId: string) => void | Promise<unknown>;
  sessionLoadingId: string | null;
  sessions: SavedChatSession[];
  showMobileHeader?: boolean;
};

export function ShenuteSavedSessionsPanel({
  activeSessionId,
  copy,
  hasUnsavedConversationChanges,
  language,
  onClose,
  onLoadSession,
  sessionLoadingId,
  sessions,
  showMobileHeader = true,
}: ShenuteSavedSessionsPanelProps) {
  const closePanel = (element: HTMLElement | null) => {
    closeContainingDetails(element);
    onClose?.();
  };

  return (
    <>
      {showMobileHeader ? (
        <ShenuteSurfaceHeader
          closeLabel={copy.closeMenu}
          className="mb-3 sm:hidden"
          onClose={(event) => closePanel(event.currentTarget)}
        >
          {copy.conversationHistory}
        </ShenuteSurfaceHeader>
      ) : null}
      <div aria-label={copy.conversationHistory} className="grid gap-2">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const formattedSessionDate = formatSessionTimestamp(
            session.updated_at,
            language,
            copy.sessionDateMissing,
          );

          return (
            <button
              key={session.id}
              type="button"
              onClick={(event) => {
                closePanel(event.currentTarget);
                void onLoadSession(session.id);
              }}
              disabled={isActive}
              className={cx(
                "flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                isActive
                  ? "border-coptic/55 bg-coptic-soft text-ink"
                  : "border-line bg-surface text-ink hover:border-accent/35 hover:bg-elevated",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-semibold">
                  {session.title || copy.conversationHistory}
                </span>
                <span
                  className={cx(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive
                      ? "bg-surface/80 text-coptic"
                      : "bg-elevated text-muted",
                  )}
                >
                  {isActive ? copy.currentSession : copy.loadSession}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Clock3 className={SHENUTE_ICON_CLASS.meta} />
                <span>{formattedSessionDate}</span>
                {isActive && hasUnsavedConversationChanges ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-strong dark:text-accent">
                    {copy.sessionUnsavedBadge}
                  </span>
                ) : null}
              </div>
              {sessionLoadingId === session.id ? (
                <p className="text-xs text-muted">{copy.loadingSession}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
