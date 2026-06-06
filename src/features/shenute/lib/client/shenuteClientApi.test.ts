import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatMessageLike } from "@/features/shenute/shared";

import {
  deleteShenuteSessionOnline,
  loadShenuteHistoryOnline,
  loadShenuteSessionOnline,
  saveChatHistoryOnline,
  submitShenuteFeedbackOnline,
} from "./shenuteClientApi";

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function parseRequestBody(init: RequestInit | undefined) {
  expect(typeof init?.body).toBe("string");
  return JSON.parse(init?.body as string) as Record<string, unknown>;
}

describe("Shenute client API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the active history payload", async () => {
    const payload = {
      messages: [{ content: "ⲡⲉ", id: "message-1", role: "user" }],
      sessionId: "session-1",
      sessions: [
        {
          id: "session-1",
          title: "ⲡⲉ",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      success: true,
    };
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        createJsonResponse(payload),
    );

    await expect(
      loadShenuteHistoryOnline(fetcher as unknown as typeof fetch),
    ).resolves.toEqual({
      ok: true,
      payload,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/shenute/history");
  });

  it("loads a selected session with the encoded session id", async () => {
    const payload = {
      messages: [],
      sessionId: "session / 1",
      success: true,
    };
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        createJsonResponse(payload),
    );

    await expect(
      loadShenuteSessionOnline(
        "session / 1",
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      ok: true,
      payload,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/shenute/history?sessionId=session%20%2F%201",
    );
  });

  it("deletes a selected history session", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      deleteShenuteSessionOnline(
        "session / 1",
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/shenute/history?sessionId=session%20%2F%201",
      {
        method: "DELETE",
      },
    );
  });

  it("serializes chat messages before saving history", async () => {
    vi.stubGlobal("window", {});
    const payload = {
      sessionId: "session-1",
      sessions: [],
      success: true,
    };
    const fetcher = vi.fn(async () => createJsonResponse(payload));
    const messages: ChatMessageLike[] = [
      {
        content: "  direct content  ",
        id: "user-1",
        parts: [
          { text: "part text", type: "text" },
          { value: "ignored", type: "tool" },
        ],
        role: "user",
      },
      {
        id: "assistant-1",
        parts: [
          { text: "first", type: "text" },
          { text: "second", type: "text" },
        ],
        role: "assistant",
      },
    ];

    await expect(
      saveChatHistoryOnline(
        messages,
        "session-1",
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith("/api/shenute/history", {
      body: JSON.stringify({
        messages: [
          {
            content: "direct content",
            id: "user-1",
            parts: [{ text: "part text", type: "text" }],
            role: "user",
          },
          {
            content: "first\nsecond",
            id: "assistant-1",
            parts: [
              { text: "first", type: "text" },
              { text: "second", type: "text" },
            ],
            role: "assistant",
          },
        ],
        sessionId: "session-1",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("does not attempt to save browser history on the server", async () => {
    vi.stubGlobal("window", undefined);
    const fetcher = vi.fn();

    await expect(
      saveChatHistoryOnline(
        [],
        "session-1",
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual({ success: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts Shenute feedback with the expected body", async () => {
    const payload = {
      ragIngested: true,
      success: true,
    };
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        createJsonResponse(payload),
    );

    await expect(
      submitShenuteFeedbackOnline(
        {
          assistantMessageId: "assistant-1",
          assistantResponse: "A response",
          feedbackText: "Add this correction",
          inferenceProvider: "gemini_nmt",
          pageContext: {
            excerpt: "Context excerpt",
            path: "/grammar",
            title: "Grammar",
            url: "https://www.copticcompass.com/grammar",
          },
          prompt: "A prompt",
          shenuteSessionId: "session-1",
          signal: "admin_feedback",
          userMessageId: "user-1",
        },
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      ok: true,
      payload,
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("/api/shenute/feedback");
    expect(init).toMatchObject({
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(parseRequestBody(init)).toEqual({
      assistantMessageId: "assistant-1",
      assistantResponse: "A response",
      feedbackText: "Add this correction",
      inferenceProvider: "gemini_nmt",
      pageContext: {
        excerpt: "Context excerpt",
        path: "/grammar",
        title: "Grammar",
        url: "https://www.copticcompass.com/grammar",
      },
      prompt: "A prompt",
      shenuteSessionId: "session-1",
      signal: "admin_feedback",
      userMessageId: "user-1",
    });
  });

  it("returns a structured feedback failure for non-json responses", async () => {
    const fetcher = vi.fn(
      async () => new Response("<h1>Feedback failed</h1>", { status: 500 }),
    );

    await expect(
      submitShenuteFeedbackOnline(
        {
          assistantMessageId: "assistant-1",
          assistantResponse: "A response",
          inferenceProvider: "gemini",
          prompt: "A prompt",
          shenuteSessionId: "session-1",
          signal: "like",
          userMessageId: "user-1",
        },
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      ok: false,
      payload: { success: false },
    });
  });
});
