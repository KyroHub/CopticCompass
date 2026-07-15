import { describe, expect, it } from "vitest";

import {
  buildPublicationOpenGraphImageUrl,
  buildPublicationOpenGraphPreview,
} from "./publicationOpenGraph";
import { getPublicationById } from "./publications";

describe("publication Open Graph helpers", () => {
  it("builds a stable publication-specific Open Graph image URL", () => {
    expect(
      buildPublicationOpenGraphImageUrl(
        "holy-bible-coptic",
        "en",
        "https://example.com",
      ),
    ).toBe(
      "https://example.com/api/og?type=publication&locale=en&id=holy-bible-coptic",
    );
  });

  it("builds a localized preview for publication cards", () => {
    const publication = getPublicationById("holy-bible-coptic");

    expect(publication).not.toBeNull();

    const preview = buildPublicationOpenGraphPreview(publication!, "en");

    expect(preview.eyebrow).toBe("Publications");
    expect(preview.footerLabel).toBe("Coptic Compass • Publications");
    expect(preview.statusLabel).toBe("Available now");
    expect(preview.languageLabel).toBe("COP · Book · 2023");
    expect(preview.summary).toContain(
      "Edited and compiled by Kyrillos Wannes.",
    );
    expect(preview.title.length).toBeGreaterThan(0);
  });

  it("includes contributor, format, and year metadata for published books", () => {
    const publication = getPublicationById("parallel-paradigms-coptic");

    expect(publication).not.toBeNull();

    const preview = buildPublicationOpenGraphPreview(publication!, "en");

    expect(preview.statusLabel).toBe("Available now");
    expect(preview.languageLabel).toBe("EN · Book · 2026");
    expect(preview.summary).toContain("By Kyrillos Wannes.");
  });
});
