import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.resolve(import.meta.dirname, '../src/content/blog');
const OUTPUT_FILE = path.resolve(import.meta.dirname, '../docs/content-audit.md');

type Frontmatter = {
  title?: string;
  description?: string;
  pubDate?: string;
  category?: string;
  heroImage?: string;
  draft?: boolean;
  readingTime?: number;
  tags?: string[];
};

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const result: Frontmatter = {};
  for (const line of raw.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    const v = val.trim().replace(/^["']|["']$/g, '');
    if (key === 'draft') result.draft = v === 'true';
    else if (key === 'readingTime') result.readingTime = Number(v);
    else if (key === 'pubDate') result.pubDate = v;
    else if (key === 'title') result.title = v;
    else if (key === 'description') result.description = v;
    else if (key === 'category') result.category = v;
    else if (key === 'heroImage') result.heroImage = v;
  }
  // Handle tags array (multi-line YAML)
  const tagsMatch = raw.match(/^tags:\s*\[(.*?)\]/m);
  if (tagsMatch) {
    result.tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, ''));
  }
  return result;
}

function assess(fm: Frontmatter): string {
  if (fm.draft) return 'アーカイブ（draft）';
  const year = fm.pubDate ? Number(fm.pubDate.slice(0, 4)) : 0;
  const hasImage = Boolean(fm.heroImage);
  const hasDesc = Boolean(fm.description && fm.description.length > 0);
  if (year > 0 && year < 2020 && !hasImage && !hasDesc) return '更新必要';
  if (year > 0 && year < 2019) return '更新必要';
  return '公開維持';
}

const files = fs
  .readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .sort();

const rows: Array<{
  slug: string;
  title: string;
  pubDate: string;
  category: string;
  hasHero: string;
  assessment: string;
}> = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const fm = parseFrontmatter(content);
  const slug = file.replace(/\.(md|mdx)$/, '');
  rows.push({
    slug,
    title: fm.title ?? '（タイトル未設定）',
    pubDate: fm.pubDate ?? '不明',
    category: fm.category ?? '（未設定）',
    hasHero: fm.heroImage ? 'あり' : 'なし',
    assessment: assess(fm),
  });
}

const categories = [...new Set(rows.map((r) => r.category).filter((c) => c !== '（未設定）'))].sort();

const summary = {
  total: rows.length,
  公開維持: rows.filter((r) => r.assessment === '公開維持').length,
  更新必要: rows.filter((r) => r.assessment === '更新必要').length,
  アーカイブ: rows.filter((r) => r.assessment.startsWith('アーカイブ')).length,
};

const lines: string[] = [
  '# コンテンツ棚卸しレポート',
  '',
  `> 生成日時: ${new Date().toLocaleDateString('ja-JP')} / 記事数: ${summary.total}`,
  '',
  '## サマリー',
  '',
  `| 判定 | 件数 |`,
  `|------|------|`,
  `| 公開維持 | ${summary.公開維持} |`,
  `| 更新必要 | ${summary.更新必要} |`,
  `| アーカイブ | ${summary.アーカイブ} |`,
  `| 合計 | ${summary.total} |`,
  '',
  '## 正規カテゴリ集合',
  '',
  '記事で使われている category の一覧（#91 category 統一の基盤）:',
  '',
  '```',
  ...categories.map((c) => `- ${c}`),
  '```',
  '',
  '> **推奨正規カテゴリ**: `Arduino`, `BeautifulSoup`, `Clojure`, `Elixir`, `GAE`, `Go`, `High Sierra`, `Kotlin`, `Maker Faire Tokyo`, `Markdown`, `Mastodon`, `Mozilla`, `nginx`, `nerodia`, `PHP`, `Python`, `RaspberryPi`, `REPL`, `Rust`, `Scratch`, `Solr`, `StackEdit`, `unity`, `Xamarin`, `HumbleBundle`, `電子書籍`, `半田`, `読書`',
  '',
  '## 記事一覧',
  '',
  '| slug | タイトル | 公開日 | カテゴリ | ヒーロー画像 | 判定 |',
  '|------|---------|--------|---------|------------|------|',
  ...rows.map(
    (r) => `| ${r.slug} | ${r.title} | ${r.pubDate} | ${r.category} | ${r.hasHero} | ${r.assessment} |`,
  ),
];

fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');
console.log(`✓ ${OUTPUT_FILE} に ${rows.length} 件を出力しました`);
console.log(`  公開維持: ${summary.公開維持}, 更新必要: ${summary.更新必要}, アーカイブ: ${summary.アーカイブ}`);
