import { expect, test, type Page } from "@playwright/test";

const LESSON_PATH = "/en/grammar/lesson-1";
const ABBREVIATIONS_TABLE_ID = "grammar.lesson.01.section.abbreviations.table";
const SIGNIFICANT_LETTERS_TABLE_ID =
  "grammar.lesson.01.section.significant-letters.table";

async function openMobileLesson(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(LESSON_PATH);
}

test("mobile grammar lessons switch lookup tables to cards while keeping comparison tables scrollable", async ({
  page,
}) => {
  await openMobileLesson(page);

  const abbreviationsCards = page.locator(
    `[data-grammar-table-id="${ABBREVIATIONS_TABLE_ID}"][data-grammar-table-rendering="cards"]`,
  );
  const abbreviationsTable = page.locator(
    `[data-grammar-table-id="${ABBREVIATIONS_TABLE_ID}"][data-grammar-table-rendering="table"]`,
  );
  const significantLettersTable = page.locator(
    `[data-grammar-table-id="${SIGNIFICANT_LETTERS_TABLE_ID}"][data-grammar-table-rendering="table"]`,
  );

  await abbreviationsCards.scrollIntoViewIfNeeded();

  await expect(abbreviationsCards).toBeVisible();
  await expect(abbreviationsCards.getByText("Full Word").first()).toBeVisible();
  await expect(
    abbreviationsCards.getByText("Abbreviation").first(),
  ).toBeVisible();
  await expect(abbreviationsCards.getByText("Meaning").first()).toBeVisible();
  await expect(abbreviationsCards.getByText("Ⲁⲗⲗⲏⲗⲟⲩⲓⲁ̀")).toBeVisible();
  await expect(abbreviationsTable).toBeHidden();

  await significantLettersTable.scrollIntoViewIfNeeded();

  await expect(significantLettersTable).toBeVisible();
  await expect(
    page.locator(
      `[data-grammar-table-id="${SIGNIFICANT_LETTERS_TABLE_ID}"][data-grammar-table-rendering="cards"]`,
    ),
  ).toHaveCount(0);
});

test("mobile row-header comparison tables keep their leading labels sticky", async ({
  page,
}) => {
  await openMobileLesson(page);

  const significantLettersTable = page.locator(
    `[data-grammar-table-id="${SIGNIFICANT_LETTERS_TABLE_ID}"][data-grammar-table-rendering="table"]`,
  );
  const firstRowHeader = significantLettersTable
    .locator("tbody th[scope='row']")
    .first();

  await significantLettersTable.scrollIntoViewIfNeeded();

  await expect(firstRowHeader).toHaveCSS("position", "sticky");
  await expect(firstRowHeader).toHaveCSS("left", "0px");
});

test("desktop keeps the abbreviations lookup table in table form", async ({
  page,
}) => {
  const abbreviationsCards = page.locator(
    `[data-grammar-table-id="${ABBREVIATIONS_TABLE_ID}"][data-grammar-table-rendering="cards"]`,
  );
  const abbreviationsTable = page.locator(
    `[data-grammar-table-id="${ABBREVIATIONS_TABLE_ID}"][data-grammar-table-rendering="table"]`,
  );

  await page.goto(LESSON_PATH);
  await abbreviationsTable.scrollIntoViewIfNeeded();

  await expect(abbreviationsTable).toBeVisible();
  await expect(abbreviationsCards).toBeHidden();
});

test("mobile locked lesson actions reveal the login prompt on tap", async ({
  page,
}) => {
  await openMobileLesson(page);

  const downloadButton = page.getByRole("button", { name: "Download PDF" });

  await expect(downloadButton).toBeEnabled();
  await expect(downloadButton).toHaveAttribute("data-locked", "true");

  await downloadButton.click();
  await expect(
    page.getByText("Sign in or sign up to download lessons as PDF"),
  ).toBeVisible();
});
