import { expect, test } from "@playwright/test";

// #587 リグレッション: reveal 演出は SDA (animation-timeline: view()) を撤去し、
// 全ブラウザ IntersectionObserver に一本化した。Playwright の toBeVisible() は
// opacity:0 でも「可視」扱いになるため使わず、computed opacity を直接検証する。
async function opacityOf(locator: import("@playwright/test").Locator) {
  return locator.evaluate((el) => getComputedStyle(el).opacity);
}

test.describe("#587 scroll reveal is IntersectionObserver-driven and never sticks at opacity:0", () => {
  test("bottom section becomes visible after scrollIntoView on first load", async ({
    page,
  }) => {
    await page.goto("/");
    const focusAreas = page.locator("#focus-areas-heading").locator("..");
    await focusAreas.scrollIntoViewIfNeeded();
    await expect.poll(() => opacityOf(focusAreas)).toBe("1");
  });

  test("fold-in element is visible right after reload (#513 regression)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.reload();
    const hero = page.locator(".hero");
    await expect.poll(() => opacityOf(hero)).toBe("1");
  });

  test("reveal still works and kw-anim is re-applied after a View Transitions navigation from /blog", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.locator('.kw-header__nav a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveClass(/kw-anim/);

    const focusAreas = page.locator("#focus-areas-heading").locator("..");
    await focusAreas.scrollIntoViewIfNeeded();
    await expect.poll(() => opacityOf(focusAreas)).toBe("1");
  });

  test("reduced motion shows everything immediately without kw-anim", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/kw-anim/);

    const hero = page.locator(".hero");
    const focusAreas = page.locator("#focus-areas-heading").locator("..");
    await expect.poll(() => opacityOf(hero)).toBe("1");
    await expect.poll(() => opacityOf(focusAreas)).toBe("1");
  });
});
