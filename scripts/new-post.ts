/**
 * 新規 blog 記事 scaffolding CLI
 *
 * Usage:
 *   node --experimental-strip-types scripts/new-post.ts "記事タイトル"
 *   node --experimental-strip-types scripts/new-post.ts "My Article" --slug my-article
 *   node --experimental-strip-types scripts/new-post.ts "My Article" --suggest
 *
 * slug は ADR 0010 の命名規則 ([a-z0-9-] のみ) に準拠する。
 * 日本語タイトルは自動変換できないため --slug で手動指定を推奨。
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s_./\\]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseArgs(argv: string[]): {
  title: string;
  slug: string | null;
  suggest: boolean;
} {
  const args = argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error(
      'Usage: pnpm run new-post "タイトル" [--slug <slug>] [--suggest]'
    );
    process.exit(1);
  }
  const title = args[0];
  let slug: string | null = null;
  let suggest = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) {
      slug = args[++i];
    } else if (args[i] === "--suggest") {
      suggest = true;
    }
  }
  return { title, slug, suggest };
}

const { title, slug: slugOverride, suggest } = parseArgs(process.argv);

const autoSlug = generateSlug(title);
const slug = slugOverride ?? autoSlug;

if (!slug) {
  console.error(
    "Error: slug を自動生成できませんでした (日本語タイトルは --slug で手動指定してください)"
  );
  console.error(
    '  例: pnpm run new-post "日本語タイトル" --slug my-article-slug'
  );
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
  console.error(
    `Error: slug "${slug}" は ADR 0010 の命名規則 ([a-z0-9-]、先頭末尾はハイフン不可) に違反します`
  );
  process.exit(1);
}

const filePath = path.join(BLOG_DIR, `${slug}.mdoc`);

if (fs.existsSync(filePath)) {
  console.error(`Error: ${filePath} は既に存在します`);
  process.exit(1);
}

const today = getTodayIso();
const frontmatter = `---
title: ${JSON.stringify(title)}
description: ""
pubDate: ${today}
draft: true
---
`;

fs.writeFileSync(filePath, frontmatter, "utf-8");
console.log(`Created: src/content/blog/${slug}.mdoc`);
console.log(`  title: ${title}`);
console.log(`  slug:  ${slug}`);
console.log(`  date:  ${today}`);
console.log(`  draft: true`);

if (!slugOverride && autoSlug !== title) {
  console.log("");
  console.log(
    `Note: slug は自動生成されました。意図しない場合は --slug で指定してください。`
  );
}

if (suggest) {
  console.log("");
  console.log("Running suggest-frontmatter…");
  try {
    execFileSync(
      "node",
      [
        "--experimental-strip-types",
        "scripts/suggest-frontmatter.ts",
        filePath,
      ],
      { stdio: "inherit" }
    );
  } catch {
    console.error("suggest-frontmatter の実行に失敗しました");
  }
}
