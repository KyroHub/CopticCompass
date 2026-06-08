import { expect, test } from "@playwright/test";

const BOHAIRIC_NOUNS_PATH = "/en/practice?deck=bohairic-nouns";
const MIXED_REVIEW_PATH = "/en/practice?deck=mixed-dictionary-grammar";

test("practice picker groups mixed, word, grammar, and saved practice", async ({
  page,
}) => {
  await page.goto(MIXED_REVIEW_PATH);

  await page.getByRole("button", { name: "Change practice" }).click();

  const dialog = page.locator('[role="dialog"]').first();

  await expect(dialog).toBeVisible();

  console.log("Dialog textContent:");
  console.log(await dialog.textContent());

  const headings = await dialog.locator("h3").allTextContents();
  console.log("H3 headings:");
  console.log(headings);

  await expect(
    dialog.getByRole("heading", { name: "Mixed practice" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Grammar practice" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Saved practice" }),
  ).toBeVisible();
  await expect(dialog.getByText("Daily Mixed Practice")).toBeVisible();
  await expect(dialog.getByText("Current")).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /Grammar Lesson 1/ }),
  ).toHaveAttribute("href", "/en/practice?deck=grammar-lesson-1");
  await expect(
    dialog.getByRole("link", { name: /Saved Entries/ }),
  ).toHaveAttribute("href", /\/login/);
});

test("mobile practice setup can collapse after selecting a card type", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BOHAIRIC_NOUNS_PATH);

  const setupToggle = page.getByRole("button", { name: /Practice setup/ });

  await expect(setupToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Change practice" }),
  ).toBeHidden();

  await setupToggle.click();
  await expect(setupToggle).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: /Prompt type/ }).click();
  await page.getByRole("option", { name: "Meaning → Coptic" }).click();
  await expect(setupToggle).toContainText("selected");

  await setupToggle.click();
  await expect(setupToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Change practice" }),
  ).toBeHidden();
});

test("practice answer context shows the dialect form instead of the headword", async ({
  page,
}) => {
  await page.goto(BOHAIRIC_NOUNS_PATH);

  await page.getByRole("button", { name: "Reveal answer" }).click();

  const answerContextButton = page.getByRole("button", {
    name: /Answer context/,
  });
  const answerContextPanel = page.locator("section.mt-3").filter({
    has: answerContextButton,
  });

  await expect(answerContextButton).toContainText("ⲟⲩⲱⲓⲛⲓ");
  await answerContextButton.click();

  await expect(answerContextPanel).toContainText("Form");
  await expect(answerContextPanel).toContainText("ⲟⲩⲱⲓⲛⲓ");
  await expect(answerContextPanel).not.toContainText("ⲟⲩⲟⲉⲓⲛ");
});

test("keyboard shortcuts navigate flashcard study flow", async ({ page }) => {
  await page.goto(BOHAIRIC_NOUNS_PATH);

  // 1. Ensure hint is toggled using 'h'
  await page.keyboard.press("h");
  await expect(page.getByRole("button", { name: "Hide hint" })).toBeVisible();

  // 2. Press Space/Enter to reveal card or check answer
  const input = page.locator("input[type='text']");
  const isTyping = await input.isVisible();

  if (isTyping) {
    // If it's a typing card, check that typing text works and doesn't trigger shortcut keys (like r, v, h)
    await input.focus();
    await page.keyboard.type("r");
    await expect(input).toHaveValue("r");

    // Press Enter inside input to check typed answer (it will be incorrect)
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Incorrect/i)).toBeVisible();
  } else {
    // For reveal cards, pressing space reveals the back of the card
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible();
  }

  // If typing card, reveal it so we see rating buttons
  if (isTyping) {
    await page.getByRole("button", { name: "Reveal" }).click();
  }

  // 3. Replaying audio with 'r' should execute speaker trigger
  await page.keyboard.press("r");

  // 4. Pressing '3' rates it as 'Good' and advances to the next card
  await page.keyboard.press("3");

  // Since it advanced, the next card is hidden (Reveal button is visible again, rating buttons are hidden)
  await expect(page.getByRole("button", { name: "Reveal" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Good/i })).toBeHidden();
});
