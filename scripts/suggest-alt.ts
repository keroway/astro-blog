/**
 * alt テキスト候補生成 CLI
 * Usage: node --experimental-strip-types scripts/suggest-alt.ts <path-to-article>
 *
 * ログイン済みの Claude Code 認証を使用。API キーは不要。
 * 出力は提案のみ。ファイルへの書き込みは行わない。
 * スコープ: ローカル画像（public/ 配下）のみ。リモート URL はスキップ。
 */

import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const MIN_ALT_LENGTH = 4;

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

const MEDIA_TYPE_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

type ImageRef = {
  line: number;
  alt: string;
  src: string;
  markdown: string;
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    alt: {
      type: "string",
      description:
        "画像の alt テキスト候補（日本語・簡潔・画像内容と記事文脈を反映、125文字以内）",
    },
    note: {
      type: "string",
      description: "補足メモ（任意）",
    },
  },
  required: ["alt"],
};

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
        markdown: match[0].slice(0, 80),
      });
      match = IMAGE_PATTERN.exec(line);
    }
  }
  return refs;
}

function resolveLocalPath(src: string, repoRoot: string): string | null {
  if (!src.startsWith("/")) return null;
  return path.resolve(repoRoot, "public", `.${src}`);
}

type SuggestResult = {
  alt: string;
  note?: string;
};

async function suggestAlt(
  imgPath: string,
  mediaType: string,
  title: string,
  bodyPreview: string,
  contextLine: string
): Promise<SuggestResult | null> {
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
- 125文字以内に収める
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

  let result: SuggestResult | null = null;

  for await (const message of query({
    prompt: makePrompt(),
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

  return result;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "Usage: node --experimental-strip-types scripts/suggest-alt.ts <path-to-article>"
    );
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`ファイルが見つかりません: ${absPath}`);
    process.exit(1);
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  const content = fs.readFileSync(absPath, "utf8");
  const title = parseFrontmatterTitle(content);
  const body = extractBody(content);
  const bodyPreview =
    body.length > 2000 ? `${body.slice(0, 2000)}\n（以下省略）` : body;
  const bodyLines = body.split("\n");

  const refs = collectImageRefs(content);

  if (refs.length === 0) {
    console.log("画像参照が見つかりませんでした。");
    process.exit(0);
  }

  const relPath = path.relative(repoRoot, absPath);
  console.log(`\n🖼️  ${relPath} の alt テキスト候補を生成中...\n`);

  let localCount = 0;
  let remoteCount = 0;
  let violationCount = 0;

  for (const ref of refs) {
    const isViolation = ref.alt.length < MIN_ALT_LENGTH;
    if (isViolation) violationCount++;

    const altDisplay = ref.alt === "" ? "(空)" : `"${ref.alt}"`;
    const violationMark = isViolation ? " [lint:alt 違反]" : "";
    const location = `${relPath}:${ref.line}`;

    if (ref.src.startsWith("http://") || ref.src.startsWith("https://")) {
      remoteCount++;
      console.log(`--- ${location}${violationMark}`);
      console.log(`  現在の alt : ${altDisplay}`);
      console.log(`  画像       : ${ref.src.slice(0, 60)}...`);
      console.log("  → (リモート画像: スキップ)\n");
      continue;
    }

    const absImg = resolveLocalPath(ref.src, repoRoot);
    if (!absImg) {
      console.log(`--- ${location}${violationMark}`);
      console.log(`  現在の alt : ${altDisplay}`);
      console.log(`  画像       : ${ref.src}`);
      console.log("  → (パス形式非対応: スキップ)\n");
      continue;
    }

    if (!fs.existsSync(absImg)) {
      console.log(`--- ${location}${violationMark}`);
      console.log(`  現在の alt : ${altDisplay}`);
      console.log(`  画像       : ${ref.src}`);
      console.log("  → (ファイル未検出: スキップ)\n");
      continue;
    }

    const ext = path.extname(ref.src).toLowerCase();
    const mediaType = MEDIA_TYPE_MAP[ext];
    if (!mediaType) {
      console.log(`--- ${location}${violationMark}`);
      console.log(`  現在の alt : ${altDisplay}`);
      console.log(`  画像       : ${ref.src}`);
      console.log(`  → (未対応拡張子 ${ext}: スキップ)\n`);
      continue;
    }

    localCount++;
    console.log(`--- ${location}${violationMark}`);
    console.log(`  現在の alt : ${altDisplay}`);
    console.log(`  生成中...`);

    const contextLine = bodyLines[ref.line - 1] ?? "";

    const result = await suggestAlt(
      absImg,
      mediaType,
      title,
      bodyPreview,
      contextLine
    );

    if (!result) {
      console.log(
        "  → 生成失敗。`claude` コマンドでログイン済みか確認してください。\n"
      );
      continue;
    }

    console.log(`  提案 alt   : "${result.alt}"`);
    if (result.note) {
      console.log(`  補足       : ${result.note}`);
    }
    console.log();
  }

  console.log(
    `=== サマリ: ローカル ${localCount} 件処理 / リモート ${remoteCount} 件スキップ / lint:alt 違反 ${violationCount} 件 ===`
  );
}

main().catch((err: unknown) => {
  console.error("エラー:", err instanceof Error ? err.message : err);
  process.exit(1);
});
