import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const artifacts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../qa-artifacts");

test("responsive Build, Convert, and Test workspaces remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome");
  await mkdir(artifacts, { recursive: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Examples" }).click();
  await page.getByRole("dialog", { name: "Open an example" }).getByRole("button", { name: /One or more a symbols/ }).click();
  for (const [width, mode] of [[1440, "Build"], [1024, "Convert"], [768, "Convert"], [390, "Test"], [360, "Build"]] as const) {
    await page.setViewportSize({ width, height: 850 });
    await page.getByRole("button", { name: mode, exact: true }).click();
    if (mode === "Convert") {
      const generate = page.getByRole("button", { name: /Generate DFA/ });
      if (await generate.isVisible()) await generate.click();
      await expect(page.getByRole("region", { name: "Generated DFA graph" })).toBeVisible();
      await page.getByRole("region", { name: "Generated DFA graph" }).getByRole("button", { name: "Fit view", exact: true }).click();
      await page.getByRole("region", { name: "Original NFA graph" }).getByRole("button", { name: "Fit view", exact: true }).click();
    }
    if (mode === "Test") {
      await page.getByRole("button", { name: "Run simulation" }).click();
      await expect(page.getByRole("region", { name: "Simulated DFA graph" })).toBeVisible();
    }
    await page.screenshot({ path: path.join(artifacts, `${width}-${mode.toLowerCase()}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
