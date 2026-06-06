import { describe, expect, it, vi } from "vitest";

import type { ChatMessageLike } from "@/features/shenute/shared";

import {
  copyShenuteMessage,
  getShenuteMessageCopyStatus,
  getShenuteMessageCopyText,
} from "./useShenuteMessageCopy";

const copy = {
  copiedResponse: "Copied.",
  copyResponseManual: "Copy manually.",
};

const message = {
  content: "  ⲡⲉ copied text  ",
  id: "assistant-1",
  role: "assistant",
} satisfies ChatMessageLike;

describe("Shenute message copy helpers", () => {
  it("resolves copy text from message content", () => {
    expect(getShenuteMessageCopyText(message)).toBe("ⲡⲉ copied text");
    expect(
      getShenuteMessageCopyText({
        content: "   ",
        id: "assistant-2",
        role: "assistant",
      }),
    ).toBeNull();
  });

  it("maps clipboard results to temporary action states", () => {
    expect(getShenuteMessageCopyStatus(true, copy)).toEqual({
      message: copy.copiedResponse,
      status: "success",
    });
    expect(getShenuteMessageCopyStatus(false, copy)).toEqual({
      message: copy.copyResponseManual,
      status: "pending",
    });
  });

  it("copies message text and publishes a success status", async () => {
    const copyText = vi.fn(async () => true);
    const onManualCopyRequired = vi.fn();
    const onSuccessfulCopy = vi.fn();
    const setTemporaryMessageActionState = vi.fn();

    await expect(
      copyShenuteMessage({
        copy,
        copyText,
        message,
        onManualCopyRequired,
        onSuccessfulCopy,
        setTemporaryMessageActionState,
      }),
    ).resolves.toEqual({
      copied: true,
      text: "ⲡⲉ copied text",
    });
    expect(copyText).toHaveBeenCalledWith("ⲡⲉ copied text");
    expect(onSuccessfulCopy).toHaveBeenCalledTimes(1);
    expect(onManualCopyRequired).not.toHaveBeenCalled();
    expect(setTemporaryMessageActionState).toHaveBeenCalledWith(
      "assistant-1",
      copy.copiedResponse,
      "success",
    );
  });

  it("opens manual fallback and publishes a pending status when copy fails", async () => {
    const copyText = vi.fn(async () => false);
    const onManualCopyRequired = vi.fn();
    const onSuccessfulCopy = vi.fn();
    const setTemporaryMessageActionState = vi.fn();

    await expect(
      copyShenuteMessage({
        copy,
        copyText,
        message,
        onManualCopyRequired,
        onSuccessfulCopy,
        setTemporaryMessageActionState,
      }),
    ).resolves.toEqual({
      copied: false,
      text: "ⲡⲉ copied text",
    });
    expect(onManualCopyRequired).toHaveBeenCalledWith("ⲡⲉ copied text");
    expect(onSuccessfulCopy).not.toHaveBeenCalled();
    expect(setTemporaryMessageActionState).toHaveBeenCalledWith(
      "assistant-1",
      copy.copyResponseManual,
      "pending",
    );
  });

  it("skips clipboard work for empty messages", async () => {
    const copyText = vi.fn(async () => true);
    const setTemporaryMessageActionState = vi.fn();

    await expect(
      copyShenuteMessage({
        copy,
        copyText,
        message: {
          content: "",
          id: "assistant-2",
          role: "assistant",
        },
        setTemporaryMessageActionState,
      }),
    ).resolves.toEqual({
      copied: false,
      text: null,
    });
    expect(copyText).not.toHaveBeenCalled();
    expect(setTemporaryMessageActionState).not.toHaveBeenCalled();
  });
});
