import { describe, expect, it } from "vitest";

import {
  parseShenuteFeedbackPayload,
  toShenuteFeedbackProvider,
  toShenuteFeedbackSignal,
} from "./feedbackPayload";

describe("Shenute feedback payload helpers", () => {
  it("maps public provider names to feedback embedding providers", () => {
    expect(toShenuteFeedbackProvider("gemini_nmt")).toBe("gemini");
    expect(toShenuteFeedbackProvider("thoth")).toBe("openrouter");
    expect(toShenuteFeedbackProvider("hf")).toBe("hf");
    expect(toShenuteFeedbackProvider("unknown")).toBe("openrouter");
  });

  it("normalizes valid feedback payloads", () => {
    expect(
      parseShenuteFeedbackPayload({
        assistantMessageId: " assistant-1 ",
        assistantResponse: "Here is an answer.",
        feedbackText: "  Please cite the lexicon.\n\n\nThanks. ",
        inferenceProvider: "thoth",
        pageContext: {
          path: "/en/dictionary",
          title: "Dictionary",
        },
        prompt: "Explain this form.",
        shenuteSessionId: "session-1",
        signal: "admin_feedback",
        userMessageId: "user-1",
      }),
    ).toEqual({
      success: true,
      payload: {
        assistantMessageId: "assistant-1",
        assistantResponse: "Here is an answer.",
        feedbackText: "Please cite the lexicon.\n\nThanks.",
        inferenceProvider: "openrouter",
        pageContext: {
          excerpt: undefined,
          path: "/en/dictionary",
          title: "Dictionary",
          url: undefined,
        },
        prompt: "Explain this form.",
        shenuteSessionId: "session-1",
        signal: "admin_feedback",
        userMessageId: "user-1",
      },
    });
  });

  it("leaves admin feedback text validation to the route authorization layer", () => {
    expect(
      parseShenuteFeedbackPayload({
        assistantResponse: "Answer",
        prompt: "Prompt",
        signal: "admin_feedback",
      }),
    ).toEqual({
      success: true,
      payload: {
        assistantMessageId: undefined,
        assistantResponse: "Answer",
        feedbackText: undefined,
        inferenceProvider: "openrouter",
        pageContext: undefined,
        prompt: "Prompt",
        shenuteSessionId: undefined,
        signal: "admin_feedback",
        userMessageId: undefined,
      },
    });
  });

  it("rejects invalid signals and missing message content", () => {
    expect(toShenuteFeedbackSignal("confusing")).toBeNull();
    expect(parseShenuteFeedbackPayload({ signal: "confusing" })).toEqual({
      success: false,
      reason: "invalid_signal",
    });
    expect(
      parseShenuteFeedbackPayload({
        assistantResponse: "",
        prompt: "Prompt",
        signal: "like",
      }),
    ).toEqual({
      success: false,
      reason: "invalid_message_content",
    });
  });
});
