import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function loadExample(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "Examples" }).click();
  await page.getByRole("dialog", { name: "Open an example" }).getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByText("Document loaded")).toBeVisible();
}

test("build and edit an NFA with synchronized transitions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("region", { name: "NFA workspace visualization area" }).getByRole("button", { name: "Create blank NFA" }).click();
  await page.getByRole("textbox", { name: "New state ID" }).fill("q1");
  await page.getByRole("button", { name: "Add state" }).click();
  await page.getByRole("textbox", { name: "New alphabet symbol" }).fill("a");
  await page.getByRole("button", { name: "Add symbol" }).click();
  await page.getByLabel("States").getByRole("button", { name: "q1" }).click();
  await page.getByRole("checkbox", { name: "Accepting state" }).check();
  await page.getByRole("textbox", { name: "Rename state" }).fill("final");
  await page.getByRole("button", { name: "Rename state" }).click();
  await expect(page.getByLabel("States").getByRole("button", { name: /final/ })).toBeVisible();
  await page.getByRole("group", { name: "Destination states" }).getByRole("checkbox", { name: "final" }).check();
  await page.getByRole("button", { name: "Save transition" }).click();
  await expect(page.getByText("Transition saved.")).toBeVisible();
  await page.getByRole("button", { name: /Transition table/ }).click();
  await expect(page.getByRole("table")).toContainText("final");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete state" }).click();
  await expect(page.getByLabel("States").getByRole("button", { name: /final/ })).toHaveCount(0);
});

test("convert, replay, and inspect a dead state", async ({ page }) => {
  await page.goto("/");
  await loadExample(page, "One or more a symbols");
  await page.getByRole("button", { name: "Convert" }).click();
  const generate = page.getByRole("button", { name: /Generate DFA/ });
  await expect(generate).toBeEnabled();
  await generate.click();
  const dfaGraph = page.getByRole("region", { name: "Generated DFA graph" });
  await expect(dfaGraph).toBeVisible();
  await expect(page.getByText("Dead state included")).toBeVisible();
  const fullCount = await dfaGraph.locator(".react-flow__node").count();
  await page.getByRole("button", { name: "Step by step" }).click();
  await expect(dfaGraph.locator(".react-flow__node")).toHaveCount(1);
  await page.getByRole("button", { name: /DFA transition table/ }).click();
  await expect(page.getByRole("table")).toContainText("Pending");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(dfaGraph.locator(".react-flow__node")).toHaveCount(2);
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(dfaGraph.locator(".react-flow__node")).toHaveCount(1);
  await page.getByRole("button", { name: "Final step" }).click();
  await expect(dfaGraph.locator(".react-flow__node")).toHaveCount(fullCount);
  await expect(page.getByRole("table")).not.toContainText("Pending");
  await page.getByRole("button", { name: "Full DFA" }).click();
  await expect(dfaGraph.locator(".react-flow__node")).toHaveCount(fullCount);
});

test("simulate accepted, rejected, empty, and invalid strings", async ({ page }) => {
  await page.goto("/");
  await loadExample(page, "Even number of a symbols");
  await page.getByRole("button", { name: "Test" }).click();
  const input = page.getByRole("textbox", { name: "Input string" });
  const run = page.getByRole("button", { name: "Run simulation" });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await input.fill("a");
  await run.click();
  await expect(page.getByText("Verdict appears after the final symbol.")).toBeVisible();
  await page.getByRole("button", { name: /Simulation timeline/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await input.fill("aa");
  await run.click();
  await page.getByRole("button", { name: "Last", exact: true }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await input.fill("b");
  await expect(page.getByText(/outside the alphabet/)).toBeVisible();
  await expect(run).toBeDisabled();
});

test("export, import, and reject invalid JSON without replacing the document", async ({ page }) => {
  await page.goto("/");
  await loadExample(page, "Even number of a symbols");
  await page.getByRole("button", { name: "Import / export" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Export current NFA/ }).click();
  const download = await downloadPromise;
  const exported = await readFile(await download.path(), "utf8");
  expect(JSON.parse(exported)).toMatchObject({ schemaVersion: 1, initialState: "even", alphabet: ["a"] });
  await page.getByRole("button", { name: "Import / export" }).click();
  await page.getByRole("menuitem", { name: /Import JSON/ }).click();
  await page.getByLabel("Choose NFA JSON file").setInputFiles({ name: "roundtrip.json", mimeType: "application/json", buffer: Buffer.from(exported) });
  await expect(page.getByText(/Imported Even number of a symbols/)).toBeVisible();
  await page.getByRole("menuitem", { name: /Import JSON/ }).click();
  await page.getByLabel("Choose NFA JSON file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{bad") });
  await expect(page.getByText("Import was not applied")).toBeVisible();
  await expect(page.getByLabel("States")).toContainText("even");
});

test("major workspaces have no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await loadExample(page, "Even number of a symbols");
  for (const mode of ["Build", "Convert", "Test"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    const report = await new AxeBuilder({ page }).analyze();
    expect(report.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  }
});
