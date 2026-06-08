import { Copy, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  AuthGateInlinePrompt,
  AuthGateNotice,
} from "@/components/AuthGateNotice";
import { buttonClassName } from "@/components/Button";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  findPreviousUserMessage,
  getMessageText,
  type ChatMessageLike,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";

import { getFeedbackStatusClass } from "./shenuteClientUtils";

type FloatingShenuteFeedbackState = {
  message: string;
  status: "error" | "pending" | "success";
};

type FloatingShenuteMessagesCopy = {
  adminNotePlaceholder: string;
  adminNoteTitle: string;
  copyResponse: string;
  dislike: string;
  emptyPrompt: string;
  fullWorkspace: string;
  fullWorkspaceHint: string;
  like: string;
  responseFeedbackActions: string;
  responseUseActions: string;
  signInBody: string;
  signInFeedback: string;
  signInTitle: string;
  submitAdminNote: string;
};

type FloatingShenuteMessagesProps = {
  adminFeedbackDraftByMessage: Record<string, string>;
  canSubmitAdminFeedback: boolean;
  copy: FloatingShenuteMessagesCopy;
  feedbackStateByMessage: Record<string, FloatingShenuteFeedbackState>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReady: boolean;
  isShenuteAccessBlocked: boolean;
  messageActionStateByMessage: Record<string, FloatingShenuteFeedbackState>;
  onAdminFeedbackDraftChange: (messageId: string, value: string) => void;
  onAdminFeedbackSubmit: (
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) => void;
  onCopyMessage: (message: ChatMessageLike) => void;
  onOpenWorkspace: () => void;
  onReaction: (
    signal: ShenuteReactionSignal,
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) => void;
  selectedReactionByMessage: Record<string, ShenuteReactionSignal>;
  thinkingElapsedLabel: string;
  thinkingStatusMessage: string;
  typedMessages: ChatMessageLike[];
};

