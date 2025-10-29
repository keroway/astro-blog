import { expect, test } from '@playwright/test';



test.describe('Basic site functionality', () => {
  test('home page renders navigation and intro text', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/keroway 技術メモ/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('テクノロジーの「気になる」を');
  });

  test('blog listing shows posts and navigates to the first entry', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible();

    const cards = page.locator('ul.posts-grid > li.post-card');
    const postCount = await cards.count();
    expect(postCount).toBeGreaterThan(0);

    const firstPost = cards.first().locator('a.post-card__link');
    const firstPostHref = await firstPost.getAttribute('href');
    expect(firstPostHref).toMatch(/^\/blog\/.+/);

    await firstPost.click();
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('article.post')).toBeVisible();
  });

  test('about page renders bio information', async ({ page }) => {
    await page.goto('/about');

    await expect(page).toHaveTitle(/About Me/);
    await expect(page.getByRole('heading', { level: 1, name: 'About Me' })).toBeVisible();
    await expect(page.locator('article.post')).toContainText('ソフトウェアエンジニア');
  });
});
