import { describe, expect, it } from "vitest";

import { detectReadableSourceType, getFileExtension } from "@/lib/sourceFiles";

describe("source file primitives", () => {
  it("extracts lowercase file extensions", () => {
    expect(getFileExtension("lesson.JSON")).toBe("json");
    expect(getFileExtension("README")).toBe("readme");
  });

  it("classifies readable source files by MIME type or extension", () => {
    expect(
      detectReadableSourceType({
        name: "scan",
        type: "image/png",
      }),
    ).toBe("image");
    expect(
      detectReadableSourceType({
        name: "notes.md",
        type: "",
      }),
    ).toBe("text");
    expect(
      detectReadableSourceType({
        name: "grammar.pdf",
        type: "",
      }),
    ).toBe("pdf");
  });

  it("rejects unsupported source files", () => {
    expect(
      detectReadableSourceType({
        name: "archive.zip",
        type: "application/zip",
      }),
    ).toBeNull();
  });
});
