import { expect, test } from "@playwright/test";

test.describe("SEO: canonical URL", () => {
  test("homepage outputs canonical URL with trailing slash", async ({
    page,
  }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", "https://keroway.com/");
  });

  test("blog listing outputs canonical URL for site origin", async ({
    page,
  }) => {
    await page.goto("/blog");
    const canonical = page.locator('link[rel="canonical"]');
    // dev server may omit trailing slash; production SSG always adds it
    const href = await canonical.getAttribute("href");
    expect(href).toMatch(/^https:\/\/keroway\.com\/blog\/?$/);
  });

  test("blog post page outputs canonical URL without query strings", async ({
    page,
  }) => {
    await page.goto("/blog");
    const firstPostLink = page
      .locator("div.posts-list > article.post-row")
      .first()
      .locator("a.post-row__link");
    const postHref = await firstPostLink.getAttribute("href");
    if (!postHref) throw new Error("post href not found");
    await page.goto(postHref);

    const canonical = page.locator('link[rel="canonical"]');
    const canonicalHref = await canonical.getAttribute("href");
    // Must be an absolute URL starting with site origin, no query string
    expect(canonicalHref).toMatch(/^https:\/\/keroway\.com\/blog\/.+\/$/);
  });
});

test.describe("Basic site functionality", () => {
  test("home page renders navigation and intro text", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/keroway\.com/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "20 年ぶん"
    );
  });

  test("blog listing shows posts and navigates to the first entry", async ({
    page,
  }) => {
    await page.goto("/blog");

    const postRows = page.locator("div.posts-list > article.post-row");
    const postCount = await postRows.count();
    expect(postCount).toBeGreaterThan(0);

    const firstPostLink = postRows.first().locator("a.post-row__link");
    const firstPostHref = await firstPostLink.getAttribute("href");
    expect(firstPostHref).toMatch(/^\/blog\/.+/);

    await firstPostLink.click();
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article.post")).toBeVisible();
  });

  test("about page renders bio information", async ({ page }) => {
    await page.goto("/about");

    await expect(page).toHaveTitle(/About/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("section.masthead")).toContainText(
      "software engineer"
    );
  });

  test("works listing and detail page render project links", async ({
    page,
  }) => {
    await page.goto("/works");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "作ったものを、"
    );

    const worksCards = page.locator("ul.works-grid > li");
    await expect(worksCards).toHaveCount(1);

    await expect(
      page.getByLabel("primary").getByRole("link", { name: /works/i })
    ).toHaveAttribute("aria-current", "page");

    await worksCards.first().getByRole("link", { name: "Overview" }).click();

    await expect(page).toHaveURL(/\/works\/timeline-dsl\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "timeline-dsl" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "LP を開く" }).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Repository" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Demo" }).first()
    ).toBeVisible();
    await expect(
      page.getByLabel("primary").getByRole("link", { name: /works/i })
    ).toHaveAttribute("aria-current", "page");
  });
});
