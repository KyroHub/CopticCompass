import { ArrowRight, BookOpenCheck, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";
import type { Language } from "@/lib/i18n";
import { getContributorsPath } from "@/lib/locale";

import {
  SHENUTE_ICON_CLASS,
  SHENUTE_MENU_ACTION_BUTTON_CLASS,
  ShenuteActionButton,
  ShenuteActionGroupLabel,
} from "./ShenuteClientPrimitives";
import { closeContainingDetails } from "./shenuteClientUtils";

type ShenuteConversationActionsCopy = {
  clearConversation: string;
  creditsShort: string;
  dangerZone: string;
};

type ShenuteConversationActionsPanelProps = {
  activeSessionId: string | null;
  copy: ShenuteConversationActionsCopy;
  hasUnsavedConversationChanges: boolean;
  isHistorySaving: boolean;
  isLoading: boolean;
  language: Language;
  onClearConversation: () => void | Promise<unknown>;
  onClose?: () => void;
  onSaveHistory: () => void;
  saveButtonLabel: string;
  typedMessagesCount: number;
};

export function ShenuteConversationActionsPanel({
  activeSessionId,
  copy,
  hasUnsavedConversationChanges,
  isHistorySaving,
  isLoading,
  language,
  onClearConversation,
  onClose,
  onSaveHistory,
  saveButtonLabel,
  typedMessagesCount,
}: ShenuteConversationActionsPanelProps) {
  const closePanel = (element: HTMLElement | null) => {
    closeContainingDetails(element);
    onClose?.();
  };

  return (
    <>
      <ShenuteActionButton
        onClick={(event) => {
          closePanel(event.currentTarget);
          onSaveHistory();
        }}
        disabled={
          typedMessagesCount === 0 ||
          isLoading ||
          isHistorySaving ||
          !hasUnsavedConversationChanges
        }
        icon={<Save className={SHENUTE_ICON_CLASS.action} />}
      >
        {saveButtonLabel}
      </ShenuteActionButton>
      <Link
        href={`${getContributorsPath(language)}#shenute-ai-credits`}
        onClick={(event) => closePanel(event.currentTarget)}
        className={buttonClassName({
          fullWidth: true,
          className: cx("mt-2", SHENUTE_MENU_ACTION_BUTTON_CLASS),
          size: "sm",
          variant: "secondary",
        })}
      >
        <BookOpenCheck className={SHENUTE_ICON_CLASS.action} />
        {copy.creditsShort}
        <ArrowRight className={cx("ml-auto", SHENUTE_ICON_CLASS.action)} />
      </Link>
      <div className="my-2 border-t border-line pt-2">
        <ShenuteActionGroupLabel className="mb-2">
          {copy.dangerZone}
        </ShenuteActionGroupLabel>
        <ShenuteActionButton
          onClick={(event) => {
            closePanel(event.currentTarget);
            void onClearConversation();
          }}
          disabled={
            isLoading ||
            isHistorySaving ||
            (!activeSessionId && typedMessagesCount === 0)
          }
          className="border-danger/25 text-danger hover:bg-danger/5 dark:hover:bg-danger/10"
          icon={<Trash2 className={SHENUTE_ICON_CLASS.action} />}
        >
          {copy.clearConversation}
        </ShenuteActionButton>
      </div>
    </>
  );
}
