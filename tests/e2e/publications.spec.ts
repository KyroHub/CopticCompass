import { expect, test } from "@playwright/test";

test("publication catalog searches rich bibliographic metadata", async ({
  page,
}) => {
  await page.goto("/nl/publications");

  await expect(
    page.getByRole("heading", { level: 1, name: "Publicaties" }),
  ).toBeVisible();
  const harmonizedTitles = [
    "Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
    "Parallel Paradigms of Bohairic and Sahidic Coptic",
    "The Holy Bible in Coptic",
  ];
  const titleTopPositions = await Promise.all(
    harmonizedTitles.map((title) =>
      page
        .getByRole("heading", { level: 2, name: title })
        .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    ),
  );
  expect(new Set(titleTopPositions).size).toBe(1);

  const grammarTile = page.getByRole("link", {
    name: /Inleiding tot het Bohairisch Koptisch: Basisgrammatica/,
  });
  await expect(grammarTile.getByText("Deel I", { exact: true })).toBeVisible();
  await expect(grammarTile.getByText("Boek", { exact: true })).toHaveCount(0);

  const bibleTile = page.getByRole("link", {
    name: /The Holy Bible in Coptic/,
  });
  await expect(bibleTile).toContainText(
    "Redacteur / samensteller · Kyrillos Wannes",
  );
  await expect(bibleTile).toContainText("2023 · E-book");

  const search = page.getByRole("searchbox", {
    name: "Titel, auteur, ISBN, uitgever",
  });
  await search.fill("9798397143721");
  await expect(
    page.getByRole("link", {
      name: /Inleiding tot het Bohairisch Koptisch: Basisgrammatica/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Parallel Paradigms/ }),
  ).toHaveCount(0);

  await search.fill("Jacques van der Vliet");
  await expect(
    page.getByRole("link", {
      name: /Inleiding tot het Bohairisch Koptisch: Basisgrammatica/,
    }),
  ).toBeVisible();
});

test("grammar publication exposes editions, credits, catalog data, and rights", async ({
  page,
}) => {
  await page.goto("/nl/publications/basisgrammatica-bohairisch-koptisch");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Inleiding tot het Bohairisch Koptisch: Basisgrammatica",
    }),
  ).toBeVisible();
  const gallery = page.getByRole("region", {
    name: "Publicatieafbeeldingen",
  });
  await expect(
    gallery.getByRole("img", {
      name: /Voorkant van Inleiding tot het Bohairisch Koptisch/,
    }),
  ).toBeVisible();
  await gallery.getByRole("button", { name: "Achterkant" }).click();
  await expect(
    gallery.getByRole("img", {
      name: /Achterkant van Inleiding tot het Bohairisch Koptisch/,
    }),
  ).toBeVisible();
  await gallery.getByRole("button", { name: "3D-mock-up" }).click();
  await expect(
    gallery.getByRole("img", {
      name: /Driedimensionale paperbackmock-up/,
    }),
  ).toBeVisible();
  const summaryFacts = page.locator("main dl").filter({ hasText: "Status" });
  await expect(
    summaryFacts.getByText("Gepubliceerd", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Beschikbare uitvoeringen" }),
  ).toBeVisible();
  await expect(page.getByText("9798397143721", { exact: true })).toBeVisible();
  await expect(page.getByText("9798863142357", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Koop Paperback — Amazon.nl" }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Bekijk catalogusrecord" }),
  ).toHaveAttribute(
    "href",
    "https://opac.kbr.be/LIBRARY/doc/SYRACUSE/22087911",
  );
  await expect(page.getByText("Jacques van der Vliet")).toBeVisible();
  await expect(page.getByText("Mina Anton")).toBeVisible();

  const rights = page.locator("details").filter({
    hasText: "© 2026 Kyrillos Wannes",
  });
  await rights.locator("summary").click();
  await expect(
    page.getByText("Niets uit deze uitgave mag", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Neem contact op met de uitgever" }),
  ).toHaveAttribute("href", "/nl/contact");
});

test("Parallel Paradigms is rendered as a published paperback book", async ({
  page,
}) => {
  await page.goto("/en/publications/parallel-paradigms-coptic");

  const summaryFacts = page.locator("main dl").filter({ hasText: "Status" });
  await expect(
    summaryFacts.getByText("Published", { exact: true }),
  ).toBeVisible();
  await expect(summaryFacts.getByText("Book", { exact: true })).toBeVisible();
  await expect(page.getByText("Research Article", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("9798184913094", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Buy Paperback — Amazon.com" }),
  ).toHaveCount(2);
  const rights = page.locator("details").filter({
    hasText: "© 2026 Kyrillos Wannes",
  });
  await rights.locator("summary").click();
  await expect(
    page.getByRole("link", { name: "Contact the publisher" }),
  ).toHaveAttribute("href", "/en/contact");
});

test("rich publication details do not introduce mobile horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nl/publications/basisgrammatica-bohairisch-koptisch");

  await expect(
    page.getByRole("heading", { name: "Beschikbare uitvoeringen" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
