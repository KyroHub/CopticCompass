import { useCallback } from "react";

import {
  copyTextToClipboard,
  getMessageText,
  type ChatMessageLike,
} from "@/features/shenute/shared";

import type { ShenuteTemporaryMessageActionStatus } from "./useShenuteTemporaryMessageActions";

type CopyMessageText = (text: string) => Promise<boolean>;

type ShenuteMessageCopy = {
  copiedResponse: string;
  copyResponseManual: string;
};

type SetTemporaryMessageActionState = (
  messageId: string,
  message: string,
  status: ShenuteTemporaryMessageActionStatus,
) => void;

type CopyShenuteMessageOptions = {
  copy: ShenuteMessageCopy;
  copyText?: CopyMessageText;
  message: ChatMessageLike;
  onManualCopyRequired?: (text: string) => void;
  onSuccessfulCopy?: () => void;
  setTemporaryMessageActionState: SetTemporaryMessageActionState;
};

type UseShenuteMessageCopyOptions = Omit<CopyShenuteMessageOptions, "message">;

type ShenuteMessageCopyResult =
  | {
      copied: false;
      text: null;
    }
  | {
      copied: boolean;
      text: string;
    };

export function getShenuteMessageCopyText(message: ChatMessageLike) {
  return getMessageText(message) || null;
}

export function getShenuteMessageCopyStatus(
  didCopy: boolean,
  copy: ShenuteMessageCopy,
): {
  message: string;
  status: ShenuteTemporaryMessageActionStatus;
} {
  return didCopy
    ? {
        message: copy.copiedResponse,
        status: "success",
      }
    : {
        message: copy.copyResponseManual,
        status: "pending",
      };
}

export async function copyShenuteMessage({
  copy,
  copyText = copyTextToClipboard,
  message,
  onManualCopyRequired,
  onSuccessfulCopy,
  setTemporaryMessageActionState,
}: CopyShenuteMessageOptions): Promise<ShenuteMessageCopyResult> {
  const text = getShenuteMessageCopyText(message);
  if (!text) {
    return {
      copied: false,
      text: null,
    };
  }

  let didCopy = false;
  try {
    didCopy = await copyText(text);
  } catch {
    didCopy = false;
  }

  const actionState = getShenuteMessageCopyStatus(didCopy, copy);
  if (didCopy) {
    onSuccessfulCopy?.();
  } else {
    onManualCopyRequired?.(text);
  }

  setTemporaryMessageActionState(
    message.id,
    actionState.message,
    actionState.status,
  );

  return {
    copied: didCopy,
    text,
  };
}

export function useShenuteMessageCopy({
  copy,
  copyText,
  onManualCopyRequired,
  onSuccessfulCopy,
  setTemporaryMessageActionState,
}: UseShenuteMessageCopyOptions) {
  return useCallback(
    (message: ChatMessageLike) =>
      copyShenuteMessage({
        copy,
        copyText,
        message,
        onManualCopyRequired,
        onSuccessfulCopy,
        setTemporaryMessageActionState,
      }),
    [
      copy,
      copyText,
      onManualCopyRequired,
      onSuccessfulCopy,
      setTemporaryMessageActionState,
    ],
  );
}
