/**
 * ヒーロー画像重複 / 本文冒頭の裸 URL 検出レポート CLI
 * Usage: node --experimental-strip-types scripts/audit-hero-dup.ts
 *
 * レポート出力のみ。ファイルへの書き込みは行わない (issue #650)。
 *
 * ヒーロー重複判定は「寸法一致」を粗いシグナルとし、追加でファイル内容の
 * SHA-256 ハッシュが一致するかどうかで「確実に同一画像」か
 * 「寸法だけ一致（偽陽性の可能性）」かを区別する。
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "src/content/blog");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");

type HeroDupResult = {
  file: string;
  heroPath: string;
  bodyImagePath: string;
  heroDims: string;
  bodyDims: string;
  confirmed: boolean;
};

type BareUrlResult = {
  file: string;
  blockIndex: number;
  url: string;
};

function parseHeroImage(frontmatter: string): string | null {
  const m = frontmatter.match(/^heroImage:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  return m ? m[1].trim() : null;
}

function extractBody(content: string): string {
  return content.replace(/^---[\s\S]*?---\r?\n/, "");
}

function firstBodyImage(body: string): string | null {
  const m = body.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
  return m ? m[1].trim() : null;
}

/** `/foo.png` 形式は public/ 直下、`/src/...` 形式はリポジトリルート起点で解決する。 */
function resolveImagePath(imgPath: string): string | null {
  if (/^https?:\/\//.test(imgPath)) return null;
  if (imgPath.startsWith("/")) {
    const inPublic = path.join(PUBLIC_DIR, imgPath);
    if (fs.existsSync(inPublic)) return inPublic;
    const fromRoot = path.join(REPO_ROOT, imgPath.replace(/^\//, ""));
    if (fs.existsSync(fromRoot)) return fromRoot;
    return null;
  }
  return null;
}

async function checkHeroDup(
  file: string,
  frontmatter: string,
  body: string
): Promise<HeroDupResult | null> {
  const heroRaw = parseHeroImage(frontmatter);
  const bodyImgRaw = firstBodyImage(body);
  if (!heroRaw || !bodyImgRaw) return null;

  const heroPath = resolveImagePath(heroRaw);
  const bodyImagePath = resolveImagePath(bodyImgRaw);
  if (!heroPath || !bodyImagePath) return null;
  if (heroPath === bodyImagePath) return null;

  const [heroMeta, bodyMeta] = await Promise.all([
    sharp(heroPath).metadata(),
    sharp(bodyImagePath).metadata(),
  ]);
  if (!heroMeta.width || !bodyMeta.width) return null;
  if (
    heroMeta.width !== bodyMeta.width ||
    heroMeta.height !== bodyMeta.height
  ) {
    return null;
  }

  const [heroHash, bodyHash] = [
    crypto.createHash("sha256").update(fs.readFileSync(heroPath)).digest("hex"),
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(bodyImagePath))
      .digest("hex"),
  ];

  return {
    file,
    heroPath: heroRaw,
    bodyImagePath: bodyImgRaw,
    heroDims: `${heroMeta.width}x${heroMeta.height}`,
    bodyDims: `${bodyMeta.width}x${bodyMeta.height}`,
    confirmed: heroHash === bodyHash,
  };
}

/** 本文の先頭 3 ブロック (空行区切り) の中の各行を見て、行全体が裸 URL の行があれば列挙する。 */
function checkBareUrls(file: string, body: string): BareUrlResult[] {
  const blocks = body
    .trim()
    .split(/\n{2,}/)
    .slice(0, 3);
  const results: BareUrlResult[] = [];
  blocks.forEach((block, i) => {
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (/^https?:\/\/\S+$/.test(trimmed)) {
        results.push({ file, blockIndex: i + 1, url: trimmed });
      }
    }
  });
  return results;
}

async function main() {
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdoc") || f.endsWith(".md"))
    .sort();

  const heroDups: HeroDupResult[] = [];
  const bareUrls: BareUrlResult[] = [];

  for (const file of files) {
    const full = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(full, "utf8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = fmMatch ? fmMatch[1] : "";
    const body = extractBody(content);

    const dup = await checkHeroDup(file, frontmatter, body);
    if (dup) heroDups.push(dup);

    bareUrls.push(...checkBareUrls(file, body));
  }

  const confirmedDups = heroDups.filter((d) => d.confirmed);
  const suspectDups = heroDups.filter((d) => !d.confirmed);

  console.log(`# ヒーロー画像重複 / 裸 URL 検出レポート\n`);
  console.log(`対象: \`src/content/blog\` 全 ${files.length} 記事\n`);

  console.log(
    `## ヒーロー画像と本文 1 枚目の重複疑い (${heroDups.length} 件)\n`
  );
  console.log(
    `寸法一致で検出。SHA-256 ハッシュも一致するものは「確実に同一ファイル」、` +
      `寸法のみ一致するものは「偽陽性の可能性あり（別ファイルとして目視確認が必要）」。\n`
  );

  if (confirmedDups.length > 0) {
    console.log(`### 確実に同一ファイル (${confirmedDups.length} 件)\n`);
    console.log(`| 記事 | heroImage | 本文1枚目 | 寸法 |`);
    console.log(`|---|---|---|---|`);
    for (const d of confirmedDups) {
      console.log(
        `| ${d.file} | \`${d.heroPath}\` | \`${d.bodyImagePath}\` | ${d.heroDims} |`
      );
    }
    console.log("");
  }

  if (suspectDups.length > 0) {
    console.log(`### 寸法のみ一致（要目視確認） (${suspectDups.length} 件)\n`);
    console.log(`| 記事 | heroImage | 本文1枚目 | 寸法 |`);
    console.log(`|---|---|---|---|`);
    for (const d of suspectDups) {
      console.log(
        `| ${d.file} | \`${d.heroPath}\` | \`${d.bodyImagePath}\` | hero ${d.heroDims} / body ${d.bodyDims} |`
      );
    }
    console.log("");
  }

  console.log(`## 本文先頭3ブロック以内の裸 URL (${bareUrls.length} 件)\n`);
  console.log(`| 記事 | ブロック位置 | URL |`);
  console.log(`|---|---|---|`);
  for (const u of bareUrls) {
    console.log(`| ${u.file} | ${u.blockIndex} | ${u.url} |`);
  }
}

main();
