import { useCallback, useState } from "react";

import type {
  ShenuteFeedbackState,
  ShenuteFeedbackStateByMessage,
} from "./useShenuteFeedbackSubmission";

const TEMPORARY_MESSAGE_ACTION_CLEAR_DELAY_MS = 2500;

export type ShenuteTemporaryMessageActionStatus =
  ShenuteFeedbackState["status"];

export function applyShenuteTemporaryMessageActionState(
  current: ShenuteFeedbackStateByMessage,
  messageId: string,
  state: ShenuteFeedbackState,
) {
  return {
    ...current,
    [messageId]: state,
  };
}

export function clearShenuteTemporaryMessageActionState(
  current: ShenuteFeedbackStateByMessage,
  messageId: string,
  message: string,
) {
  if (current[messageId]?.message !== message) {
    return current;
  }

  const next = { ...current };
  delete next[messageId];
  return next;
}

export function useShenuteTemporaryMessageActions(
  clearDelayMs = TEMPORARY_MESSAGE_ACTION_CLEAR_DELAY_MS,
) {
  const [messageActionStateByMessage, setMessageActionStateByMessage] =
    useState<ShenuteFeedbackStateByMessage>({});

  const setTemporaryMessageActionState = useCallback(
    (
      messageId: string,
      message: string,
      status: ShenuteTemporaryMessageActionStatus,
    ) => {
      setMessageActionStateByMessage((current) =>
        applyShenuteTemporaryMessageActionState(current, messageId, {
          message,
          status,
        }),
      );

      window.setTimeout(() => {
        setMessageActionStateByMessage((current) =>
          clearShenuteTemporaryMessageActionState(current, messageId, message),
        );
      }, clearDelayMs);
    },
    [clearDelayMs],
  );

  const resetMessageActionStates = useCallback(() => {
    setMessageActionStateByMessage({});
  }, []);

  return {
    messageActionStateByMessage,
    resetMessageActionStates,
    setTemporaryMessageActionState,
  };
}
