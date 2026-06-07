import {
  Copy,
  CornerDownRight,
  MoreHorizontal,
  RotateCcw,
  Square,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Volume2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AuthGateInlinePrompt } from "@/components/AuthGateNotice";
import { buttonClassName } from "@/components/Button";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  findPreviousUserMessage,
  getMessageText,
  type ChatMessageLike,
  type ShenuteProvider,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";

import {
  SHENUTE_DIALOG_BACKDROP_CLASS,
  SHENUTE_ICON_CLASS,
  SHENUTE_INLINE_ACTION_BUTTON_CLASS,
  SHENUTE_MENU_ACTION_BUTTON_CLASS,
  SHENUTE_SHEET_ACTION_BUTTON_CLASS,
  ShenuteActionButton,
  ShenuteActionGroupLabel,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";
import {
  closeContainingDetails,
  getFeedbackStatusClass,
  getMessageAvatarClassName,
  getMessageBubbleClassName,
  getProviderLabel,
  getReactionButtonClassName,
} from "./shenuteClientUtils";

import type { ShenuteCopy } from "./shenuteCopy";
import type { SyntheticEvent } from "react";

export type ShenuteMessageStatusState = {
  message: string;
  status: "error" | "pending" | "success";
};

type ShenuteMessageBubbleProps = {
  adminDraft: string;
  canSubmitAdminFeedback: boolean;
  copy: ShenuteCopy;
  feedbackState: ShenuteMessageStatusState | undefined;
  index: number;
  inferenceProvider: ShenuteProvider;
  isAuthenticated: boolean;
  isFeedbackPending: boolean;
  isLoading: boolean;
  isPremiumLoading: boolean;
  isReady: boolean;
  isShenuteAccessBlocked: boolean;
  isSpeaking: boolean;
  message: ChatMessageLike;
  messageActionState: ShenuteMessageStatusState | undefined;
  onAdminDraftChange: (messageId: string, value: string) => void;
  onAdminFeedbackSubmit: (
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) => void;
  onContinueConversation: () => void;
  onCopyMessage: (message: ChatMessageLike) => void;
  onReaction: (
    signal: ShenuteReactionSignal,
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) => void;
  onRegenerateMessage: (message: ChatMessageLike) => void;
  onResponseDetailsToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  onSpeakText: (text: string) => void;
  onStopSpeech: () => void;
  selectedReaction: ShenuteReactionSignal | undefined;
  typedMessages: ChatMessageLike[];
};

export function ShenuteMessageBubble({
  adminDraft,
  canSubmitAdminFeedback,
  copy,
  feedbackState,
  index,
  inferenceProvider,
  isAuthenticated,
  isFeedbackPending,
  isLoading,
  isPremiumLoading,
  isReady,
  isShenuteAccessBlocked,
  isSpeaking,
  message,
  messageActionState,
  onAdminDraftChange,
  onAdminFeedbackSubmit,
  onContinueConversation,
  onCopyMessage,
  onReaction,
  onRegenerateMessage,
  onResponseDetailsToggle,
  onSpeakText,
  onStopSpeech,
  selectedReaction,
  typedMessages,
}: ShenuteMessageBubbleProps) {
  const assistantMessage = message;
  const promptMessage =
    message.role === "assistant"
      ? findPreviousUserMessage(typedMessages, index)
      : null;
  const isLatestAssistantMessage =
    message.role === "assistant" && index === typedMessages.length - 1;

  const handleResponseCopy = (element?: HTMLElement | null) => {
    closeContainingDetails(element ?? null);
    onCopyMessage(assistantMessage);
  };
  const handleResponseSpeak = (element?: HTMLElement | null) => {
    closeContainingDetails(element ?? null);
    if (isSpeaking) {
      onStopSpeech();
      return;
    }

    const text = getMessageText(message);
    if (text) {
      onSpeakText(text);
    }
  };
  const handleResponseRegenerate = (element?: HTMLElement | null) => {
    closeContainingDetails(element ?? null);
    onRegenerateMessage(assistantMessage);
  };
  const handleResponseContinue = (element?: HTMLElement | null) => {
    closeContainingDetails(element ?? null);
    onContinueConversation();
  };
  const handleResponseReaction = (
    signal: ShenuteReactionSignal,
    element?: HTMLElement | null,
  ) => {
    closeContainingDetails(element ?? null);
    onReaction(signal, assistantMessage, promptMessage);
  };
  const renderResponseActionGroups = ({
    actionClassName,
    closeOnSelect = false,
    groupClassName = "space-y-2",
    layoutClassName = "space-y-3",
    sectionClassName = "space-y-2",
  }: {
    actionClassName: string;
    closeOnSelect?: boolean;
    groupClassName?: string;
    layoutClassName?: string;
    sectionClassName?: string;
  }) => {
    const maybeClose = (element: HTMLElement) =>
      closeOnSelect ? element : null;

    return (
      <div className={layoutClassName}>
        <section className={sectionClassName}>
          <ShenuteActionGroupLabel>
            {copy.responseUseActions}
          </ShenuteActionGroupLabel>
          <div className={groupClassName}>
            <ShenuteActionButton
              actionClassName={actionClassName}
              fullWidth={closeOnSelect}
              onClick={(event) =>
                handleResponseCopy(maybeClose(event.currentTarget))
              }
              icon={<Copy className={SHENUTE_ICON_CLASS.action} />}
            >
              {copy.copyResponse}
            </ShenuteActionButton>
            <ShenuteActionButton
              actionClassName={actionClassName}
              fullWidth={closeOnSelect}
              onClick={(event) =>
                handleResponseSpeak(maybeClose(event.currentTarget))
              }
              disabled={isPremiumLoading}
              className={cx(isSpeaking && "border-coptic/55 text-coptic")}
              icon={
                isSpeaking ? (
                  <Square
                    className={cx(SHENUTE_ICON_CLASS.action, "fill-current")}
                  />
                ) : (
                  <Volume2 className={SHENUTE_ICON_CLASS.action} />
                )
              }
            >
              {isSpeaking ? copy.stop : copy.play}
            </ShenuteActionButton>
          </div>
        </section>
        {isLatestAssistantMessage ? (
          <section className={sectionClassName}>
            <ShenuteActionGroupLabel>
              {copy.responseReviseActions}
            </ShenuteActionGroupLabel>
            <div className={groupClassName}>
              <ShenuteActionButton
                actionClassName={actionClassName}
                fullWidth={closeOnSelect}
                onClick={(event) =>
                  handleResponseRegenerate(maybeClose(event.currentTarget))
                }
                disabled={isLoading}
                icon={<RotateCcw className={SHENUTE_ICON_CLASS.action} />}
              >
                {copy.regenerateResponse}
              </ShenuteActionButton>
              <ShenuteActionButton
                actionClassName={actionClassName}
                fullWidth={closeOnSelect}
                onClick={(event) =>
                  handleResponseContinue(maybeClose(event.currentTarget))
                }
                disabled={isLoading || isShenuteAccessBlocked}
                icon={<CornerDownRight className={SHENUTE_ICON_CLASS.action} />}
              >
                {copy.continueResponse}
              </ShenuteActionButton>
            </div>
          </section>
        ) : null}
        <section className={sectionClassName}>
          <ShenuteActionGroupLabel>
            {copy.responseFeedbackActions}
          </ShenuteActionGroupLabel>
          <div className={groupClassName}>
            <ShenuteActionButton
              actionClassName={actionClassName}
              fullWidth={closeOnSelect}
              onClick={(event) =>
                handleResponseReaction("like", maybeClose(event.currentTarget))
              }
              disabled={!isAuthenticated || isFeedbackPending}
              aria-pressed={selectedReaction === "like"}
              className={getReactionButtonClassName(
                selectedReaction === "like",
                "positive",
              )}
              icon={<ThumbsUp className={SHENUTE_ICON_CLASS.action} />}
            >
              {copy.like}
            </ShenuteActionButton>
            <ShenuteActionButton
              actionClassName={actionClassName}
              fullWidth={closeOnSelect}
              onClick={(event) =>
                handleResponseReaction(
                  "dislike",
                  maybeClose(event.currentTarget),
                )
              }
              disabled={!isAuthenticated || isFeedbackPending}
              aria-pressed={selectedReaction === "dislike"}
              className={getReactionButtonClassName(
                selectedReaction === "dislike",
                "negative",
              )}
              icon={<ThumbsDown className={SHENUTE_ICON_CLASS.action} />}
            >
              {copy.dislike}
            </ShenuteActionButton>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div
      className={cx(
        "group flex w-full gap-2 sm:gap-3",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cx(
          "mt-6 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm sm:flex",
          getMessageAvatarClassName(message.role),
          message.role === "user" && "order-2",
        )}
      >
        {message.role === "user" ? (
          <UserRound className={SHENUTE_ICON_CLASS.panel} />
        ) : (
          <span className="font-coptic text-base leading-none">Ϣ</span>
        )}
      </div>
      <div
        className={cx(
          "min-w-0",
          message.role === "user"
            ? "flex max-w-[88%] flex-col items-end sm:max-w-[70%]"
            : "flex max-w-full flex-1 flex-col items-start sm:max-w-[52rem]",
        )}
      >
        <div
          className={cx(
            "mb-1 flex flex-wrap items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted",
            message.role === "user" && "justify-end text-right",
          )}
        >
          <span>
            {message.role === "user" ? copy.userLabel : copy.assistantLabel}
          </span>
          {isLatestAssistantMessage ? (
            <span className="rounded-full bg-coptic-soft px-2 py-0.5 text-[0.65rem] tracking-normal text-coptic">
              {getProviderLabel(inferenceProvider, copy)}
            </span>
          ) : null}
        </div>
        <div
          className={cx(
            "max-w-full rounded-lg px-4 py-3",
            message.role === "assistant" && "w-full sm:px-5 sm:py-4",
            getMessageBubbleClassName(message.role),
          )}
        >
          <ShenuteMessageMarkdown message={message} />
          {message.role === "assistant" ? (
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
              <details
                data-shenute-response-actions
                className="group relative sm:hidden"
                onToggle={onResponseDetailsToggle}
              >
                <summary
                  aria-label={copy.responseActions}
                  title={copy.responseActions}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: cx(
                      SHENUTE_MENU_ACTION_BUTTON_CLASS,
                      "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
                    ),
                  })}
                >
                  <MoreHorizontal className={SHENUTE_ICON_CLASS.action} />
                  {copy.responseActions}
                </summary>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className={cx(
                    SHENUTE_DIALOG_BACKDROP_CLASS,
                    "z-[60] hidden group-open:block",
                  )}
                  onClick={(event) =>
                    closeContainingDetails(event.currentTarget)
                  }
                />
                <div
                  className={surfacePanelClassName({
                    shadow: "panel",
                    className:
                      "fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] hidden max-h-[min(32rem,calc(100dvh-2rem))] overflow-y-auto p-3 group-open:block",
                  })}
                >
                  <ShenuteSurfaceHeader
                    closeLabel={copy.closeMenu}
                    className="mb-2"
                    onClose={(event) =>
                      closeContainingDetails(event.currentTarget)
                    }
                  >
                    {copy.responseActions}
                  </ShenuteSurfaceHeader>
                  {renderResponseActionGroups({
                    actionClassName: SHENUTE_SHEET_ACTION_BUTTON_CLASS,
                    closeOnSelect: true,
                    sectionClassName:
                      "space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0",
                  })}
                </div>
              </details>
              {renderResponseActionGroups({
                actionClassName: SHENUTE_INLINE_ACTION_BUTTON_CLASS,
                groupClassName: "flex flex-wrap gap-2",
                layoutClassName:
                  "hidden max-w-full flex-wrap items-start gap-x-5 gap-y-3 sm:flex",
                sectionClassName:
                  "space-y-1.5 border-l border-line/80 pl-4 first:border-l-0 first:pl-0",
              })}
              <ShenuteMessageStatus state={messageActionState} />
              {canSubmitAdminFeedback ? (
                <details className="rounded-lg border border-line bg-elevated/70 p-3">
                  <summary className="cursor-pointer font-semibold text-ink">
                    {copy.adminNoteSummary}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={adminDraft}
                      onChange={(event) => {
                        onAdminDraftChange(message.id, event.target.value);
                      }}
                      placeholder={copy.adminNotePlaceholder}
                      rows={3}
                      disabled={isFeedbackPending}
                      className="w-full rounded-lg border border-line bg-surface/88 px-3 py-2 text-xs text-ink shadow-sm focus:border-accent/55 focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onAdminFeedbackSubmit(assistantMessage, promptMessage);
                      }}
                      disabled={isFeedbackPending}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                      })}
                    >
                      {copy.submitAdminNote}
                    </button>
                  </div>
                </details>
              ) : null}
              <ShenuteMessageStatus state={feedbackState} />
              {!isAuthenticated && isReady ? (
                <AuthGateInlinePrompt
                  className="text-xs"
                  message={copy.feedbackSignInInline}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShenuteMessageMarkdown({ message }: { message: ChatMessageLike }) {
  const text = getMessageText(message);
  if (!text) {
    return null;
  }

  return (
    <div
      className={cx(
        "font-coptic text-[1.05rem] leading-7 md:text-lg md:leading-8",
        message.role === "user" ? "text-paper dark:text-ink" : "text-ink",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className={cx(
                "break-words underline underline-offset-4",
                message.role === "user"
                  ? "decoration-paper/60 hover:decoration-paper dark:decoration-ink/60 dark:hover:decoration-ink"
                  : "decoration-line hover:decoration-coptic",
              )}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className={cx(
                "my-3 border-l-2 pl-3",
                message.role === "user"
                  ? "border-paper/45 text-paper/85 dark:border-ink/45 dark:text-ink/85"
                  : "border-line text-muted",
              )}
            />
          ),
          code: ({ className, children, ...props }) => (
            <code
              className={cx(
                "break-words rounded px-1 py-0.5 text-[0.95em]",
                message.role === "user"
                  ? "bg-paper/15 text-paper dark:bg-ink/10 dark:text-ink"
                  : "bg-elevated text-ink",
                className,
              )}
              {...props}
            >
              {children}
            </code>
          ),
          li: ({ ...props }) => <li {...props} className="pl-1" />,
          ol: ({ ...props }) => (
            <ol {...props} className="my-3 list-decimal space-y-1 pl-6" />
          ),
          p: ({ ...props }) => (
            <p {...props} className="mb-3 break-words last:mb-0" />
          ),
          pre: ({ ...props }) => (
            <pre
              {...props}
              className="my-3 max-w-full overflow-x-auto rounded-lg border border-line bg-elevated p-3 text-sm leading-6"
            />
          ),
          table: ({ ...props }) => (
            <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-line">
              <table
                {...props}
                className="w-full min-w-max border-collapse text-left text-sm"
              />
            </div>
          ),
          td: ({ ...props }) => (
            <td
              {...props}
              className="border-t border-line px-3 py-2 align-top"
            />
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className="bg-elevated px-3 py-2 align-top font-semibold text-ink"
            />
          ),
          ul: ({ ...props }) => (
            <ul {...props} className="my-3 list-disc space-y-1 pl-6" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ShenuteMessageStatus({
  state,
}: {
  state: ShenuteMessageStatusState | undefined;
}) {
  if (!state) {
    return null;
  }

  return (
    <p className={getFeedbackStatusClass(state.status)}>{state.message}</p>
  );
}
