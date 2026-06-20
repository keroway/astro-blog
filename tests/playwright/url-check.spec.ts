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

  test("/works/rss.xml returns 200", async ({ request }) => {
    const res = await request.get("/works/rss.xml");
    expect(res.status(), "/works/rss.xml should return 200").toBe(200);
  });

  test("/api/trigger-build returns 401 when CRON_SECRET is set and token is wrong", async ({
    request,
  }) => {
    // CRON_SECRET が設定されている場合のみ認証チェックが走る。
    // ローカル dev / CI では CRON_SECRET が未設定なため、このテストは
    // 「CRON_SECRET が設定されたときに不正トークンで 401 が返る」動作を
    // 条件付きで確認する。CI で有効化するには test ジョブに
    // CRON_SECRET を渡す (plans/003 Maintenance notes 参照)。
    const cronSecret = process.env.CRON_SECRET;
    test.skip(!cronSecret, "CRON_SECRET not set — skipping auth check");

    const res = await request.get("/api/trigger-build", {
      headers: { Authorization: "Bearer wrongtoken" },
    });
    expect(res.status(), "wrong token should return 401").toBe(401);
  });

  test("og:image meta tags include width/height/alt", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.locator('head > meta[property="og:image"]'),
      "og:image should be present on the homepage"
    ).toHaveCount(1);
    await expect(
      page.locator('head > meta[property="og:image:width"]')
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('head > meta[property="og:image:height"]')
    ).toHaveAttribute("content", "630");

    const ogAlt = await page
      .locator('head > meta[property="og:image:alt"]')
      .getAttribute("content");
    expect(ogAlt, "og:image:alt should be non-empty").toBeTruthy();

    const twAlt = await page
      .locator('head > meta[property="twitter:image:alt"]')
      .getAttribute("content");
    expect(twAlt, "twitter:image:alt should be non-empty").toBeTruthy();
  });

  test("works detail page has JSON-LD with SoftwareApplication schema", async ({
    page,
  }) => {
    await page.goto("/works/timeline-dsl/");

    const allJsonLd = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const softwareSchema = allJsonLd
      .map((text) => JSON.parse(text))
      .find((s) => s["@type"] === "SoftwareApplication");

    expect(
      softwareSchema,
      "SoftwareApplication JSON-LD should be present on works page"
    ).toBeTruthy();

    expect(softwareSchema.name).toBeTruthy();
    expect(softwareSchema.description).toBeTruthy();
    expect(softwareSchema.dateCreated).toBeTruthy();
    expect(softwareSchema.url).toBeTruthy();
  });

  // sitemap-index.xml is generated only at build time (astro build),
  // not served by the dev server. Verify the build artifact exists instead.
  // ADR 0005 (Vercel adapter 導入) 以降は SSG 静的アセットが dist/client/ に出力される。
  test("sitemap-index.xml is generated at build time", () => {
    const distSitemap = join(
      process.cwd(),
      "dist",
      "client",
      "sitemap-index.xml"
    );
    const distSitemap0 = join(process.cwd(), "dist", "client", "sitemap-0.xml");
    expect(
      existsSync(distSitemap),
      "dist/client/sitemap-index.xml must exist after build"
    ).toBe(true);
    expect(
      existsSync(distSitemap0),
      "dist/client/sitemap-0.xml must exist after build"
    ).toBe(true);
  });
});
