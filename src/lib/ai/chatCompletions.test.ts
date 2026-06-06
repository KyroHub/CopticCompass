import { describe, expect, it } from "vitest";

import {
  normalizeAssistantResponseText,
  normalizeOpenAiChatCompletionResponse,
  normalizeOpenRouterChatCompletionResponse,
  normalizeThothChatCompletionResponse,
} from "./chatCompletions";

describe("chat completion normalization", () => {
  it("preserves non-empty provider text and falls back for blanks", () => {
    expect(normalizeAssistantResponseText("  answer\n", "fallback")).toBe(
      "  answer\n",
    );
    expect(normalizeAssistantResponseText("   ", "fallback")).toBe("fallback");
    expect(normalizeAssistantResponseText(null, "fallback")).toBe("fallback");
  });

  it("normalizes OpenAI-compatible completion content", () => {
    expect(
      normalizeOpenAiChatCompletionResponse(
        {
          choices: [{ message: { content: "HF answer." } }],
        },
        "HF fallback.",
      ),
    ).toEqual({ responseText: "HF answer." });
  });

  it("keeps OpenRouter reasoning details even when text falls back", () => {
    expect(
      normalizeOpenRouterChatCompletionResponse(
        {
          choices: [
            {
              message: {
                content: "",
                reasoning_details: [{ type: "summary", text: "reasoning" }],
              },
            },
          ],
        },
        "OpenRouter fallback.",
      ),
    ).toEqual({
      responseText: "OpenRouter fallback.",
      reasoningDetails: [{ type: "summary", text: "reasoning" }],
    });
  });

  it("normalizes THOTH answers", () => {
    expect(
      normalizeThothChatCompletionResponse(
        { answer: "Expert answer." },
        "THOTH fallback.",
      ),
    ).toEqual({ responseText: "Expert answer." });
  });
});
