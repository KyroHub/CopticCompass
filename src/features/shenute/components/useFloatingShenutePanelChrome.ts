import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
  type SyntheticEvent,
} from "react";

import type {
  ChatMessageLike,
  ShenuteProvider,
} from "@/features/shenute/shared";

import {
  persistFloatingShenuteHandoff,
  type FloatingShenutePageContext,
} from "./floatingShenuteContext";

type AttachmentMenuDetails = Pick<HTMLDetailsElement, "contains" | "open">;

type FloatingShenuteHandoffPersistence = typeof persistFloatingShenuteHandoff;

export function isFloatingShenuteEscapeKey(event: Pick<KeyboardEvent, "key">) {
  return event.key === "Escape";
}

export function shouldCloseFloatingShenuteAttachmentMenu(
  details: Pick<HTMLDetailsElement, "contains"> | null,
  target: EventTarget | null,
) {
  if (!details || !target) {
    return false;
  }

  return !details.contains(target as Node);
}

export function closeFloatingShenuteAttachmentMenu({
  details,
  setIsOpen,
}: {
  details: AttachmentMenuDetails | null;
  setIsOpen: (isOpen: boolean) => void;
}) {
  if (details) {
    details.open = false;
  }

  setIsOpen(false);
}

export function stopFloatingShenuteResponse({
  closeAttachmentMenu,
  messageInput,
  requestAnimationFrame = window.requestAnimationFrame,
  setIsAnswerStylePanelOpen,
  stop,
}: {
  closeAttachmentMenu: () => void;
  messageInput: Pick<HTMLTextAreaElement, "focus"> | null;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  setIsAnswerStylePanelOpen: (isOpen: boolean) => void;
  stop: () => void;
}) {
  stop();
  setIsAnswerStylePanelOpen(false);
  closeAttachmentMenu();
  requestAnimationFrame(() => {
    messageInput?.focus({ preventScroll: true });
  });
}

export function persistFloatingShenuteWorkspaceHandoff({
  inferenceProvider,
  messages,
  persistHandoff = persistFloatingShenuteHandoff,
  readPageContext,
}: {
  inferenceProvider: ShenuteProvider;
  messages: ChatMessageLike[];
  persistHandoff?: FloatingShenuteHandoffPersistence;
  readPageContext: () => FloatingShenutePageContext;
}) {
  return persistHandoff({
    inferenceProvider,
    messages,
    pageContext: readPageContext(),
  });
}

function useFloatingShenuteEscapeDismiss({
  isActive,
  onDismiss,
}: {
  isActive: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isFloatingShenuteEscapeKey(event)) {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onDismiss]);
}

export function useFloatingShenuteAnswerStyleChrome() {
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const closeAnswerStylePanel = useCallback(() => {
    setIsAnswerStylePanelOpen(false);
  }, []);

  useFloatingShenuteEscapeDismiss({
    isActive: isAnswerStylePanelOpen,
    onDismiss: closeAnswerStylePanel,
  });

  return {
    isAnswerStylePanelOpen,
    setIsAnswerStylePanelOpen,
  };
}

export function useFloatingShenuteAttachmentMenuChrome({
  attachmentMenuDetailsRef,
}: {
  attachmentMenuDetailsRef: RefObject<HTMLDetailsElement | null>;
}) {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const closeAttachmentMenu = useCallback(() => {
    closeFloatingShenuteAttachmentMenu({
      details: attachmentMenuDetailsRef.current,
      setIsOpen: setIsAttachmentMenuOpen,
    });
  }, [attachmentMenuDetailsRef]);
  const handleAttachmentMenuToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      setIsAttachmentMenuOpen(event.currentTarget.open);
    },
    [],
  );

  useEffect(() => {
    if (!isAttachmentMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        shouldCloseFloatingShenuteAttachmentMenu(
          attachmentMenuDetailsRef.current,
          event.target,
        )
      ) {
        closeAttachmentMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [attachmentMenuDetailsRef, closeAttachmentMenu, isAttachmentMenuOpen]);

  return {
    closeAttachmentMenu,
    handleAttachmentMenuToggle,
    isAttachmentMenuOpen,
  };
}

export function useFloatingShenuteStopResponse({
  closeAttachmentMenu,
  messageInputRef,
  setIsAnswerStylePanelOpen,
  stop,
}: {
  closeAttachmentMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  setIsAnswerStylePanelOpen: (isOpen: boolean) => void;
  stop: () => void;
}) {
  return useCallback(() => {
    stopFloatingShenuteResponse({
      closeAttachmentMenu,
      messageInput: messageInputRef.current,
      setIsAnswerStylePanelOpen,
      stop,
    });
  }, [closeAttachmentMenu, messageInputRef, setIsAnswerStylePanelOpen, stop]);
}

export function useFloatingShenuteWorkspaceHandoff({
  inferenceProvider,
  messages,
  readPageContext,
}: {
  inferenceProvider: ShenuteProvider;
  messages: ChatMessageLike[];
  readPageContext: () => FloatingShenutePageContext;
}) {
  return useCallback(
    () =>
      persistFloatingShenuteWorkspaceHandoff({
        inferenceProvider,
        messages,
        readPageContext,
      }),
    [inferenceProvider, messages, readPageContext],
  );
}
