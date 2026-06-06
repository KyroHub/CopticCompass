import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
} from "react";

import type { ShenuteProvider } from "@/features/shenute/shared";

/* eslint-disable react-hooks/set-state-in-effect -- Shenute page chrome mirrors external access and viewport state into local panel state. */

type ShenutePageMobileUtilitySheet = "actions" | "history" | null;
type ShenutePageMobileUtilitySheetName = Exclude<
  ShenutePageMobileUtilitySheet,
  null
>;

type AttachmentMenuDetails = Pick<HTMLDetailsElement, "contains" | "open">;
type BooleanStateSetter = Dispatch<SetStateAction<boolean>>;
type DetailsCloser = (except?: HTMLDetailsElement | null) => void;
type MobileUtilitySheetSetter = Dispatch<
  SetStateAction<ShenutePageMobileUtilitySheet>
>;

export function isShenutePageEscapeKey(event: Pick<KeyboardEvent, "key">) {
  return event.key === "Escape";
}

export function shouldCloseShenutePageAttachmentMenu(
  details: Pick<HTMLDetailsElement, "contains"> | null,
  target: EventTarget | null,
) {
  if (!details || !target) {
    return false;
  }

  return !details.contains(target as Node);
}

export function closeShenutePageAttachmentMenu({
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

export function focusShenuteCopyFallbackTextarea(
  textarea: Pick<HTMLTextAreaElement, "focus" | "select"> | null,
) {
  textarea?.focus();
  textarea?.select();
}

export function getNextShenutePageMobileUtilitySheet(
  current: ShenutePageMobileUtilitySheet,
  sheet: ShenutePageMobileUtilitySheetName,
) {
  return current === sheet ? null : sheet;
}

export function openShenutePageUtilityDetails({
  closeOpenUtilityDetails,
  details,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
}: {
  closeOpenUtilityDetails: DetailsCloser;
  details: HTMLDetailsElement;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  if (!details.open) {
    return false;
  }

  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
  closeOpenUtilityDetails(details);
  return true;
}

export function openShenutePageResponseDetails({
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  details,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
}: {
  closeOpenResponseDetails: DetailsCloser;
  closeOpenUtilityDetails: DetailsCloser;
  details: HTMLDetailsElement;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  if (!details.open) {
    return false;
  }

  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
  closeOpenUtilityDetails();
  closeOpenResponseDetails(details);
  return true;
}

export function toggleShenutePageMobileUtilitySheet({
  closeOpenUtilityDetails,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
  sheet,
}: {
  closeOpenUtilityDetails: DetailsCloser;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
  sheet: ShenutePageMobileUtilitySheetName;
}) {
  closeOpenUtilityDetails();
  setIsUtilityChromeCollapsed(false);
  setIsAnswerStylePanelOpen(false);
  setMobileUtilitySheet((current) =>
    getNextShenutePageMobileUtilitySheet(current, sheet),
  );
}

export function toggleShenutePageAnswerStylePanel({
  closeOpenUtilityDetails,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
}: {
  closeOpenUtilityDetails: DetailsCloser;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  closeOpenUtilityDetails();
  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen((current) => !current);
}

export function openShenutePageAttachmentMenuChrome({
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
}: {
  closeOpenResponseDetails: DetailsCloser;
  closeOpenUtilityDetails: DetailsCloser;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
  closeOpenUtilityDetails();
  closeOpenResponseDetails();
}

export function prepareShenutePageNewConversationChrome({
  closeOpenUtilityDetails,
  setIsAnswerStylePanelOpen,
  setMobileUtilitySheet,
}: {
  closeOpenUtilityDetails: DetailsCloser;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  closeOpenUtilityDetails();
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
}

export function selectShenutePageAnswerStyleProvider({
  provider,
  setInferenceProvider,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
}: {
  provider: ShenuteProvider;
  setInferenceProvider: Dispatch<SetStateAction<ShenuteProvider>>;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
}) {
  setIsUtilityChromeCollapsed(false);
  setInferenceProvider(provider);
  setIsAnswerStylePanelOpen(false);
}

export function stopShenutePageResponse({
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  messageInput,
  requestAnimationFrame = window.requestAnimationFrame,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
  stopChatResponse,
}: {
  closeOpenResponseDetails: () => void;
  closeOpenUtilityDetails: () => void;
  messageInput: Pick<HTMLTextAreaElement, "focus"> | null;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  setIsAnswerStylePanelOpen: (isOpen: boolean) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setMobileUtilitySheet: (sheet: ShenutePageMobileUtilitySheet) => void;
  stopChatResponse: () => void;
}) {
  stopChatResponse();
  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
  closeOpenUtilityDetails();
  closeOpenResponseDetails();
  requestAnimationFrame(() => {
    messageInput?.focus({ preventScroll: true });
  });
}

function useShenutePageEscapeDismiss({
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
      if (isShenutePageEscapeKey(event)) {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onDismiss]);
}

export function useShenutePageAnswerStyleChrome({
  isShenuteAccessBlocked,
}: {
  isShenuteAccessBlocked: boolean;
}) {
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const closeAnswerStylePanel = useCallback(() => {
    setIsAnswerStylePanelOpen(false);
  }, []);

  useShenutePageEscapeDismiss({
    isActive: isAnswerStylePanelOpen,
    onDismiss: closeAnswerStylePanel,
  });

  useEffect(() => {
    if (isShenuteAccessBlocked) {
      setIsAnswerStylePanelOpen(false);
    }
  }, [isShenuteAccessBlocked]);

  return {
    closeAnswerStylePanel,
    isAnswerStylePanelOpen,
    setIsAnswerStylePanelOpen,
  };
}

export function useShenutePageMobileUtilitySheetChrome({
  isMobileViewport,
}: {
  isMobileViewport: boolean;
}) {
  const [mobileUtilitySheet, setMobileUtilitySheet] =
    useState<ShenutePageMobileUtilitySheet>(null);
  const closeMobileUtilitySheet = useCallback(() => {
    setMobileUtilitySheet(null);
  }, []);

  useShenutePageEscapeDismiss({
    isActive: Boolean(mobileUtilitySheet),
    onDismiss: closeMobileUtilitySheet,
  });

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileUtilitySheet(null);
    }
  }, [isMobileViewport]);

  return {
    closeMobileUtilitySheet,
    mobileUtilitySheet,
    setMobileUtilitySheet,
  };
}

export function useShenutePageUtilityChromeActions({
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  setInferenceProvider,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
}: {
  closeOpenResponseDetails: DetailsCloser;
  closeOpenUtilityDetails: DetailsCloser;
  setInferenceProvider: Dispatch<SetStateAction<ShenuteProvider>>;
  setIsAnswerStylePanelOpen: BooleanStateSetter;
  setIsUtilityChromeCollapsed: BooleanStateSetter;
  setMobileUtilitySheet: MobileUtilitySheetSetter;
}) {
  const expandUtilityChrome = useCallback(() => {
    setIsUtilityChromeCollapsed(false);
  }, [setIsUtilityChromeCollapsed]);
  const handleAttachmentMenuOpen = useCallback(() => {
    openShenutePageAttachmentMenuChrome({
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
    });
  }, [
    closeOpenResponseDetails,
    closeOpenUtilityDetails,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
  ]);
  const handleUtilityDetailsToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      openShenutePageUtilityDetails({
        closeOpenUtilityDetails,
        details: event.currentTarget,
        setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed,
        setMobileUtilitySheet,
      });
    },
    [
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
    ],
  );
  const handleResponseDetailsToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      openShenutePageResponseDetails({
        closeOpenResponseDetails,
        closeOpenUtilityDetails,
        details: event.currentTarget,
        setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed,
        setMobileUtilitySheet,
      });
    },
    [
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
    ],
  );
  const handleHistoryMobileUtilitySheetToggle = useCallback(() => {
    toggleShenutePageMobileUtilitySheet({
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
      sheet: "history",
    });
  }, [
    closeOpenUtilityDetails,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
  ]);
  const handleActionsMobileUtilitySheetToggle = useCallback(() => {
    toggleShenutePageMobileUtilitySheet({
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
      sheet: "actions",
    });
  }, [
    closeOpenUtilityDetails,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
  ]);
  const handleAnswerStylePanelToggle = useCallback(() => {
    toggleShenutePageAnswerStylePanel({
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
    });
  }, [
    closeOpenUtilityDetails,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
  ]);
  const prepareNewConversationChrome = useCallback(() => {
    prepareShenutePageNewConversationChrome({
      closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen,
      setMobileUtilitySheet,
    });
  }, [
    closeOpenUtilityDetails,
    setIsAnswerStylePanelOpen,
    setMobileUtilitySheet,
  ]);
  const handleAnswerStyleProviderSelect = useCallback(
    (provider: ShenuteProvider) => {
      selectShenutePageAnswerStyleProvider({
        provider,
        setInferenceProvider,
        setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed,
      });
    },
    [
      setInferenceProvider,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
    ],
  );

  return {
    expandUtilityChrome,
    handleActionsMobileUtilitySheetToggle,
    handleAttachmentMenuOpen,
    handleAnswerStylePanelToggle,
    handleAnswerStyleProviderSelect,
    handleHistoryMobileUtilitySheetToggle,
    handleResponseDetailsToggle,
    handleUtilityDetailsToggle,
    prepareNewConversationChrome,
  };
}

