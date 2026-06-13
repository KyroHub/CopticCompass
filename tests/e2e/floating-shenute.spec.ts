import { expect, test } from "@playwright/test";

const FLOATING_ASSISTANT_TIMEOUT_MS = 15_000;

test("floating Shenute assistant opens on demand", async ({ page }) => {
  await page.goto("/en/contact");

  await page.getByRole("button", { name: "Open Shenute AI" }).click();

  await expect(page.getByText("Page context: Contact")).toBeVisible({
    timeout: FLOATING_ASSISTANT_TIMEOUT_MS,
  });
  await expect(page.getByRole("button", { name: "Minimize" })).toBeVisible();
  await expect(page.getByText("Sign in required")).toBeVisible();
});

test("floating Shenute assistant labels dictionary context", async ({
  page,
}) => {
  await page.goto("/en/dictionary");

  await page.getByRole("button", { name: "Open Shenute AI" }).click();

  await expect(page.getByText("Page context: Dictionary")).toBeVisible({
    timeout: FLOATING_ASSISTANT_TIMEOUT_MS,
  });
});

test("floating Shenute assistant stays available on mobile content pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/dictionary");

  await expect(
    page.getByRole("button", { name: "Open Shenute AI" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open Shenute AI" }).click();
  await expect(page.getByRole("button", { name: "Minimize" })).toBeVisible({
    timeout: FLOATING_ASSISTANT_TIMEOUT_MS,
  });
  await page.getByRole("button", { name: "Minimize" }).click();
  await expect(
    page.getByRole("button", { name: "Open Shenute AI" }),
  ).toBeVisible();
});

test("floating Shenute assistant is hidden on the homepage", async ({
  page,
}) => {
  await page.goto("/en");

  await expect(
    page.getByRole("button", { name: "Open Shenute AI" }),
  ).toHaveCount(0);
});

test("floating Shenute assistant fades only during active scrolling", async ({
  page,
}) => {
  await page.goto("/en/dictionary");

  const launcher = page.getByTestId("floating-shenute-launcher");
  await expect(launcher).toBeVisible();
  await page.mouse.move(12, 12);

  const initialOpacity = await launcher.evaluate((element) =>
    Number(window.getComputedStyle(element).opacity),
  );
  await page.evaluate(() => window.scrollTo(0, 700));

  await expect
    .poll(async () =>
      launcher.evaluate((element) =>
        Number(window.getComputedStyle(element).opacity),
      ),
    )
    .toBeLessThan(initialOpacity);

  await expect
    .poll(async () =>
      launcher.evaluate((element) =>
        Number(window.getComputedStyle(element).opacity),
      ),
    )
    .toBe(initialOpacity);
});

test("floating Shenute assistant is hidden on the Shenute route", async ({
  page,
}) => {
  await page.goto("/shenute");

  await expect(
    page.getByRole("heading", {
      name: "Shenute AI",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Shenute AI" }),
  ).toHaveCount(0);
});
