import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test.describe("URL compatibility check", () => {
  test("all blog post URLs return 200", async ({ request, page }) => {
    test.setTimeout(120_000);
    await page.goto("/blog");

    const hrefs = await page
      .locator("a.post-row__link")
      .evaluateAll<string[]>((els: Element[]) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter((h): h is string => h !== null)
      );

    expect(
      hrefs.length,
      "blog listing should show 50+ posts"
    ).toBeGreaterThanOrEqual(50);

    const results = await Promise.all(
      hrefs.map(async (href: string) => {
        const res = await request.get(href);
        return { href, status: res.status() };
      })
    );

    const failures = results.filter((r) => r.status !== 200);
    expect(
      failures,
      `URLs not returning 200:\n${failures.map((f) => `  ${f.href} → ${f.status}`).join("\n")}`
    ).toHaveLength(0);
  });

  test("/rss.xml returns 200", async ({ request }) => {
    const res = await request.get("/rss.xml");
    expect(res.status(), "/rss.xml should return 200").toBe(200);
  });

  // sitemap-index.xml is generated only at build time (astro build),
  // not served by the dev server. Verify the build artifact exists instead.
  test("sitemap-index.xml is generated at build time", () => {
    const distSitemap = join(process.cwd(), "dist", "sitemap-index.xml");
    const distSitemap0 = join(process.cwd(), "dist", "sitemap-0.xml");
    expect(
      existsSync(distSitemap),
      "dist/sitemap-index.xml must exist after build"
    ).toBe(true);
    expect(
      existsSync(distSitemap0),
      "dist/sitemap-0.xml must exist after build"
    ).toBe(true);
  });
});
