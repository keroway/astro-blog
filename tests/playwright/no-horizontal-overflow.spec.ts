import { expect, test } from "@playwright/test";

const paths = [
  "/",
  "/blog/",
  "/blog/getting-started-with-python-web-scraping/",
  "/works/",
  "/about/",
] as const;

test.describe("mobile pages", () => {
  for (const path of paths) {
    test(`does not horizontally overflow: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "networkidle" });

      const metrics = await page.locator("html").evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    });
  }
});
