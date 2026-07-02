/**
 * CMS / Astro スキーマ 同期テスト
 *
 * public/admin/config.yml (Sveltia CMS) と src/content.config.ts (Astro) が
 * 同じ列挙値・必須性を持っていることを保証する回帰テスト。
 * どちらかを変更した場合はこのテストが失敗するため、両方の整合を取ること。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { BLOG_CATEGORIES, WORKS_STATUSES } from "./content-schema";

// リポジトリルートから CMS 設定を読み込む
const configYml = readFileSync(
  join(import.meta.dirname, "../../public/admin/config.yml"),
  "utf8"
);
const cmsConfig = parse(configYml) as {
  collections: Array<{
    name: string;
    fields: Array<{
      name: string;
      required?: boolean;
      options?: Array<{ label: string; value: string }>;
    }>;
  }>;
};

function getCollection(name: string) {
  const col = cmsConfig.collections.find((c) => c.name === name);
  if (!col) throw new Error(`CMS collection "${name}" が見つかりません`);
  return col;
}

function getField(collectionName: string, fieldName: string) {
  const col = getCollection(collectionName);
  const field = col.fields.find((f) => f.name === fieldName);
  if (!field)
    throw new Error(
      `CMS collection "${collectionName}" に field "${fieldName}" が見つかりません`
    );
  return field;
}

// ──────────────────────────────────────────────────────────────────
// Blog series の必須性テスト
// ──────────────────────────────────────────────────────────────────
describe("CMS blog.series の必須性", () => {
  it("series フィールドは required: false（Astro schema の optional() に対応）", () => {
    const field = getField("blog", "series");
    expect(field.required).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
// Blog カテゴリの同期テスト
// ──────────────────────────────────────────────────────────────────
describe("CMS blog.category と BLOG_CATEGORIES の同期", () => {
  it("CMS の category option value が BLOG_CATEGORIES と完全一致する", () => {
    const field = getField("blog", "category");
    const cmsValues = (field.options ?? []).map((o) => o.value);
    expect(cmsValues).toEqual([...BLOG_CATEGORIES]);
  });

  it("CMS の category フィールドは required: false（Astro schema の optional() に対応）", () => {
    const field = getField("blog", "category");
    // Sveltia/Decap CMS では required を省略すると true 扱いになる。
    // content.config.ts で optional() にしているため CMS 側も required: false が必要。
    expect(field.required).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
// Works ステータスの同期テスト
// ──────────────────────────────────────────────────────────────────
describe("CMS works.status と WORKS_STATUSES の同期", () => {
  it("CMS の status option value が WORKS_STATUSES と完全一致する", () => {
    const field = getField("works", "status");
    const cmsValues = (field.options ?? []).map((o) => o.value);
    expect(cmsValues).toEqual([...WORKS_STATUSES]);
  });
});

// ──────────────────────────────────────────────────────────────────
// Works lpUrl の必須性テスト
// ──────────────────────────────────────────────────────────────────
describe("CMS works.lpUrl の必須性", () => {
  it("lpUrl は required: false ではない（Astro schema の z.url() 必須に対応）", () => {
    const field = getField("works", "lpUrl");
    // required が false に設定されていないことを確認する
    expect(field.required).not.toBe(false);
  });
});
