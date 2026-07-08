/**
 * alt テキスト一括補完 CLI（ローカル画像のみ対象）
 * Usage: node --experimental-strip-types scripts/backfill-alt-text.ts [--write] [<path-to-article>...]
 *
 * ログイン済みの Claude Code 認証を使用。API キーは不要。
 * デフォルトは提案の表示のみ。--write で frontmatter/本文へ書き込み。
 * 対象: alt が空 / 4 文字未満 / "enter image description here" のようなプレースホルダの
 *       ローカル画像参照（public/ 配下）。リモート URL は対象外。
 */

import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const BLOG_DIR = path.resolve(import.meta.dirname, "../src/content/blog");
const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");

const MIN_ALT_LENGTH = 4;
const PLACEHOLDER_ALTS = new Set([
  "enter image description here",
  "image",
  "img",
  "sample",
  "update",
]);

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

const MEDIA_TYPE_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    alt: {
      type: "string",
      description:
        "画像の alt テキスト候補（日本語・簡潔・画像内容と記事文脈を反映、20〜60文字程度・80文字以内）",
    },
  },
  required: ["alt"],
};

type ImageRef = {
  line: number;
  alt: string;
  src: string;
  title?: string;
  raw: string;
};

function isBadAlt(alt: string): boolean {
  const trimmed = alt.trim();
  return (
    trimmed.length < MIN_ALT_LENGTH ||
    PLACEHOLDER_ALTS.has(trimmed.toLowerCase()) ||
    /^\d+$/.test(trimmed)
  );
}

function parseFrontmatterTitle(content: string): string {
  const match = content.match(
    /^---\r?\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m
  );
  return match ? match[1].trim() : "";
}

function extractBody(content: string): string {
  return content.replace(/^---[\s\S]*?---\n/, "").trim();
}

function collectImageRefs(content: string): ImageRef[] {
  const lines = content.split("\n");
  const refs: ImageRef[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    IMAGE_PATTERN.lastIndex = 0;
    let match = IMAGE_PATTERN.exec(line);
    while (match !== null) {
      refs.push({
        line: i + 1,
        alt: match[1].trim(),
        src: match[2].trim(),
        title: match[3],
        raw: match[0],
      });
      match = IMAGE_PATTERN.exec(line);
    }
  }
  return refs;
}

function resolveLocalPath(src: string): string | null {
  if (!src.startsWith("/")) return null;
  return path.resolve(PUBLIC_DIR, `.${src}`);
}

async function suggestAlt(
  imgPath: string,
  mediaType: string,
  title: string,
  bodyPreview: string,
  contextLine: string
): Promise<string | null> {
  const imgBase64 = fs.readFileSync(imgPath, "base64");

  async function* makePrompt() {
    yield {
      type: "user" as const,
      parent_tool_use_id: null,
      message: {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `以下は日本語技術ブログ（keroway.com）の記事に埋め込まれた画像です。

記事タイトル: ${title || "（未設定）"}
画像が登場する行の文脈: ${contextLine}

--- 記事本文（抜粋）---
${bodyPreview}
--- 本文終了 ---

この画像に対して、視覚障害者向けのスクリーンリーダーで読み上げられる alt テキストを日本語で提案してください。
- 画像の内容を具体的かつ簡潔に説明する
- 記事の文脈に沿った表現を使う
- 20〜60文字程度、長くても80文字以内に収める
- 一文ではなく短い語句・フレーズを優先する
- 「〜の画像」「〜を示す図」のような冗長な接尾辞は不要`,
          },
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: imgBase64,
            },
          },
        ],
      },
    };
  }

  let alt: string | null = null;

  for await (const message of query({
    prompt: makePrompt(),
    options: {
      outputFormat: {
        type: "json_schema",
        schema: SCHEMA,
      },
      tools: [],
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
      alt = String(
        (message.structured_output as { alt?: string }).alt ?? ""
      ).trim();
    }
  }

  return alt || null;
}

async function processFile(
  filePath: string,
  write: boolean
): Promise<{ updated: number; skipped: number }> {
  const content = fs.readFileSync(filePath, "utf8");
  const title = parseFrontmatterTitle(content);
  const body = extractBody(content);
  const bodyPreview =
    body.length > 2000 ? `${body.slice(0, 2000)}\n（以下省略）` : body;
  const contentLines = content.split("\n");

  const refs = collectImageRefs(content).filter((ref) => isBadAlt(ref.alt));
  if (refs.length === 0) return { updated: 0, skipped: 0 };

  const relPath = path.relative(process.cwd(), filePath);
  console.log(`\n# ${relPath} (${refs.length} 件)`);

  let updated = content;
  let updatedCount = 0;
  let skipped = 0;

  for (const ref of refs) {
    if (ref.src.startsWith("http://") || ref.src.startsWith("https://")) {
      console.log(`  - ${ref.src} → (リモート画像: スキップ)`);
      skipped++;
      continue;
    }

    const absImg = resolveLocalPath(ref.src);
    if (!absImg || !fs.existsSync(absImg)) {
      console.log(`  - ${ref.src} → (ファイル未検出: スキップ)`);
      skipped++;
      continue;
    }

    const ext = path.extname(ref.src).toLowerCase();
    const mediaType = MEDIA_TYPE_MAP[ext];
    if (!mediaType) {
      console.log(`  - ${ref.src} → (未対応拡張子 ${ext}: スキップ)`);
      skipped++;
      continue;
    }

    const contextLine = contentLines[ref.line - 1] ?? "";
    let alt: string | null = null;
    try {
      alt = await suggestAlt(
        absImg,
        mediaType,
        title,
        bodyPreview,
        contextLine
      );
    } catch (error) {
      console.log(
        `  - ${ref.src} → 生成失敗: ${error instanceof Error ? error.message : error}`
      );
      skipped++;
      continue;
    }

    if (!alt) {
      console.log(`  - ${ref.src} → 生成失敗`);
      skipped++;
      continue;
    }

    console.log(`  - ${ref.src} → "${alt}"`);

    if (write) {
      const newRef = `![${alt}](${ref.src}${ref.title ? ` "${ref.title}"` : ""})`;
      updated = updated.replace(ref.raw, newRef);
      updatedCount++;
    } else {
      updatedCount++;
    }
  }

  if (write && updatedCount > 0) {
    fs.writeFileSync(filePath, updated, "utf8");
  }

  return { updated: updatedCount, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const targets = args.filter((arg) => !arg.startsWith("--"));

  const files = (
    targets.length > 0
      ? targets.map((t) => path.resolve(t))
      : fs
          .readdirSync(BLOG_DIR)
          .filter((f) => f.endsWith(".md") || f.endsWith(".mdoc"))
          .map((f) => path.join(BLOG_DIR, f))
  ).sort();

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const filePath of files) {
    const result = await processFile(filePath, write);
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
  }

  console.log(
    `\n${write ? "✓ alt テキストを更新しました" : "✓ 提案を出力しました"}: ${totalUpdated} 件, スキップ ${totalSkipped} 件`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
