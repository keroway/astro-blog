import { expect, test } from "@playwright/test";

const widths = [320, 360, 375] as const;

test.describe("mobile header", () => {
  for (const width of widths) {
    test(`does not wrap or overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.goto("/", { waitUntil: "networkidle" });

      const header = page.locator(".kw-header");
      await expect(header).toBeVisible();

      const metrics = await header.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const children = Array.from(el.children)
          .map((child) => child.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0);
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          height: rect.height,
          visibleChildren: children.length,
        };
      });

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(metrics.visibleChildren).toBeGreaterThanOrEqual(2);
      expect(metrics.height).toBeLessThanOrEqual(80);

      for (const locator of [
        page.locator("#a11y-trigger"),
        page.locator("#theme-toggle"),
      ]) {
        const box = await locator.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  }
});
