/**
 * 外部ホスト画像（imgur.com / googleusercontent.com）を public/ 配下へ移設する CLI
 * Usage: node --experimental-strip-types scripts/migrate-remote-images.ts [--write] [<path-to-article>...]
 *
 * デフォルトはドライラン（対象一覧の表示のみ）。--write でダウンロード・書き換えを実行。
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve(import.meta.dirname, "../src/content/blog");
const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");

const TARGET_HOSTS = ["imgur.com", "googleusercontent.com"];

const IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g;

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

type ImageRef = {
  raw: string;
  alt: string;
  url: string;
  title?: string;
};

function isTargetHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return TARGET_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function collectRefs(content: string): ImageRef[] {
  const refs: ImageRef[] = [];
  IMAGE_PATTERN.lastIndex = 0;
  let match = IMAGE_PATTERN.exec(content);
  while (match !== null) {
    const [raw, alt, url, title] = match;
    if (isTargetHost(url)) {
      refs.push({ raw, alt, url, title });
    }
    match = IMAGE_PATTERN.exec(content);
  }
  return refs;
}

function extFromUrl(url: string): string | null {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return null;
}

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ✗ ダウンロード失敗 (${res.status}): ${url}`);
      return null;
    }
    const contentType = res.headers.get("content-type")?.split(";")[0].trim();
    const ext =
      (contentType && EXT_FROM_CONTENT_TYPE[contentType]) ||
      extFromUrl(url) ||
      ".jpg";
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), ext };
  } catch (error) {
    console.error(
      `  ✗ ダウンロードエラー: ${url} — ${error instanceof Error ? error.message : error}`
    );
    return null;
  }
}

function uniqueFileName(buffer: Buffer, ext: string): string {
  const hash = crypto
    .createHash("sha1")
    .update(buffer)
    .digest("hex")
    .slice(0, 12);
  return `${hash}${ext}`;
}

async function migrateFile(
  filePath: string,
  write: boolean
): Promise<{
  file: string;
  candidates: number;
  migrated: number;
  failed: number;
}> {
  const content = fs.readFileSync(filePath, "utf8");
  const refs = collectRefs(content);

  if (refs.length === 0) {
    return { file: filePath, candidates: 0, migrated: 0, failed: 0 };
  }

  const relPath = path.relative(process.cwd(), filePath);
  console.log(`\n# ${relPath} (${refs.length} 件)`);

  let updated = content;
  let migrated = 0;
  let failed = 0;

  for (const ref of refs) {
    console.log(`  - ${ref.url}`);
    if (!write) {
      console.log(
        `    現在の alt: ${ref.alt || "(空)"}${ref.title ? ` / title: ${ref.title}` : ""}`
      );
      continue;
    }

    const downloaded = await downloadImage(ref.url);
    if (!downloaded) {
      failed++;
      continue;
    }

    const fileName = uniqueFileName(downloaded.buffer, downloaded.ext);
    const destPath = path.join(PUBLIC_DIR, fileName);
    if (!fs.existsSync(destPath)) {
      fs.writeFileSync(destPath, downloaded.buffer);
    }

    const newRef = `![${ref.alt}](/${fileName}${ref.title ? ` "${ref.title}"` : ""})`;
    updated = updated.replace(ref.raw, newRef);
    migrated++;
    console.log(`    → /${fileName}`);
  }

  if (write && migrated > 0) {
    fs.writeFileSync(filePath, updated, "utf8");
  }

  return { file: filePath, candidates: refs.length, migrated, failed };
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

  let totalCandidates = 0;
  let totalMigrated = 0;
  let totalFailed = 0;
  let filesTouched = 0;

  for (const filePath of files) {
    const result = await migrateFile(filePath, write);
    if (result.candidates > 0 || result.failed > 0) filesTouched++;
    totalCandidates += result.candidates;
    totalMigrated += result.migrated;
    totalFailed += result.failed;
  }

  const movedLabel = write ? totalMigrated : totalCandidates;
  console.log(
    `\n${write ? "✓ 移設完了" : "✓ 対象一覧を表示しました（--write で実行）"}: ${filesTouched} ファイル, ${write ? "移設" : "対象"} ${movedLabel} 件, 失敗 ${totalFailed} 件`
  );

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
