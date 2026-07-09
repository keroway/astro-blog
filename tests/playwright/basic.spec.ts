import { expect, test } from "@playwright/test";

// JSON-LD の image は文字列 / 配列 / ImageObject のいずれの形でも許容されるため、
// どの形でも先頭の URL 文字列を取り出して検証できるよう正規化する。
function extractImageUrl(image: unknown): string | undefined {
  const pick = (v: unknown): string | undefined => {
    if (typeof v === "string") return v;
    if (
      v &&
      typeof v === "object" &&
      typeof (v as { url?: unknown }).url === "string"
    ) {
      return (v as { url: string }).url;
    }
    return undefined;
  };
  if (Array.isArray(image)) return pick(image[0]);
  return pick(image);
}

function parseJsonPayload<T>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new Error(
      `invalid JSON-LD payload: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

test.describe("SEO: JSON-LD structured data", () => {
  test("homepage outputs WebSite and Person JSON-LD", async ({ page }) => {
    await page.goto("/");
    const ldJson = page.locator('script[type="application/ld+json"]');
    const count = await ldJson.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const payloads = await ldJson.allTextContents();
    const parsed = payloads.map((payload) =>
      parseJsonPayload<Record<string, unknown>>(payload)
    );

    const website = parsed.find((entry) => entry["@type"] === "WebSite");
    if (!website) throw new Error("WebSite JSON-LD not found");
    expect(website.url).toMatch(/^https:\/\/keroway\.com\/?$/);

    const person = parsed.find((entry) => entry["@type"] === "Person");
    if (!person) throw new Error("Person JSON-LD not found");
    expect(person.jobTitle).toBe("Software Engineer");
    expect(person.description).toContain("ソフトウェアエンジニア");
    expect(person.knowsAbout).toContain("AI 活用開発");
  });

  test("blog post outputs BlogPosting JSON-LD alongside WebSite", async ({
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

    const ldJson = page.locator('script[type="application/ld+json"]');
    await expect(ldJson).toHaveCount(4);
    const payloads = await ldJson.allTextContents();
    const parsed = payloads.map((payload) =>
      parseJsonPayload<Record<string, unknown>>(payload)
    );
    const types = parsed.map((p) => p["@type"]);
    expect(types).toContain("Person");
    expect(types).toContain("WebSite");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("BlogPosting");
    const post = parsed.find((entry) => entry["@type"] === "BlogPosting");
    if (!post) throw new Error("BlogPosting JSON-LD not found");
    expect(post.headline).toBeTruthy();
    expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect((post.author as { name?: string } | undefined)?.name).toBeTruthy();
    expect(post.url).toMatch(/^https:\/\/keroway\.com\/blog\/.+\/$/);

    // OG 画像生成 (gen-og-default.ts / heroImage) のデグレ検知:
    // BlogPosting JSON-LD の image が有効な絶対 URL であること
    const jsonLdImage = extractImageUrl(post.image);
    expect(jsonLdImage).toBeTruthy();
    expect(jsonLdImage).toMatch(/^https?:\/\//);

    // og:image meta タグが有効な絶対 URL であること
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toMatch(/^https?:\/\//);
  });
});

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

test.describe("Tag pages", () => {
  test("tag page renders post listing and breadcrumb to blog", async ({
    page,
  }) => {
    await page.goto("/blog/tags/%E8%AA%AD%E6%9B%B8/");

    await expect(page).toHaveTitle(/読書/);
    const posts = page.locator("div.posts-list > article.post-row");
    await expect(posts.first()).toBeVisible();
    expect(await posts.count()).toBeGreaterThanOrEqual(1);
  });

  test("blog post page shows tag links that navigate to tag page", async ({
    page,
  }) => {
    await page.goto("/blog/book-pragmatic-programmer/");

    const tagLink = page.locator(".post__tags a").first();
    await expect(tagLink).toBeVisible();
    await tagLink.click();
    await expect(page).toHaveURL(/\/blog\/tags\//);
    const posts = page.locator("div.posts-list > article.post-row");
    await expect(posts.first()).toBeVisible();
  });
});

test.describe("Basic site functionality", () => {
  test("llms.txt endpoint returns markdown index", async ({ page }) => {
    const response = await page.goto("/llms.txt");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toContainText("# keroway.com");
    await expect(page.locator("body")).toContainText("## Blog");
    await expect(page.locator("body")).toContainText("## Works");
  });

  test("home page renders navigation and intro text", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/keroway\.com/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "手を動かし"
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
    expect(await worksCards.count()).toBeGreaterThanOrEqual(2);

    await expect(
      worksCards.filter({
        has: page.getByRole("heading", { name: "obsidian-clipper" }),
      })
    ).toHaveCount(1);

    await expect(
      page.getByLabel("primary").getByRole("link", { name: /works/i })
    ).toHaveAttribute("aria-current", "page");

    const timelineCard = worksCards.filter({
      has: page.getByRole("heading", { name: "timeline-dsl" }),
    });
    await timelineCard.getByRole("link", { name: "Overview" }).click();

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
