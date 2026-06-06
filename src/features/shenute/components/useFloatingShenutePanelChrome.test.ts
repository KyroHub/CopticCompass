import { describe, expect, it, vi } from "vitest";

import {
  closeFloatingShenuteAttachmentMenu,
  isFloatingShenuteEscapeKey,
  persistFloatingShenuteWorkspaceHandoff,
  shouldCloseFloatingShenuteAttachmentMenu,
  stopFloatingShenuteResponse,
} from "./useFloatingShenutePanelChrome";

const pageContext = {
  excerpt: "Current page excerpt",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

describe("floating Shenute panel chrome helpers", () => {
  it("detects Escape key dismissal", () => {
    expect(isFloatingShenuteEscapeKey({ key: "Escape" })).toBe(true);
    expect(isFloatingShenuteEscapeKey({ key: "Enter" })).toBe(false);
  });

  it("detects attachment menu outside clicks", () => {
    const insideTarget = {};
    const outsideTarget = {};
    const details = {
      contains: vi.fn((target: unknown) => target === insideTarget),
    };

    expect(
      shouldCloseFloatingShenuteAttachmentMenu(
        details as unknown as HTMLDetailsElement,
        insideTarget as EventTarget,
      ),
    ).toBe(false);
    expect(
      shouldCloseFloatingShenuteAttachmentMenu(
        details as unknown as HTMLDetailsElement,
        outsideTarget as EventTarget,
      ),
    ).toBe(true);
    expect(
      shouldCloseFloatingShenuteAttachmentMenu(
        null,
        outsideTarget as EventTarget,
      ),
    ).toBe(false);
  });

  it("closes the attachment menu details element and state", () => {
    const details = {
      contains: vi.fn(),
      open: true,
    };
    const setIsOpen = vi.fn();

    closeFloatingShenuteAttachmentMenu({
      details: details as unknown as HTMLDetailsElement,
      setIsOpen,
    });

    expect(details.open).toBe(false);
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("stops the response, closes chrome, and focuses the composer on the next frame", () => {
    const closeAttachmentMenu = vi.fn();
    const focus = vi.fn();
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const setIsAnswerStylePanelOpen = vi.fn();
    const stop = vi.fn();

    stopFloatingShenuteResponse({
      closeAttachmentMenu,
      messageInput: { focus },
      requestAnimationFrame,
      setIsAnswerStylePanelOpen,
      stop,
    });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(closeAttachmentMenu).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();

    frameCallbacks[0]?.(0);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("persists the workspace handoff with fresh page context", () => {
    const persistHandoff = vi.fn(() => true);
    const readPageContext = vi.fn(() => pageContext);
    const messages = [
      { content: "Hello", id: "user-1", role: "user" as const },
    ];

    expect(
      persistFloatingShenuteWorkspaceHandoff({
        inferenceProvider: "thoth",
        messages,
        persistHandoff,
        readPageContext,
      }),
    ).toBe(true);
    expect(readPageContext).toHaveBeenCalledTimes(1);
    expect(persistHandoff).toHaveBeenCalledWith({
      inferenceProvider: "thoth",
      messages,
      pageContext,
    });
  });
});