export function FloatingShenuteMessages({
  adminFeedbackDraftByMessage,
  canSubmitAdminFeedback,
  copy,
  feedbackStateByMessage,
  isAuthenticated,
  isLoading,
  isReady,
  isShenuteAccessBlocked,
  messageActionStateByMessage,
  onAdminFeedbackDraftChange,
  onAdminFeedbackSubmit,
  onCopyMessage,
  onOpenWorkspace,
  onReaction,
  selectedReactionByMessage,
  thinkingElapsedLabel,
  thinkingStatusMessage,
  typedMessages,
}: FloatingShenuteMessagesProps) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-elevated/45 p-3">
      <FloatingShenuteConversationContent
        adminFeedbackDraftByMessage={adminFeedbackDraftByMessage}
        canSubmitAdminFeedback={canSubmitAdminFeedback}
        copy={copy}
        feedbackStateByMessage={feedbackStateByMessage}
        isAuthenticated={isAuthenticated}
        isReady={isReady}
        isShenuteAccessBlocked={isShenuteAccessBlocked}
        messageActionStateByMessage={messageActionStateByMessage}
        onAdminFeedbackDraftChange={onAdminFeedbackDraftChange}
        onAdminFeedbackSubmit={onAdminFeedbackSubmit}
        onCopyMessage={onCopyMessage}
        onOpenWorkspace={onOpenWorkspace}
        onReaction={onReaction}
        selectedReactionByMessage={selectedReactionByMessage}
        typedMessages={typedMessages}
      />

      {isLoading ? (
        <div
          aria-live="polite"
          className={surfacePanelClassName({
            shadow: "soft",
            className:
              "mr-8 flex min-w-0 items-center gap-2 rounded-bl-md border-line/80 px-3 py-2 text-sm text-muted",
          })}
        >
          <span
            aria-hidden="true"
            className="relative flex h-2.5 w-2.5 shrink-0"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coptic/40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coptic" />
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">
            {thinkingStatusMessage}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {thinkingElapsedLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FloatingShenuteConversationContent({
  adminFeedbackDraftByMessage,
  canSubmitAdminFeedback,
  copy,
  feedbackStateByMessage,
  isAuthenticated,
  isReady,
  isShenuteAccessBlocked,
  messageActionStateByMessage,
  onAdminFeedbackDraftChange,
  onAdminFeedbackSubmit,
  onCopyMessage,
  onOpenWorkspace,
  onReaction,
  selectedReactionByMessage,
  typedMessages,
}: Omit<
  FloatingShenuteMessagesProps,
  "isLoading" | "thinkingElapsedLabel" | "thinkingStatusMessage"
>) {
  if (isShenuteAccessBlocked) {
    return (
      <div className="flex h-full items-center">
        <AuthGateNotice
          align="left"
          className="w-full"
          size="comfortable"
          title={copy.signInTitle}
        >
          {copy.signInBody}
        </AuthGateNotice>
      </div>
    );
  }

  if (typedMessages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-accent/20 bg-accent-soft/55 px-3 py-4 text-sm leading-6 text-muted dark:bg-accent-soft/25">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-coptic shadow-sm">
          <span className="font-coptic leading-none">Ϣ</span>
        </div>
        <p>{copy.emptyPrompt}</p>
      </div>
    );
  }

  return typedMessages.map((message, index) => {
    const assistantMessage = message;
    const promptMessage =
      message.role === "assistant"
        ? findPreviousUserMessage(typedMessages, index)
        : null;
    const feedbackState = feedbackStateByMessage[message.id];
    const messageActionState = messageActionStateByMessage[message.id];
    const selectedReaction = selectedReactionByMessage[message.id];
    const adminDraft = adminFeedbackDraftByMessage[message.id] ?? "";
    const isFeedbackPending = feedbackState?.status === "pending";

    return (
      <article
        key={message.id}
        className={
          message.role === "user"
            ? "ml-8 rounded-lg rounded-br-md bg-coptic px-3.5 py-2.5 font-coptic text-[0.98rem] leading-6 text-white shadow-sm dark:text-paper"
            : surfacePanelClassName({
                shadow: "soft",
                className:
                  "mr-5 rounded-bl-md border-line/80 px-3.5 py-2.5 font-coptic text-[0.98rem] leading-6 ring-1 ring-line/60",
              })
        }
      >
        <FloatingShenuteMarkdownMessage message={message} />

        {message.role === "assistant" ? (
          <div className="mt-3 space-y-2 border-t border-line/80 pt-2 font-sans text-[11px]">
            <section className="space-y-1.5">
              <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                {copy.responseUseActions}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCopyMessage(assistantMessage);
                  }}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: "h-8 gap-1.5 px-2 text-xs",
                  })}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.copyResponse}
                </button>
                <Link
                  href="/shenute"
                  onClick={onOpenWorkspace}
                  title={copy.fullWorkspaceHint}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: "h-8 gap-1.5 px-2 text-xs",
                  })}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.fullWorkspace}
                </Link>
              </div>
            </section>

            <section className="space-y-1.5">
              <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                {copy.responseFeedbackActions}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={copy.like}
                  title={copy.like}
                  onClick={() => {
                    onReaction("like", assistantMessage, promptMessage);
                  }}
                  disabled={!isAuthenticated || isFeedbackPending}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: cx(
                      "h-8 gap-1.5 px-2 text-xs",
                      selectedReaction === "like" &&
                        "border-coptic/35 bg-coptic-soft text-coptic",
                    ),
                  })}
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.like}
                </button>
                <button
                  type="button"
                  aria-label={copy.dislike}
                  title={copy.dislike}
                  onClick={() => {
                    onReaction("dislike", assistantMessage, promptMessage);
                  }}
                  disabled={!isAuthenticated || isFeedbackPending}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: cx(
                      "h-8 gap-1.5 px-2 text-xs",
                      selectedReaction === "dislike" &&
                        "border-danger/35 bg-danger/5 text-danger dark:bg-danger/10",
                    ),
                  })}
                >
                  <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.dislike}
                </button>
              </div>
            </section>

            {canSubmitAdminFeedback ? (
              <details className="rounded-lg border border-line/80 bg-elevated/60 p-2">
                <summary className="cursor-pointer font-semibold text-ink">
                  {copy.adminNoteTitle}
                </summary>
                <div className="mt-2 space-y-2">
                  <textarea
                    value={adminDraft}
                    onChange={(event) => {
                      onAdminFeedbackDraftChange(
                        message.id,
                        event.target.value,
                      );
                    }}
                    placeholder={copy.adminNotePlaceholder}
                    rows={3}
                    disabled={isFeedbackPending}
                    className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink focus:border-accent/55 focus:outline-none focus:ring-2 focus:ring-accent/30"
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
                      className: "h-8 px-2 text-xs",
                    })}
                  >
                    {copy.submitAdminNote}
                  </button>
                </div>
              </details>
            ) : null}

            {messageActionState ? (
              <p className={getFeedbackStatusClass(messageActionState.status)}>
                {messageActionState.message}
              </p>
            ) : null}

            {feedbackState ? (
              <p className={getFeedbackStatusClass(feedbackState.status)}>
                {feedbackState.message}
              </p>
            ) : null}

            {!isAuthenticated && isReady ? (
              <AuthGateInlinePrompt
                className="text-[11px]"
                message={copy.signInFeedback}
              />
            ) : null}
          </div>
        ) : null}
      </article>
    );
  });
}

function FloatingShenuteMarkdownMessage({
  message,
}: {
  message: ChatMessageLike;
}) {
  const text = getMessageText(message);
  if (!text) {
    return null;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className={cx(
              "underline underline-offset-4",
              message.role === "user"
                ? "decoration-white/60 hover:decoration-white"
                : "decoration-accent/45 hover:decoration-accent",
            )}
          />
        ),
        code: ({ className, children, ...props }) => (
          <code
            className={cx(
              "rounded px-1 py-0.5 text-[0.95em]",
              message.role === "user"
                ? "bg-white/15 text-white"
                : "bg-elevated text-ink",
              className,
            )}
            {...props}
          >
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
