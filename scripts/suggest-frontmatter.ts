/**
 * frontmatter 補完提案 CLI
 * Usage: node --experimental-strip-types scripts/suggest-frontmatter.ts <path-to-article>
 *
 * ログイン済みの Claude Code 認証を使用。API キーは不要。
 * 出力は提案のみ。ファイルへの書き込みは行わない。
 */

import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { parse } from "yaml";
import { BLOG_CATEGORIES } from "../src/lib/content-schema";
import { stripBom } from "./lib/strip-bom.ts";
import { MAX_DESCRIPTION_LENGTH } from "./lint-description-length.ts";

type Frontmatter = {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  pubDate?: string;
};

export function parseFrontmatter(content: string): Frontmatter {
  const match = stripBom(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = parse(match[1]) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return {};
  const result: Frontmatter = {};
  if (typeof data.title === "string") result.title = data.title;
  if (typeof data.description === "string") {
    result.description = data.description;
  }
  if (typeof data.category === "string") result.category = data.category;
  if (data.pubDate instanceof Date) {
    result.pubDate = data.pubDate.toISOString();
  } else if (typeof data.pubDate === "string") {
    result.pubDate = data.pubDate;
  }
  if (Array.isArray(data.tags)) {
    result.tags = data.tags.map(String).filter(Boolean);
  }
  return result;
}

function extractBody(content: string): string {
  return stripBom(content)
    .replace(/^---[\s\S]*?---\n/, "")
    .trim();
}

const MIN_DESCRIPTION_LENGTH = 50;

export function isValidSuggestedDescription(description: string): boolean {
  return (
    description.length >= MIN_DESCRIPTION_LENGTH &&
    description.length <= MAX_DESCRIPTION_LENGTH
  );
}

export const SCHEMA = {
  type: "object" as const,
  properties: {
    description: {
      type: "string",
      minLength: MIN_DESCRIPTION_LENGTH,
      maxLength: MAX_DESCRIPTION_LENGTH,
      description: `記事の概要（${MIN_DESCRIPTION_LENGTH}〜${MAX_DESCRIPTION_LENGTH}文字、日本語）`,
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "記事に関連するタグ（3〜7個、英数字または日本語）",
    },
    category: {
      type: "string",
      enum: [...BLOG_CATEGORIES],
      description:
        "サイトのカテゴリ（dev / hardware / tools / reading / event）から最も適切なもの",
    },
    category_note: {
      type: "string",
      description: "カテゴリの適合度が低い場合の補足メモ（任意）",
    },
  },
  required: ["description", "tags", "category"],
};

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "Usage: node --experimental-strip-types scripts/suggest-frontmatter.ts <path-to-article>"
    );
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`ファイルが見つかりません: ${absPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absPath, "utf8");
  const fm = parseFrontmatter(content);
  const body = extractBody(content);

  const missingFields: string[] = [];
  if (!fm.description) missingFields.push("description");
  if (!fm.tags || fm.tags.length === 0) missingFields.push("tags");
  if (!fm.category) missingFields.push("category");

  const currentInfo = [
    fm.description && `現在の description: "${fm.description}"`,
    fm.category && `現在の category: "${fm.category}"`,
    fm.tags?.length && `現在の tags: [${fm.tags.join(", ")}]`,
  ]
    .filter(Boolean)
    .join("\n");

  const bodyPreview =
    body.length > 3000 ? `${body.slice(0, 3000)}\n（以下省略）` : body;

  const prompt = `以下は日本語技術ブログ（keroway.com）の Markdown 記事です。

タイトル: ${fm.title ?? "（未設定）"}
${currentInfo ? `\n${currentInfo}` : ""}

--- 記事本文 ---
${bodyPreview}
--- 本文終了 ---

上記の記事について、frontmatter フィールドの改善候補を提案してください。
${missingFields.length > 0 ? `欠落フィールド（必須提案）: ${missingFields.join(", ")}` : "すべてのフィールドが設定済みです。より良い候補があれば提案してください。"}

category は必ず以下のサイトカテゴリから選んでください:
${BLOG_CATEGORIES.join(", ")}

リストに完全に合うものがなければ最も近いものを選び、category_note でその旨を記してください。`;

  console.log(
    `\n📝 ${path.basename(filePath)} の frontmatter 補完提案を生成中...\n`
  );

  type SuggestResult = {
    description: string;
    tags: string[];
    category: string;
    category_note?: string;
  };

  let result: SuggestResult | null = null;

  for await (const message of query({
    prompt,
    options: {
      outputFormat: {
        type: "json_schema",
        schema: SCHEMA,
      },
      allowedTools: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      settingSources: ["project"],
    },
  })) {
    if (
      message.type === "result" &&
      message.subtype === "success" &&
      message.structured_output
    ) {
      result = message.structured_output as SuggestResult;
    }
  }

  if (!result) {
    console.error(
      "提案の生成に失敗しました。`claude` コマンドでログイン済みか確認してください。"
    );
    process.exit(1);
  }

  if (!isValidSuggestedDescription(result.description)) {
    console.error(
      `提案された description が文字数制約 (${MIN_DESCRIPTION_LENGTH}〜${MAX_DESCRIPTION_LENGTH}文字) を満たしません (${result.description.length}文字)。再実行してください。`
    );
    process.exit(1);
  }

  console.log("=== frontmatter 補完提案 ===\n");
  console.log(`description: "${result.description}"`);
  console.log(`tags: [${result.tags.map((t) => `"${t}"`).join(", ")}]`);
  console.log(`category: "${result.category}"`);

  if (result.category_note) {
    console.log(`\n⚠️  カテゴリ補足: ${result.category_note}`);
  }

  if (fm.description && fm.description !== result.description) {
    console.log(`\n現在の description: "${fm.description}"`);
    console.log("→ 上記の提案への差し替えを検討してください。");
  }
  if (fm.category && fm.category !== result.category) {
    console.log(
      `\n現在の category: "${fm.category}" → 提案: "${result.category}"`
    );
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error("エラー:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
