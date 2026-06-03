import type {
  ChatMessageLike,
  ShenuteProvider,
  ShenuteReactionSignal,
} from "@/features/shenute/shared";

import {
  ShenuteMessageBubble,
  type ShenuteMessageStatusState,
} from "./ShenuteMessageBubble";
import { ShenuteThinkingIndicator } from "./ShenuteThinkingIndicator";
import { ShenuteWelcomePanel } from "./ShenuteWelcomePanel";

import type { ShenuteCopy } from "./shenuteCopy";
import type {
  ShenuteStarterPrompt,
  ShenuteProviderOption,
} from "./shenuteOptions";
import type { RefObject, SyntheticEvent } from "react";

type ShenuteMessageListProps = {
  adminFeedbackDraftByMessage: Record<string, string>;
  canSubmitAdminFeedback: boolean;
  copy: ShenuteCopy;
  feedbackStateByMessage: Record<string, ShenuteMessageStatusState>;
  inferenceProvider: ShenuteProvider;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremiumLoading: boolean;
  isReady: boolean;
  isShenuteAccessBlocked: boolean;
  isSpeaking: boolean;
  messageActionStateByMessage: Record<string, ShenuteMessageStatusState>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
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
  onSelectStarterPrompt: (prompt: string) => void;
  onSpeakText: (text: string) => void;
  onStopSpeech: () => void;
  onTranscriptScroll: () => void;
  selectedProviderOption: ShenuteProviderOption;
  selectedReactionByMessage: Record<string, ShenuteReactionSignal>;
  starterPrompts: ShenuteStarterPrompt[];
  thinkingElapsedLabel: string;
  thinkingElapsedSeconds: number;
  thinkingStatusMessage: string;
  transcriptScrollRef: RefObject<HTMLDivElement | null>;
  typedMessages: ChatMessageLike[];
};

export function ShenuteMessageList({
  adminFeedbackDraftByMessage,
  canSubmitAdminFeedback,
  copy,
  feedbackStateByMessage,
  inferenceProvider,
  isAuthenticated,
  isLoading,
  isPremiumLoading,
  isReady,
  isShenuteAccessBlocked,
  isSpeaking,
  messageActionStateByMessage,
  messagesEndRef,
  onAdminDraftChange,
  onAdminFeedbackSubmit,
  onContinueConversation,
  onCopyMessage,
  onReaction,
  onRegenerateMessage,
  onResponseDetailsToggle,
  onSelectStarterPrompt,
  onSpeakText,
  onStopSpeech,
  onTranscriptScroll,
  selectedProviderOption,
  selectedReactionByMessage,
  starterPrompts,
  thinkingElapsedLabel,
  thinkingElapsedSeconds,
  thinkingStatusMessage,
  transcriptScrollRef,
  typedMessages,
}: ShenuteMessageListProps) {
  if (typedMessages.length === 0) {
    return (
      <ShenuteWelcomePanel
        copy={copy}
        isDisabled={isLoading || isShenuteAccessBlocked}
        onSelectPrompt={onSelectStarterPrompt}
        starterPrompts={starterPrompts}
      />
    );
  }

  return (
    <div
      ref={transcriptScrollRef}
      aria-live="polite"
      onScroll={onTranscriptScroll}
      className="min-h-0 flex-1 overscroll-contain scroll-pb-20 space-y-4 overflow-y-auto border-b border-line bg-elevated/55 p-3 sm:space-y-5 sm:p-4 md:p-6"
    >
      {typedMessages.map((message, index) => {
        const feedbackState = feedbackStateByMessage[message.id];
        const messageActionState = messageActionStateByMessage[message.id];

        return (
          <ShenuteMessageBubble
            key={message.id}
            adminDraft={adminFeedbackDraftByMessage[message.id] ?? ""}
            canSubmitAdminFeedback={canSubmitAdminFeedback}
            copy={copy}
            feedbackState={feedbackState}
            index={index}
            inferenceProvider={inferenceProvider}
            isAuthenticated={isAuthenticated}
            isFeedbackPending={feedbackState?.status === "pending"}
            isLoading={isLoading}
            isPremiumLoading={isPremiumLoading}
            isReady={isReady}
            isShenuteAccessBlocked={isShenuteAccessBlocked}
            isSpeaking={isSpeaking}
            message={message}
            messageActionState={messageActionState}
            onAdminDraftChange={onAdminDraftChange}
            onAdminFeedbackSubmit={onAdminFeedbackSubmit}
            onContinueConversation={onContinueConversation}
            onCopyMessage={onCopyMessage}
            onReaction={onReaction}
            onRegenerateMessage={onRegenerateMessage}
            onResponseDetailsToggle={onResponseDetailsToggle}
            onSpeakText={onSpeakText}
            onStopSpeech={onStopSpeech}
            selectedReaction={selectedReactionByMessage[message.id]}
            typedMessages={typedMessages}
          />
        );
      })}

      {isLoading ? (
        <ShenuteThinkingIndicator
          copy={copy}
          selectedProviderLabel={selectedProviderOption.label}
          thinkingElapsedLabel={thinkingElapsedLabel}
          thinkingElapsedSeconds={thinkingElapsedSeconds}
          thinkingStatusMessage={thinkingStatusMessage}
        />
      ) : null}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
}
