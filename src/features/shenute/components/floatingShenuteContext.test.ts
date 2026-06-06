import { describe, expect, it, vi } from "vitest";

import { SHENUTE_HANDOFF_STORAGE_KEY } from "@/features/shenute/handoff";

import {
  buildFloatingShenuteHandoffPayload,
  buildFloatingShenutePageContext,
  formatFloatingShenuteChatHistory,
  getFloatingShenutePageContextLabel,
  persistFloatingShenuteHandoff,
  readFloatingShenutePageContext,
} from "./floatingShenuteContext";

const pageContext = {
  excerpt: "Alpha Beta",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

describe("floating Shenute context helpers", () => {
  it("builds page context from main text before body text", () => {
    expect(
      buildFloatingShenutePageContext({
        bodyText: "Body fallback",
        mainText: "  Alpha\n\n\tBeta   ",
        pathname: "/en/grammar",
        title: "  Grammar | Coptic Compass  ",
        url: "https://www.copticcompass.com/en/grammar",
      }),
    ).toEqual(pageContext);
  });

  it("falls back to body text when the main region is blank", () => {
    expect(
      buildFloatingShenutePageContext({
        bodyText: "  Body\n\nCopy  ",
        mainText: " \n\t ",
        pathname: "/en/dictionary",
      }).excerpt,
    ).toBe("Body Copy");
  });

  it("returns empty browser-derived context during server rendering", () => {
    expect(readFloatingShenutePageContext("/en/dictionary")).toEqual({
      excerpt: "",
      path: "/en/dictionary",
      title: "",
      url: "",
    });
  });

  it("formats localized page context labels", () => {
    expect(getFloatingShenutePageContextLabel(pageContext, "nl")).toBe(
      "Grammatica",
    );
    expect(
      getFloatingShenutePageContextLabel(
        buildFloatingShenutePageContext({ pathname: "/en" }),
        "en",
      ),
    ).toBe("Home");
    expect(
      getFloatingShenutePageContextLabel(
        buildFloatingShenutePageContext({
          pathname: "/en/special-tools",
          title: "Special Tools | Coptic Compass",
        }),
        "en",
      ),
    ).toBe("Special Tools");
    expect(
      getFloatingShenutePageContextLabel(
        buildFloatingShenutePageContext({ pathname: "/en/special-tools" }),
        "en",
      ),
    ).toBe("Special Tools");
  });

  it("formats downloadable chat history with stable metadata", () => {
    expect(
      formatFloatingShenuteChatHistory(
        [
          { content: "  Hello  ", id: "user-1", role: "user" },
          {
            id: "assistant-1",
            parts: [{ text: "Answer", type: "text" }],
            role: "assistant",
          },
          { content: "", id: "system-1", role: "system" },
        ],
        pageContext,
        "thoth",
        new Date("2026-01-02T03:04:05.000Z"),
      ),
    ).toBe(
      [
        "Shenute AI chat history",
        "Page: Grammar | Coptic Compass",
        "URL: https://www.copticcompass.com/en/grammar",
        "Provider: thoth",
        "Saved: 2026-01-02T03:04:05.000Z",
        "",
        "User:",
        "Hello",
        "",
        "Assistant:",
        "Answer",
        "",
        "System:",
        "[no text]",
        "",
      ].join("\n"),
    );
  });

  it("builds floating handoff payloads for the full workspace", () => {
    expect(
      buildFloatingShenuteHandoffPayload({
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
        inferenceProvider: "gemini_nmt",
        messages: [
          { content: "  Hello  ", id: "user-1", role: "user" },
          { content: "", id: "assistant-1", role: "assistant" },
        ],
        pageContext,
      }),
    ).toEqual({
      createdAt: "2026-01-02T03:04:05.000Z",
      inferenceProvider: "gemini_nmt",
      messages: [
        {
          content: "Hello",
          id: "user-1",
          parts: [{ text: "Hello", type: "text" }],
          role: "user",
        },
        {
          content: "",
          id: "assistant-1",
          parts: undefined,
          role: "assistant",
        },
      ],
      pageContext,
      source: "floating",
    });
  });

  it("persists handoff payloads to session storage", () => {
    const storage = {
      setItem: vi.fn<(key: string, value: string) => void>(),
    };

    expect(
      persistFloatingShenuteHandoff({
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
        inferenceProvider: "thoth",
        messages: [{ content: "Hello", id: "user-1", role: "user" }],
        pageContext,
        storage,
      }),
    ).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      SHENUTE_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        createdAt: "2026-01-02T03:04:05.000Z",
        inferenceProvider: "thoth",
        messages: [
          {
            content: "Hello",
            id: "user-1",
            parts: [{ text: "Hello", type: "text" }],
            role: "user",
          },
        ],
        pageContext,
        source: "floating",
      }),
    );
  });

  it("reports storage failures without throwing", () => {
    expect(
      persistFloatingShenuteHandoff({
        inferenceProvider: "thoth",
        messages: [],
        pageContext,
        storage: {
          setItem: () => {
            throw new Error("Storage blocked.");
          },
        },
      }),
    ).toBe(false);
  });
});
