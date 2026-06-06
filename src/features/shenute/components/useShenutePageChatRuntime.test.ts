import { describe, expect, it } from "vitest";

import type { ChatMessageLike } from "@/features/shenute/shared";

import {
  createShenutePageChatTransport,
  getShenutePageRuntimeMessages,
  shouldSyncShenutePageRuntimeMessages,
} from "./useShenutePageChatRuntime";

describe("Shenute page chat runtime helpers", () => {
  it("creates the Shenute API transport", () => {
    expect(createShenutePageChatTransport()).toMatchObject({
      api: "/api/shenute",
    });
  });

  it("normalizes runtime messages before the page consumes them", () => {
    const messages: ChatMessageLike[] = [
      {
        content: "First draft",
        id: "",
        role: "user",
      },
      {
        content: "Older assistant message",
        id: "assistant-1",
        role: "assistant",
      },
      {
        content: "Updated assistant message",
        id: "assistant-1",
        role: "assistant",
      },
    ];

    expect(getShenutePageRuntimeMessages(messages)).toEqual([
      {
        content: "First draft",
        id: "message-0",
        role: "user",
      },
      {
        content: "Updated assistant message",
        id: "assistant-1",
        role: "assistant",
      },
    ]);
  });

  it("syncs the AI SDK message store only when normalization changes length", () => {
    expect(
      shouldSyncShenutePageRuntimeMessages({
        rawMessagesLength: 3,
        runtimeMessagesLength: 2,
      }),
    ).toBe(true);
    expect(
      shouldSyncShenutePageRuntimeMessages({
        rawMessagesLength: 2,
        runtimeMessagesLength: 2,
      }),
    ).toBe(false);
  });
});
