import { expect, test } from "@playwright/test";

test.describe("Basic site functionality", () => {
  test("home page renders navigation and intro text", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/keroway\.com/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "技術と"
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
      "実装したものを、"
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
