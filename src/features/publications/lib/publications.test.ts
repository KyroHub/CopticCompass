import { access } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  buildPublicationDescription,
  buildPublicationSearchText,
  getPublicationBindings,
  getPublicationById,
  getPublicationImage,
  getPublicationImages,
  getPublicationPrimaryContributor,
  getPublicationPurchaseLinks,
  getPublicationVolumeLabel,
  getPublicationYear,
  publications,
  sortPublicationsForCatalog,
  validatePublications,
  type Publication,
} from "@/features/publications/lib/publications";

describe("publication descriptions", () => {
  it("describes publications as part of the Coptic Compass catalog", () => {
    const publication = getPublicationById("holy-bible-coptic");

    expect(publication).not.toBeNull();
    expect(buildPublicationDescription(publication!, "en")).toContain(
      "through Coptic Compass",
    );
    expect(getPublicationPrimaryContributor(publication!)).toMatchObject({
      name: "Kyrillos Wannes",
      role: "compiler",
    });
    expect(getPublicationBindings(publication!)).toEqual(["ebook"]);
    expect(getPublicationYear(publication!)).toBe("2023");
  });

  it("uses the recorded contributor role in descriptions", () => {
    const publication = getPublicationById("speak-with-us-coptic-curriculum");

    expect(publication).not.toBeNull();
    expect(buildPublicationDescription(publication!, "en")).toContain(
      "Translated by Kyrillos Wannes.",
    );
    expect(buildPublicationDescription(publication!, "en")).toContain(
      "through Coptic Compass",
    );
  });

  it("validates the complete publication catalog", () => {
    expect(validatePublications(publications)).toEqual([]);
  });

  it("rejects unsafe URLs, invalid ISBN checksums, and impossible dates", () => {
    const invalidPublication: Publication = {
      id: "invalid-publication",
      title: "Invalid publication",
      lang: "EN",
      type: "book",
      status: "forthcoming",
      summary: { en: "Invalid test record", nl: "Ongeldig testrecord" },
      publisher: {
        name: "Unsafe publisher",
        url: "javascript:alert(1)",
      },
      editions: [
        {
          id: "invalid-edition",
          statement: { en: "Invalid edition" },
          publicationDate: "2026-02-31",
          formats: [
            {
              id: "paperback",
              binding: "paperback",
              isbn13: "9798397143722",
              links: [
                {
                  kind: "purchase",
                  url: "http://example.com/book",
                },
              ],
            },
          ],
        },
      ],
      catalogRecords: [
        {
          authority: "Unsafe catalog",
          url: "ftp://example.com/catalog",
        },
      ],
      rights: {
        copyrightYear: 2026,
        holder: "Test holder",
        permissionsContact: {
          email: "not-an-email",
          url: "//example.com/contact",
        },
      },
    };

    expect(validatePublications([invalidPublication])).toEqual(
      expect.arrayContaining([
        expect.stringContaining("invalid publisher URL"),
        expect.stringContaining("invalid permissions URL"),
        expect.stringContaining("invalid permissions email"),
        expect.stringContaining("invalid publication date"),
        expect.stringContaining("invalid ISBN-13"),
        expect.stringContaining("invalid URL http://example.com/book"),
        expect.stringContaining("invalid catalog URL"),
      ]),
    );
  });

  it("keeps declared publication images present and dimensionally accurate", async () => {
    for (const publication of publications) {
      for (const image of getPublicationImages(publication)) {
        const filePath = path.join(
          process.cwd(),
          "public",
          image.src.replace(/^\/+/, ""),
        );
        await access(filePath);
        const metadata = await sharp(filePath).metadata();

        expect(metadata.width, image.src).toBe(image.width);
        expect(metadata.height, image.src).toBe(image.height);
      }
    }
  });

  it("represents the grammar bindings as distinct edition formats", () => {
    const publication = getPublicationById(
      "basisgrammatica-bohairisch-koptisch",
    );

    expect(publication?.status).toBe("published");
    expect(getPublicationBindings(publication!)).toEqual([
      "paperback",
      "hardcover",
    ]);
    expect(
      publication?.editions?.[0]?.formats.map((format) => format.isbn13),
    ).toEqual(["9798397143721", "9798863142357"]);
    expect(getPublicationPurchaseLinks(publication!)).toHaveLength(1);
    expect(
      getPublicationImages(publication!).map((image) => image.role),
    ).toEqual(["front-cover", "back-cover", "mockup-3d"]);
    expect(getPublicationImage(publication!, "front-cover")?.src).toBe(
      "/publications/basisgrammatica-bohairisch-koptisch/front-cover.webp",
    );
  });

  it("classifies Parallel Paradigms as a published book", () => {
    const publication = getPublicationById("parallel-paradigms-coptic");

    expect(publication).toMatchObject({
      status: "published",
      type: "book",
    });
    expect(publication?.editions?.[0]?.formats[0]?.isbn13).toBe(
      "9798184913094",
    );
    expect(
      getPublicationImage(publication!, "mockup-3d", "paperback")?.src,
    ).toBe("/publications/parallel-paradigms-coptic/mockup-paperback.webp");
  });

  it("indexes contributors, ISBNs, publishers, and catalog identifiers", () => {
    const publication = getPublicationById(
      "basisgrammatica-bohairisch-koptisch",
    );
    const searchText = buildPublicationSearchText(publication!, "nl");

    expect(searchText).toContain("jacques van der vliet");
    expect(searchText).toContain("9798397143721");
    expect(searchText).toContain("coptic compass");
    expect(searchText).toContain("syracuse/22087911");
  });

  it("sorts published works first and alphabetizes titles within each status", () => {
    const sorted = sortPublicationsForCatalog(publications, "en");

    expect(sorted.map((publication) => publication.title)).toEqual([
      "Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
      "Parallel Paradigms of Bohairic and Sahidic Coptic",
      "The Holy Bible in Coptic",
      "Bohairisch–Nederlands Woordenboek: Een Beknopt Lexicon van het Koptisch",
      "Complex Verb Constructions in Coptic: Lexical and Morphological Perspectives from Bohairic and Sahidic",
      "Speak with Us: A Bohairic Coptic Curriculum",
      "Tales and Legends: A Bohairic Coptic Reader",
    ]);
  });

  it("builds localized volume badges from explicit series metadata", () => {
    const grammar = getPublicationById("basisgrammatica-bohairisch-koptisch");
    const reader = getPublicationById("tales-and-legends-reader");

    expect(getPublicationVolumeLabel(grammar!, "nl")).toBe("Deel I");
    expect(getPublicationVolumeLabel(grammar!, "en")).toBe("Vol. I");
    expect(getPublicationVolumeLabel(reader!, "nl")).toBe("Deel I");
  });
});
