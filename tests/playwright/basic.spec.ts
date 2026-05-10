import { expect, test } from "@playwright/test";

test.describe("Basic site functionality", () => {
  test("home page renders navigation and intro text", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/keroway\.com/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "技術研究"
    );
  });

  test("blog listing shows posts and navigates to the first entry", async ({
    page,
  }) => {
    await page.goto("/blog");

    await expect(
      page.getByRole("heading", { level: 1, name: "Blog" })
    ).toBeVisible();

    const cards = page.locator("ul.posts-grid > li.post-card");
    const postCount = await cards.count();
    expect(postCount).toBeGreaterThan(0);

    const firstPost = cards.first().locator("a.post-card__link");
    const firstPostHref = await firstPost.getAttribute("href");
    expect(firstPostHref).toMatch(/^\/blog\/.+/);

    await firstPost.click();
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article.post")).toBeVisible();
  });

  test("about page renders bio information", async ({ page }) => {
    await page.goto("/about");

    await expect(page).toHaveTitle(/About/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("section.profile")).toContainText(
      "Software Engineer"
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
      page
        .getByLabel("メインナビゲーション")
        .getByRole("link", { name: "Works" })
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
      page
        .getByLabel("メインナビゲーション")
        .getByRole("link", { name: "Works" })
    ).toHaveAttribute("aria-current", "page");
  });
});
