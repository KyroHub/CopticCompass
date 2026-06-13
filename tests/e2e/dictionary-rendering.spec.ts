import { expect, test } from "@playwright/test";

import {
  getDictionaryEntryPath,
  getDictionaryRelationTarget,
  getUniqueDictionaryEntryByHeadword,
} from "./dictionary-fixtures";

const IMPERATIVE_ENTRY_PATH = getDictionaryEntryPath(
  getUniqueDictionaryEntryByHeadword("ϯ"),
);
const CAUSATIVE_ENTRY = getUniqueDictionaryEntryByHeadword("ⲧⲁⲗϭⲟ");
const CAUSATIVE_ENTRY_PATH = getDictionaryEntryPath(CAUSATIVE_ENTRY);
const CAUSATIVE_BASE_ENTRY_PATH = getDictionaryEntryPath(
  getDictionaryRelationTarget(CAUSATIVE_ENTRY, "CAUS_OF"),
);

test("dictionary entry renders imperative forms before imperative variants", async ({
  page,
}) => {
  await page.goto(IMPERATIVE_ENTRY_PATH);

  const article = page.locator("article").first();
  const imperativeSection = article.getByTestId(
    "dictionary-entry-imperative-section",
  );
  const variantsSection = article.getByTestId(
    "dictionary-entry-variants-section",
  );

  await expect(
    imperativeSection.getByText("Imperative", { exact: true }),
  ).toBeVisible();
  await expect(
    variantsSection.getByText("Variants", { exact: true }),
  ).toBeVisible();
  await expect(
    variantsSection
      .locator('[aria-label="Imperative"]')
      .filter({ hasText: /^imp/ }),
  ).toBeVisible();
  await expect(
    variantsSection.getByText("ⲙⲏⲓⲧ=", { exact: false }),
  ).toBeVisible();
  await expect(
    variantsSection.getByText("ⲙⲟⲓⲧ=", { exact: false }),
  ).toBeVisible();

  const rendersImperativeBeforeVariants = await article.evaluate((element) => {
    const imperative = element.querySelector(
      '[data-testid="dictionary-entry-imperative-section"]',
    );
    const variants = element.querySelector(
      '[data-testid="dictionary-entry-variants-section"]',
    );

    if (!imperative || !variants) {
      return false;
    }

    return Boolean(
      imperative.compareDocumentPosition(variants) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(rendersImperativeBeforeVariants).toBe(true);
});

test("dictionary entry renders derivation relations separately from meanings", async ({
  page,
}) => {
  await page.goto(CAUSATIVE_ENTRY_PATH);

  const article = page.locator("article").first();
  const relationsSection = article.getByTestId(
    "dictionary-entry-relations-section",
  );

  await expect(
    article.getByText("make to cease, heal", { exact: true }),
  ).toBeVisible();
  await expect(article.getByText("CAUS of", { exact: false })).toHaveCount(0);
  await expect(
    relationsSection.getByText("Related Entries", { exact: true }),
  ).toBeVisible();
  await expect(
    relationsSection.getByText("Causative of", { exact: true }),
  ).toBeVisible();
  await expect(relationsSection).toContainText("ⲗⲱϫⲓ");
  await expect(relationsSection).toContainText("ⲗⲟϫ=");
  await expect(relationsSection).toContainText(
    "Target identified from B ⲗⲱϫⲓ, ⲗⲟϫ=.",
  );

  await page.goto(CAUSATIVE_BASE_ENTRY_PATH);

  const baseRelationsSection = page
    .locator("article")
    .first()
    .getByTestId("dictionary-entry-relations-section");

  await expect(baseRelationsSection).toContainText("Causative form.");
  await expect(baseRelationsSection).toContainText("ⲧⲁⲗϭⲟ");
  await expect(baseRelationsSection).toContainText("ⲧⲁⲗϭⲉ-");
});
