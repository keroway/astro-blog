import { expect, test } from "@playwright/test";

test.describe("CMS admin smoke", () => {
  test("login screen shows branded Japanese CTAs", async ({ page }) => {
    await page.goto("/admin/", { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(/keroway CMS|Sveltia CMS/);
    await expect(
      page.getByRole("button", { name: "ローカルリポジトリで編集" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "GitHub でサインイン" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "アクセストークンでサインイン" })
    ).toBeVisible();
    await expect(page.getByLabel("CMS の使い方")).toContainText(
      "astro-blog のルート"
    );
  });

  test("login screen classifies visible actions", async ({ page }) => {
    await page.goto("/admin/", { waitUntil: "networkidle" });

    await expect(
      page.locator('[data-keroway-admin-action="primary"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator('[data-keroway-admin-action="secondary"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator('[data-keroway-admin-action="subtle"]')
    ).not.toHaveCount(0);
  });
});
