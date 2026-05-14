import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.resolve(import.meta.dirname, '../src/content/blog');
const READING_SPEED = 400; // 日本語: 約 400 文字/分

function hasReadingTime(content: string): boolean {
  return /^readingTime:/m.test(content);
}

function calcReadingTime(content: string): number {
  // frontmatter を除いた本文の文字数
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  return Math.max(1, Math.ceil(body.length / READING_SPEED));
}

function insertAfterPubDate(content: string, minutes: number): string {
  // pubDate 行の直後に readingTime を挿入
  return content.replace(/(^pubDate:.*$)/m, `$1\nreadingTime: ${minutes}`);
}

const files = fs
  .readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .sort();

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (hasReadingTime(content)) {
    skipped++;
    continue;
  }
  const minutes = calcReadingTime(content);
  const updated_content = insertAfterPubDate(content, minutes);
  fs.writeFileSync(filePath, updated_content, 'utf8');
  updated++;
}

console.log(`✓ readingTime 補完完了: ${updated} 件更新, ${skipped} 件スキップ`);
