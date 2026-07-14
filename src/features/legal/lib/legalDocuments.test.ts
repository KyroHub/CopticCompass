import { describe, expect, it } from "vitest";

import type { Language } from "@/types/i18n";

import { getCookiesDocument, getPrivacyDocument } from "./legalDocuments";

const LOCALES = ["en", "nl"] as const satisfies readonly Language[];

describe("legal documents", () => {
  it("provides localized privacy documents that mention cookies and storage", () => {
    for (const locale of LOCALES) {
      const document = getPrivacyDocument(locale);

      expect(document.title).toBeTruthy();
      expect(document.description).toBeTruthy();
      expect(document.sections.length).toBeGreaterThan(0);
      expect(
        document.sections.some((section) =>
          section.title.toLowerCase().includes("cookies"),
        ),
      ).toBe(true);
    }
  });

  it("documents the email tracking posture in the privacy policy", () => {
    const englishPrivacy = getPrivacyDocument("en");
    const dutchPrivacy = getPrivacyDocument("nl");

    expect(
      englishPrivacy.sections.some((section) =>
        section.body.includes("we do not use email open or click engagement"),
      ),
    ).toBe(true);
    expect(
      dutchPrivacy.sections.some((section) =>
        section.body.includes("open- of klikbetrokkenheid"),
      ),
    ).toBe(true);
  });

  it("provides localized cookie documents with compact storage categories", () => {
    for (const locale of LOCALES) {
      const document = getCookiesDocument(locale);

      expect(document.title).toBeTruthy();
      expect(document.description).toBeTruthy();
      expect(document.sections.length).toBeGreaterThanOrEqual(7);
      expect(document.sections.some((section) => section.bullets?.length)).toBe(
        true,
      );
      expect(
        document.sections.some((section) => section.body.includes("Vercel")),
      ).toBe(true);
    }
  });
});
