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

// audit-blog.ts の正規カテゴリ集合 + 実際に使用されているカテゴリを統合
const CANONICAL_CATEGORIES = [
  "Arduino",
  "BeautifulSoup",
  "Clojure",
  "Cloud",
  "Elixir",
  "GAE",
  "Go",
  "High Sierra",
  "HumbleBundle",
  "JavaScript",
  "Kotlin",
  "Maker Faire Tokyo",
  "Markdown",
  "Mastodon",
  "Mozilla",
  "PHP",
  "Python",
  "REPL",
  "RaspberryPi",
  "Rust",
  "Scratch",
  "Solr",
  "StackEdit",
  "Xamarin",
  "nerodia",
  "nginx",
  "unity",
  "半田",
  "読書",
  "電子書籍",
] as const;

type Frontmatter = {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  pubDate?: string;
};

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const result: Frontmatter = {};
  for (const line of raw.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    const v = val.trim().replace(/^["']|["']$/g, "");
    if (key === "title") result.title = v;
    else if (key === "description") result.description = v;
    else if (key === "category") result.category = v;
    else if (key === "pubDate") result.pubDate = v;
  }
  const tagsMatch = raw.match(/^tags:\s*\[(.*?)\]/m);
  if (tagsMatch) {
    result.tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return result;
}

function extractBody(content: string): string {
  return content.replace(/^---[\s\S]*?---\n/, "").trim();
}

const SCHEMA = {
  type: "object" as const,
  properties: {
    description: {
      type: "string",
      description: "記事の概要（50〜160文字、日本語）",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "記事に関連するタグ（3〜7個、英数字または日本語）",
    },
    category: {
      type: "string",
      enum: [...CANONICAL_CATEGORIES],
      description: "正規カテゴリ集合から最も適切なもの",
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

category は必ず以下の正規リストから選んでください:
${CANONICAL_CATEGORIES.join(", ")}

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

main().catch((err: unknown) => {
  console.error("エラー:", err instanceof Error ? err.message : err);
  process.exit(1);
});
