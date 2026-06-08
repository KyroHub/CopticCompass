import { expect, test, type Page } from "@playwright/test";

const ENTRY_PATH = "/en/entry/173";
const E2E_TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL;
const E2E_TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;
const HAS_E2E_AUTH = Boolean(E2E_TEST_USER_EMAIL && E2E_TEST_USER_PASSWORD);
const LOCKED_ENTRY_PROMPT_PATTERN =
  /Sign in or sign up to save entries and report issues\.|Log in or sign up to save entries and report issues\.|Entry actions are unavailable right now\./;

async function forceHoverMediaMismatch(page: Page) {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);

    window.matchMedia = (query: string) => {
      if (query !== "(hover: hover) and (pointer: fine)") {
        return originalMatchMedia(query);
      }

      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        addListener: () => {},
        dispatchEvent: () => true,
        removeEventListener: () => {},
        removeListener: () => {},
      } as MediaQueryList;
    };
  });
}

async function loginToEntryPage(page: Page) {
  await page.goto(`/login?redirect_to=${encodeURIComponent(ENTRY_PATH)}`);
  await page.getByLabel("Email").fill(E2E_TEST_USER_EMAIL!);
  await page.getByLabel("Password").fill(E2E_TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(new RegExp(`${ENTRY_PATH}$`));
}

test("signed-out desktop users can hover locked dictionary entry actions to reveal the login prompt", async ({
  page,
}) => {
  await page.goto(ENTRY_PATH);

  const shareButton = page.getByRole("button", { name: /^Share$/ });
  const saveButton = page.getByRole("button", { name: "Save entry" });
  const reportButton = page.getByRole("button", { name: "Report entry" });
  const lockedPrompt = page
    .locator('[role="tooltip"], [role="dialog"]')
    .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN })
    .first();

  await expect(shareButton).toBeEnabled();
  await expect(saveButton).toBeEnabled();
  await expect(reportButton).toBeEnabled();
  await expect(saveButton).toHaveAttribute("data-locked", "true");
  await expect(reportButton).toHaveAttribute("data-locked", "true");

  await shareButton.click();
  await expect(
    page.getByRole("heading", { name: "Share this entry" }),
  ).toBeVisible();
  await expect(page.getByText("Share preview")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy share text" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Share on X" })).toBeVisible();

  await saveButton.hover();
  await expect(lockedPrompt).toBeVisible();

  await reportButton.hover();
  await expect(lockedPrompt).toBeVisible();
  await expect(
    page
      .locator('[role="tooltip"], [role="dialog"]')
      .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN }),
  ).toHaveCount(1);
});

test("signed-out desktop users keep the locked action tooltip visible long enough to reach its login link", async ({
  page,
}) => {
  await page.goto(ENTRY_PATH);

  await page.getByRole("button", { name: /^Share$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Share this entry" }),
  ).toBeVisible();

  const saveButton = page.getByRole("button", { name: "Save entry" });
  const lockedPrompt = page
    .locator('[role="tooltip"], [role="dialog"]')
    .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN })
    .first();
  const buttonBox = await saveButton.boundingBox();

  await saveButton.hover();
  await expect(lockedPrompt).toBeVisible();
  expect(buttonBox).not.toBeNull();

  await page.mouse.move(
    buttonBox!.x + buttonBox!.width + 80,
    buttonBox!.y + buttonBox!.height / 2,
  );
  await page.waitForTimeout(600);
  await expect(lockedPrompt).toBeVisible();
  await expect(
    lockedPrompt.getByRole("link", { name: "Sign In" }),
  ).toBeVisible();
});

test("signed-out desktop users still reveal locked prompts when hover media detection is unavailable", async ({
  page,
}) => {
  await forceHoverMediaMismatch(page);
  await page.goto(ENTRY_PATH);

  const saveButton = page.getByRole("button", { name: "Save entry" });
  const lockedPrompt = page
    .locator('[role="tooltip"], [role="dialog"]')
    .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN })
    .first();

  await saveButton.hover();
  await expect(lockedPrompt).toBeVisible();
  await expect(
    lockedPrompt.getByRole("link", { name: "Sign In" }),
  ).toBeVisible();
});

test.describe("signed-out mobile dictionary entry actions", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("signed-out mobile users can tap locked dictionary entry actions to reveal the login prompt", async ({
    page,
  }) => {
    await page.goto(ENTRY_PATH);

    const saveButton = page.getByRole("button", { name: "Save entry" });
    const reportButton = page.getByRole("button", { name: "Report entry" });
    const lockedPrompt = page
      .locator('[role="tooltip"], [role="dialog"]')
      .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN })
      .first();

    await expect(saveButton).toBeEnabled();
    await expect(reportButton).toBeEnabled();
    await expect(saveButton).toHaveAttribute("data-locked", "true");
    await expect(reportButton).toHaveAttribute("data-locked", "true");

    await saveButton.tap();
    await expect(lockedPrompt).toBeVisible();

    await page.waitForTimeout(120);
    await saveButton.tap();

    await reportButton.tap();
    await expect(lockedPrompt).toBeVisible();
    await expect(
      page
        .locator('[role="tooltip"], [role="dialog"]')
        .filter({ hasText: LOCKED_ENTRY_PROMPT_PATTERN }),
    ).toHaveCount(1);
  });
});

test.describe("signed-in dictionary entry actions", () => {
  test.skip(
    !HAS_E2E_AUTH,
    "Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD to run signed-in dictionary action coverage.",
  );

  test("signed-in users can open the report form and toggle saved state", async ({
    page,
  }) => {
    await loginToEntryPage(page);

    const saveButton = page.getByRole("button", {
      name: /Save entry|Saved entry/,
    });
    await expect(saveButton).toBeEnabled();
    const initialLabel = (await saveButton.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Report entry" }).click();
    await expect(
      page.getByRole("heading", { name: "Report an issue" }),
    ).toBeVisible();
    await expect(page.getByLabel("Reason")).toBeVisible();
    await expect(page.getByLabel("Commentary")).toBeVisible();

    await saveButton.click();
    const toggledLabel =
      initialLabel === "Saved entry" ? "Save entry" : "Saved entry";
    await expect(
      page.getByRole("button", { name: toggledLabel }),
    ).toBeVisible();

    await page.getByRole("button", { name: toggledLabel }).click();
    await expect(
      page.getByRole("button", { name: initialLabel }),
    ).toBeVisible();
  });
});
