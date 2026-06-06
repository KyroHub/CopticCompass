import { describe, expect, it, vi } from "vitest";

import {
  closeShenutePageAttachmentMenu,
  focusShenuteCopyFallbackTextarea,
  getNextShenutePageMobileUtilitySheet,
  isShenutePageEscapeKey,
  openShenutePageAttachmentMenuChrome,
  openShenutePageResponseDetails,
  openShenutePageUtilityDetails,
  prepareShenutePageNewConversationChrome,
  selectShenutePageAnswerStyleProvider,
  shouldCloseShenutePageAttachmentMenu,
  stopShenutePageResponse,
  toggleShenutePageAnswerStylePanel,
  toggleShenutePageMobileUtilitySheet,
} from "./useShenutePageChrome";

function buildUtilityChromeControls() {
  return {
    closeOpenResponseDetails: vi.fn(),
    closeOpenUtilityDetails: vi.fn(),
    setInferenceProvider: vi.fn(),
    setIsAnswerStylePanelOpen: vi.fn(),
    setIsUtilityChromeCollapsed: vi.fn(),
    setMobileUtilitySheet: vi.fn(),
  };
}

describe("Shenute page chrome helpers", () => {
  it("detects Escape key dismissal", () => {
    expect(isShenutePageEscapeKey({ key: "Escape" })).toBe(true);
    expect(isShenutePageEscapeKey({ key: "Tab" })).toBe(false);
  });

  it("detects attachment menu outside clicks", () => {
    const insideTarget = {};
    const outsideTarget = {};
    const details = {
      contains: vi.fn((target: unknown) => target === insideTarget),
    };

    expect(
      shouldCloseShenutePageAttachmentMenu(
        details as unknown as HTMLDetailsElement,
        insideTarget as EventTarget,
      ),
    ).toBe(false);
    expect(
      shouldCloseShenutePageAttachmentMenu(
        details as unknown as HTMLDetailsElement,
        outsideTarget as EventTarget,
      ),
    ).toBe(true);
    expect(
      shouldCloseShenutePageAttachmentMenu(null, outsideTarget as EventTarget),
    ).toBe(false);
  });

  it("closes the attachment details element and state", () => {
    const details = {
      contains: vi.fn(),
      open: true,
    };
    const setIsOpen = vi.fn();

    closeShenutePageAttachmentMenu({
      details: details as unknown as HTMLDetailsElement,
      setIsOpen,
    });

    expect(details.open).toBe(false);
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("focuses and selects copy fallback text", () => {
    const textarea = {
      focus: vi.fn(),
      select: vi.fn(),
    };

    focusShenuteCopyFallbackTextarea(textarea);

    expect(textarea.focus).toHaveBeenCalledTimes(1);
    expect(textarea.select).toHaveBeenCalledTimes(1);
  });

  it("toggles mobile utility sheet names", () => {
    expect(getNextShenutePageMobileUtilitySheet(null, "history")).toBe(
      "history",
    );
    expect(getNextShenutePageMobileUtilitySheet("history", "history")).toBe(
      null,
    );
    expect(getNextShenutePageMobileUtilitySheet("actions", "history")).toBe(
      "history",
    );
  });

  it("opens utility details by resetting competing chrome", () => {
    const controls = buildUtilityChromeControls();
    const details = { open: true } as HTMLDetailsElement;

    expect(
      openShenutePageUtilityDetails({
        closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
        details,
        setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
        setMobileUtilitySheet: controls.setMobileUtilitySheet,
      }),
    ).toBe(true);

    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledWith(details);
  });

  it("ignores closed utility details", () => {
    const controls = buildUtilityChromeControls();

    expect(
      openShenutePageUtilityDetails({
        closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
        details: { open: false } as HTMLDetailsElement,
        setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
        setMobileUtilitySheet: controls.setMobileUtilitySheet,
      }),
    ).toBe(false);

    expect(controls.setIsUtilityChromeCollapsed).not.toHaveBeenCalled();
    expect(controls.setMobileUtilitySheet).not.toHaveBeenCalled();
    expect(controls.closeOpenUtilityDetails).not.toHaveBeenCalled();
  });

  it("opens response details by closing utility and competing response details", () => {
    const controls = buildUtilityChromeControls();
    const details = { open: true } as HTMLDetailsElement;

    expect(
      openShenutePageResponseDetails({
        closeOpenResponseDetails: controls.closeOpenResponseDetails,
        closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
        details,
        setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
        setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
        setMobileUtilitySheet: controls.setMobileUtilitySheet,
      }),
    ).toBe(true);

    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledWith();
    expect(controls.closeOpenResponseDetails).toHaveBeenCalledWith(details);
  });

  it("toggles a mobile utility sheet after closing desktop utility details", () => {
    const controls = buildUtilityChromeControls();

    toggleShenutePageMobileUtilitySheet({
      closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
      setMobileUtilitySheet: controls.setMobileUtilitySheet,
      sheet: "history",
    });

    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    const sheetUpdater = controls.setMobileUtilitySheet.mock.calls[0]?.[0];
    expect(sheetUpdater).toEqual(expect.any(Function));
    if (typeof sheetUpdater !== "function") {
      throw new Error("Expected a mobile sheet updater.");
    }
    expect(sheetUpdater(null)).toBe("history");
    expect(sheetUpdater("history")).toBeNull();
  });

  it("toggles the answer style panel after closing utility sheet chrome", () => {
    const controls = buildUtilityChromeControls();

    toggleShenutePageAnswerStylePanel({
      closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
      setMobileUtilitySheet: controls.setMobileUtilitySheet,
    });

    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setMobileUtilitySheet).toHaveBeenCalledWith(null);
    const answerStyleUpdater =
      controls.setIsAnswerStylePanelOpen.mock.calls[0]?.[0];
    expect(answerStyleUpdater).toEqual(expect.any(Function));
    if (typeof answerStyleUpdater !== "function") {
      throw new Error("Expected an answer style updater.");
    }
    expect(answerStyleUpdater(false)).toBe(true);
    expect(answerStyleUpdater(true)).toBe(false);
  });

  it("opens the attachment menu by closing competing page chrome", () => {
    const controls = buildUtilityChromeControls();

    openShenutePageAttachmentMenuChrome({
      closeOpenResponseDetails: controls.closeOpenResponseDetails,
      closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
      setMobileUtilitySheet: controls.setMobileUtilitySheet,
    });

    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(controls.closeOpenResponseDetails).toHaveBeenCalledTimes(1);
  });

  it("prepares new conversation chrome without forcing the toolbar open", () => {
    const controls = buildUtilityChromeControls();

    prepareShenutePageNewConversationChrome({
      closeOpenUtilityDetails: controls.closeOpenUtilityDetails,
      setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
      setMobileUtilitySheet: controls.setMobileUtilitySheet,
    });

    expect(controls.closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(controls.setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(controls.setIsUtilityChromeCollapsed).not.toHaveBeenCalled();
  });

  it("selects an answer style provider and closes the panel", () => {
    const controls = buildUtilityChromeControls();

    selectShenutePageAnswerStyleProvider({
      provider: "gemini_nmt",
      setInferenceProvider: controls.setInferenceProvider,
      setIsAnswerStylePanelOpen: controls.setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed: controls.setIsUtilityChromeCollapsed,
    });

    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(controls.setInferenceProvider).toHaveBeenCalledWith("gemini_nmt");
    expect(controls.setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
  });

  it("stops response, closes chrome, and focuses the composer on the next frame", () => {
    const closeOpenResponseDetails = vi.fn();
    const closeOpenUtilityDetails = vi.fn();
    const focus = vi.fn();
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const setIsAnswerStylePanelOpen = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();
    const setMobileUtilitySheet = vi.fn();
    const stopChatResponse = vi.fn();

    stopShenutePageResponse({
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      messageInput: { focus },
      requestAnimationFrame,
      setIsAnswerStylePanelOpen,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
      stopChatResponse,
    });

    expect(stopChatResponse).toHaveBeenCalledTimes(1);
    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(closeOpenResponseDetails).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();

    frameCallbacks[0]?.(0);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
