import { describe, expect, it } from "vitest";

import {
  isShenuteHistoryPayloadTooLarge,
  normalizeShenuteSavedChatRows,
  parseShenuteHistoryMessages,
  toOptionalShenuteHistorySessionId,
} from "./historyPayload";

describe("Shenute history payload helpers", () => {
  it("validates bounded content-length headers", () => {
    expect(isShenuteHistoryPayloadTooLarge(String(256 * 1024))).toBe(false);
    expect(isShenuteHistoryPayloadTooLarge(String(256 * 1024 + 1))).toBe(true);
    expect(isShenuteHistoryPayloadTooLarge("not-a-number")).toBe(false);
  });

  it("normalizes UUID session ids", () => {
    expect(
      toOptionalShenuteHistorySessionId(
        " 11111111-1111-4111-8111-111111111111 ",
      ),
    ).toBe("11111111-1111-4111-8111-111111111111");
    expect(toOptionalShenuteHistorySessionId("not-a-uuid")).toBeUndefined();
  });

  it("parses client messages and drops invalid entries", () => {
    expect(
      parseShenuteHistoryMessages([
        {
          id: "client-1",
          role: "assistant",
          content: " Answer ",
          parts: [
            { type: "text", text: "Answer" },
            { type: "image", text: "ignored" },
          ],
        },
        { id: "missing-content", role: "user", content: "" },
        { id: "client-2", role: "tool", content: "Prompt" },
      ]),
    ).toEqual([
      {
        id: "client-1",
        role: "assistant",
        content: "Answer",
        parts: [{ type: "text", text: "Answer" }],
      },
      {
        id: "client-2",
        role: "user",
        content: "Prompt",
        parts: undefined,
      },
    ]);
  });

  it("deduplicates persisted rows by client message id", () => {
    expect(
      normalizeShenuteSavedChatRows([
        {
          id: "row-1",
          client_message_id: "client-1",
          role: "user",
          content: "Old prompt",
          metadata: { parts: [{ text: "Old prompt", type: "text" }] },
        },
        {
          id: "row-2",
          client_message_id: "client-1",
          role: "assistant",
          content: "Updated answer",
          metadata: null,
        },
      ]),
    ).toEqual([
      {
        id: "client-1",
        role: "assistant",
        content: "Updated answer",
        parts: undefined,
      },
    ]);
  });
});
