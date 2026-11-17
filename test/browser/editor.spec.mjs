import { test, expect } from "@playwright/test";

const bytes = (page) =>
  page.getByTestId("editor").locator(".hexEditorBody .byteValue");
const byte = (page, offset) =>
  page
    .getByTestId("editor")
    .locator(`.hexEditorBody .byteValue[data-offset="${offset}"]`);
const input = (page) => page.getByTestId("editor").locator("input");
const shortcut = process.platform === "darwin" ? "Meta" : "Control";

const pageErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(byte(page, 0)).toBeVisible();
  pageErrors.set(page, errors);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

for (const variant of [
  "styled-auto",
  "styled-base",
  "unstyled-auto",
  "unstyled-base",
]) {
  test(`${variant}: editing, focus and forwarded writes`, async ({ page }) => {
    await page.getByLabel("Component", { exact: true }).selectOption(variant);
    await page
      .getByRole("button", { name: "Focus editor", exact: true })
      .click();
    await expect(input(page)).toBeFocused();
    await input(page).press("a");
    await expect(page.getByTestId("write")).toHaveText("none");
    await input(page).press("b");
    await expect(page.getByTestId("write")).toHaveText("0:171");
    await input(page).press("Tab");
    await input(page).press("Shift+A");
    await expect(page.getByTestId("write")).toHaveText("1:65");
    await page.getByRole("button", { name: "Write first byte" }).click();
    await expect(byte(page, 0)).toHaveText("ff");
    await page.getByRole("button", { name: "Blur editor" }).click();
    await expect(page.getByTestId("focus")).toHaveText("blurred");
  });
}
test("read-only keyboard boundary, native hex copy/paste and ASCII copy/paste", async ({
  page,
}) => {
  await page.getByLabel("Read only", { exact: true }).check();
  await page.getByRole("button", { name: "Focus editor", exact: true }).click();
  await input(page).press("a");
  await input(page).press("b");
  await input(page).press("Backspace");
  await input(page).press("Delete");
  await expect(page.getByTestId("write")).toHaveText("none");
  await input(page).press(`${shortcut}+a`);
  await expect(input(page)).toHaveValue(
    Array.from({ length: 259 }, (_, i) =>
      (i & 255).toString(16).padStart(2, "0"),
    ).join(""),
  );
  await page.getByRole("button", { name: "Select first four" }).click();
  await input(page).press(`${shortcut}+c`);
  await page.getByLabel("Read only", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Focus editor", exact: true }).click();
  await input(page).press("Home");
  await input(page).press("ArrowRight");
  await input(page).press(`${shortcut}+v`);
  await expect(page.getByTestId("bytes")).toHaveText("00 00 01 02 03 05 06 07");
  // ASCII copy uses actual input selection too; copy then overwrite the next bytes.
  await page.getByRole("button", { name: "ASCII sample", exact: true }).click();
  await page.getByRole("button", { name: "Focus editor", exact: true }).click();
  await input(page).press("Tab");
  await page.getByRole("button", { name: "Select first four" }).click();
  await input(page).press(`${shortcut}+x`);
  await expect(page.getByTestId("bytes")).toHaveText("41 42 43 44 45 46 47 48");
  await input(page).press("Home");
  await input(page).press("ArrowRight");
  await input(page).press(`${shortcut}+v`);
  await expect(page.getByTestId("bytes")).toHaveText("41 41 42 43 44 46 47 48");
});
test("click, Shift extension, bidirectional drag and pending-nibble cancellation", async ({
  page,
}) => {
  await byte(page, 1).click();
  await input(page).press("Shift+ArrowRight");
  await expect(input(page)).toHaveValue("01");
  await input(page).press("a");
  await input(page).press("Backspace");
  await expect(page.getByTestId("write")).toHaveText("none");
  for (const [from, to] of [
    [1, 3],
    [3, 1],
  ]) {
    const start = await byte(page, from).boundingBox();
    const end = await byte(page, to).boundingBox();
    await page.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
      steps: 8,
    });
    await expect(input(page)).toHaveValue("010203");
    await page.mouse.up();
  }
});
test("mutable buffers, immutable replacement, StrictMode remount and bounded virtualization", async ({
  page,
}) => {
  await page.getByLabel("Mutable data", { exact: true }).check();
  await page.getByRole("button", { name: "Write first byte" }).click();
  await expect(byte(page, 0)).toHaveText("ff");
  await page.getByRole("button", { name: "Use number array" }).click();
  await page.getByRole("button", { name: "Focus editor", exact: true }).click();
  await input(page).press("a");
  await input(page).press("b");
  await expect(byte(page, 0)).toHaveText("ab");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(byte(page, 0)).toHaveText("00");
  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await expect(input(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Mount", exact: true }).click();
  await expect(byte(page, 0)).toHaveText("00");
  await page
    .getByLabel("Component", { exact: true })
    .selectOption("styled-base");
  await page.getByRole("button", { name: "Large buffer" }).click();
  expect(await bytes(page).count()).toBeLessThan(600);
  await page.getByRole("button", { name: "Scroll to end" }).click();
  await expect(byte(page, 1_000_000)).toBeVisible();
  await expect(byte(page, 1_000_001)).toHaveClass(/invalid/);
  await page.getByRole("button", { name: "Scroll to start" }).click();
  await expect(byte(page, 0)).toBeVisible();
});
test("auto geometry responds to resize, themes and section visibility", async ({
  page,
}) => {
  const initial = await page
    .getByTestId("editor")
    .locator(".hexEditorBody")
    .boundingBox();
  expect(initial.height).toBeGreaterThan(200);
  const first = await byte(page, 0).boundingBox();
  const second = await byte(page, 1).boundingBox();
  expect(first.width).toBeGreaterThan(10);
  expect(second.x).toBeCloseTo(first.x + first.width, 0);
  await page.getByLabel("Dark theme", { exact: true }).check();
  await expect(byte(page, 0)).toHaveCSS("color", "rgb(171, 178, 191)");
  await page.getByLabel("Width", { exact: true }).fill("400");
  await expect
    .poll(
      async () =>
        (
          await page
            .getByTestId("editor")
            .locator(".hexEditorBody")
            .boundingBox()
        ).width,
    )
    .toBeLessThan(initial.width);
  await page.getByLabel("ASCII", { exact: true }).uncheck();
  await expect(page.getByTestId("editor").locator(".asciiValues")).toHaveCount(
    0,
  );
  await page.getByLabel("Labels", { exact: true }).uncheck();
  await expect(
    page.getByTestId("editor").locator(".hexEditorHeader"),
  ).toHaveCount(0);
});

test("guide navigation and nested generated API work under the project base", async ({
  page,
}) => {
  test.skip(
    !!process.env.REACT_VERSION && !process.env.REACT_VERSION.startsWith("18."),
    "Documentation is validated in the full React 18 suite",
  );
  await page.getByRole("link", { name: "Guide", exact: true }).click();
  await expect(page).toHaveURL(/#guide$/);
  await expect(
    page.getByRole("heading", { name: "Use the maintained fork" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "API", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /^Public API/ }),
  ).toBeVisible();
  await page.goto("api/interfaces/HexEditorHandle.html");
  await expect(
    page.getByRole("heading", { name: /^setSelectionRange/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Guide and demo", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/index.html#guide$/);
  await expect(
    page.getByRole("heading", { name: "Use the maintained fork" }),
  ).toBeVisible();
});

test('automatic editor preserves 16 explicit columns across container widths', async ({ page }) => {
  await page.getByLabel('Fixed columns', { exact: true }).check();
  for (const width of ['640', '900']) {
    await page.getByLabel('Width', { exact: true }).fill(width);
    const row = page.getByTestId('editor').locator('.hexEditorBody .hexEditorRow').first();
    await expect(row.locator('.byteValue')).toHaveCount(16);
    await byte(page, 0).click();
    await input(page).press('ArrowDown');
    await expect(byte(page, 16)).toHaveClass(/cursor/);
  }
});
