import { describe, expect, it, vi } from "vitest";

import {
  buildFloatingShenuteChatHistoryFilename,
  downloadFloatingShenuteChatHistory,
} from "./useFloatingShenuteChatHistoryDownload";

const pageContext = {
  excerpt: "Alpha Beta",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

describe("floating Shenute chat history download helpers", () => {
  it("builds the existing timestamped transcript filename", () => {
    expect(
      buildFloatingShenuteChatHistoryFilename(
        new Date("2026-01-02T03:04:05.000Z"),
      ),
    ).toBe("shenute-chat-history-2026-01-02T03-04-05-000Z.txt");
  });

  it("downloads the formatted transcript and revokes the object URL", async () => {
    const anchor = {
      click: vi.fn(),
      download: "",
      href: "",
    };
    const downloadedBlobs: Blob[] = [];
    const createObjectUrl = vi.fn((blob: Blob) => {
      downloadedBlobs.push(blob);
      return "blob:shenute-history";
    });
    const revokeObjectUrl = vi.fn();

    const result = downloadFloatingShenuteChatHistory({
      createAnchor: () => anchor,
      createObjectUrl,
      messages: [{ content: "  Hello  ", id: "user-1", role: "user" }],
      pageContext,
      provider: "thoth",
      revokeObjectUrl,
      savedAt: new Date("2026-01-02T03:04:05.000Z"),
    });

    expect(anchor).toEqual({
      click: expect.any(Function),
      download: "shenute-chat-history-2026-01-02T03-04-05-000Z.txt",
      href: "blob:shenute-history",
    });
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:shenute-history");
    expect(result).toEqual({
      blob: downloadedBlobs[0],
      filename: "shenute-chat-history-2026-01-02T03-04-05-000Z.txt",
      historyText: [
        "Shenute AI chat history",
        "Page: Grammar | Coptic Compass",
        "URL: https://www.copticcompass.com/en/grammar",
        "Provider: thoth",
        "Saved: 2026-01-02T03:04:05.000Z",
        "",
        "User:",
        "Hello",
        "",
      ].join("\n"),
      url: "blob:shenute-history",
    });
    await expect(downloadedBlobs[0]?.text()).resolves.toBe(result.historyText);
    expect(downloadedBlobs[0]?.type).toBe("text/plain;charset=utf-8");
  });
});
