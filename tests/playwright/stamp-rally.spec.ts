import { expect, test } from "@playwright/test";

// #833 リグレッション: localStorage の未知 ID・配列以外の値を達成数へ算入しない。
const STAMP_KEY = "kw-stamp-rally:v1";

async function visitColophonWith(
  page: import("@playwright/test").Page,
  saved: string
) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STAMP_KEY, saved]
  );
  await page.goto("/colophon/");
}

test.describe("#851 stamp rally script is evaluated safely twice", () => {
  test("colophon direct access raises no page error and collects the stamp", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/colophon/");
    await expect(
      page.locator('.stamp-book__item[data-stamp-id="colophon"]')
    ).toHaveClass(/is-collected/);
    expect(errors).toEqual([]);
  });
});

test.describe("#954 stamp rally exposes collected state as text", () => {
  test("partial collection labels each station in text", async ({ page }) => {
    await visitColophonWith(page, JSON.stringify(["home"]));
    const state = (id: string) =>
      page.locator(
        `.stamp-book__item[data-stamp-id="${id}"] [data-stamp-state]`
      );
    await expect(state("home")).toHaveText("取得済み");
    await expect(state("colophon")).toHaveText("取得済み");
    await expect(state("works")).toHaveText("未取得");
    await expect(
      page.locator("[data-stamp-state]", { hasText: "未取得" })
    ).toHaveCount(4);
  });

  test("full collection labels every station collected", async ({ page }) => {
    await visitColophonWith(
      page,
      JSON.stringify(["home", "works", "blog", "about", "now"])
    );
    await expect(page.locator("[data-stamp-state]")).toHaveText(
      Array(6).fill("取得済み")
    );
  });
});

test.describe("#970 stamp rally keeps stamps when saving fails", () => {
  test("stamps survive client-side navigation and the user is told", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    await page.goto("/");
    await page.locator('footer a[href="/colophon"]').click();
    await expect(page).toHaveURL(/\/colophon\/?$/);
    await expect(
      page.locator('.stamp-book__item[data-stamp-id="colophon"]')
    ).toHaveClass(/is-collected/);
    await expect(
      page.locator('.stamp-book__item[data-stamp-id="home"]')
    ).toHaveClass(/is-collected/);
    await expect(page.locator("[data-stamp-unsaved]")).toBeVisible();
  });
});

test.describe("#833 stamp rally validates saved values", () => {
  test("unknown ids do not trigger the completion message", async ({
    page,
  }) => {
    await visitColophonWith(
      page,
      JSON.stringify(["x1", "x2", "x3", "x4", "x5", "x6"])
    );
    await expect(page.locator(".stamp-book__item.is-collected")).toHaveCount(1);
    await expect(page.locator("[data-stamp-complete]")).toBeHidden();
  });

  test("non-array saved value is ignored", async ({ page }) => {
    await visitColophonWith(page, JSON.stringify({ home: true }));
    await expect(page.locator(".stamp-book__item.is-collected")).toHaveCount(1);
    await expect(page.locator("[data-stamp-complete]")).toBeHidden();
  });

  test("all known ids show the completion message", async ({ page }) => {
    await visitColophonWith(
      page,
      JSON.stringify(["home", "works", "blog", "about", "now"])
    );
    await expect(page.locator("[data-stamp-complete]")).toBeVisible();
  });
});