export function useShenutePageCopyFallbackChrome({
  textareaRef,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const closeCopyFallback = useCallback(() => {
    setCopyFallbackText(null);
  }, []);

  useEffect(() => {
    if (!copyFallbackText) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusShenuteCopyFallbackTextarea(textareaRef.current);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [copyFallbackText, textareaRef]);

  useShenutePageEscapeDismiss({
    isActive: Boolean(copyFallbackText),
    onDismiss: closeCopyFallback,
  });

  return {
    copyFallbackText,
    setCopyFallbackText,
  };
}

export function useShenutePageAttachmentMenuChrome({
  attachmentMenuDetailsRef,
  onOpen,
}: {
  attachmentMenuDetailsRef: RefObject<HTMLDetailsElement | null>;
  onOpen: () => void;
}) {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const closeAttachmentMenu = useCallback(() => {
    closeShenutePageAttachmentMenu({
      details: attachmentMenuDetailsRef.current,
      setIsOpen: setIsAttachmentMenuOpen,
    });
  }, [attachmentMenuDetailsRef]);
  const handleComposerDetailsToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      setIsAttachmentMenuOpen(event.currentTarget.open);

      if (event.currentTarget.open) {
        onOpen();
      }
    },
    [onOpen],
  );

  useEffect(() => {
    if (!isAttachmentMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        shouldCloseShenutePageAttachmentMenu(
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
    handleComposerDetailsToggle,
  };
}

export function useShenutePageStopResponse({
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  messageInputRef,
  setIsAnswerStylePanelOpen,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
  stopChatResponse,
}: {
  closeOpenResponseDetails: () => void;
  closeOpenUtilityDetails: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  setIsAnswerStylePanelOpen: (isOpen: boolean) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setMobileUtilitySheet: (sheet: ShenutePageMobileUtilitySheet) => void;
  stopChatResponse: () => void;
}) {
  return useCallback(() => {
    stopShenutePageResponse({
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      messageInput: messageInputRef.current,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
      stopChatResponse,
    });
  }, [
    closeOpenResponseDetails,
    closeOpenUtilityDetails,
    messageInputRef,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
    stopChatResponse,
  ]);
}
