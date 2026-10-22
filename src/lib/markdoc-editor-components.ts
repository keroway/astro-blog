// Sveltia CMS の CMS.registerEditorComponent() に渡す callout / link-card の
// パース (fromBlock) ・シリアライズ (toBlock) ・プレビュー (toPreview) ロジック。
// markdoc.config.mjs のタグ定義 (Callout.astro / LinkCard.astro) と対応させる。
//
// Sveltia CMS の実行時 (@sveltia/cms) からのみ import され、pattern 側で
// 検出された Markdoc タグ構文の断片を編集可能なフィールドへ変換する。
// ここに切り出すのは、Sveltia のランタイムに依存せず vitest で純粋関数として
// 検証できるようにするため (#670)。

// Markdoc の属性文字列は `\"` `\\` `\n` `\r` `\t` を解釈する
// (@markdoc/markdoc の tag.pegjs ValueStringEscapes)。制御文字の生値は不可。
const ATTR_PATTERN = /(\w[\w-]*)="((?:\\.|[^"\\])*)"/g;

const UNESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t" };
const ESCAPES: Record<string, string> = { "\n": "n", "\r": "r", "\t": "t" };

function unescapeMarkdocString(value: string): string {
  return value.replace(/\\(.)/g, (_, c: string) => UNESCAPES[c] ?? c);
}

function escapeMarkdocString(value: string): string {
  return value.replace(/[\\"\n\r\t]/g, (c) =>
    c === "\\" || c === '"' ? `\\${c}` : `\\${ESCAPES[c]}`
  );
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(ATTR_PATTERN)) {
    attrs[m[1]] = unescapeMarkdocString(m[2]);
  }
  return attrs;
}

// HTML プレビュー (toPreview) 用。Markdoc ソースには使わない。
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- callout ----

export const CALLOUT_TYPES = ["info", "tip", "warning", "danger"] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export interface CalloutBlockData {
  type: CalloutType;
  title: string;
  body: string;
}

// タグ属性部分: 引用符付き文字列 (内部の % を許す) か、引用符・% 以外の 1 文字。
const ATTRS_SOURCE = String.raw`((?:"(?:\\.|[^"\\])*"|[^%"])*)`;

// {% callout type="tip" title="ヒント" %}\n本文\n{% /callout %}
export const CALLOUT_PATTERN = new RegExp(
  String.raw`^\{%\s*callout\b${ATTRS_SOURCE}%\}\n([\s\S]*?)\n\{%\s*\/callout\s*%\}$`
);

export function calloutFromBlock(match: RegExpMatchArray): CalloutBlockData {
  const [, attrsRaw = "", body = ""] = match;
  const attrs = parseAttrs(attrsRaw);
  const type = (CALLOUT_TYPES as readonly string[]).includes(attrs.type ?? "")
    ? (attrs.type as CalloutType)
    : "info";

  return { type, title: attrs.title ?? "", body };
}

export function calloutToBlock(data: Partial<CalloutBlockData>): string {
  const type = data.type ?? "info";
  const title = (data.title ?? "").trim();
  const body = data.body ?? "";
  const attrs = [`type="${type}"`];

  if (title) attrs.push(`title="${escapeMarkdocString(title)}"`);

  return `{% callout ${attrs.join(" ")} %}\n${body}\n{% /callout %}`;
}

export function calloutToPreview(data: Partial<CalloutBlockData>): string {
  const type = data.type ?? "info";
  const title = (data.title ?? "").trim();
  const body = data.body ?? "";
  const titleHtml = title
    ? `<p class="kw-callout__title">${escapeHtml(title)}</p>`
    : "";

  return `<aside class="kw-callout kw-callout--${type}">${titleHtml}<div class="kw-callout__body">${escapeHtml(body)}</div></aside>`;
}

// ---- link-card ----

export interface LinkCardBlockData {
  href: string;
  title: string;
  description: string;
}

// {% link-card href="https://example.com" title="Example" description="desc" /%}
export const LINK_CARD_PATTERN = new RegExp(
  String.raw`^\{%\s*link-card\b${ATTRS_SOURCE}\/%\}$`
);

export function linkCardFromBlock(match: RegExpMatchArray): LinkCardBlockData {
  const [, attrsRaw = ""] = match;
  const attrs = parseAttrs(attrsRaw);

  return {
    href: attrs.href ?? "",
    title: attrs.title ?? "",
    description: attrs.description ?? "",
  };
}

export function linkCardToBlock(data: Partial<LinkCardBlockData>): string {
  const href = (data.href ?? "").trim();
  const title = (data.title ?? "").trim();
  const description = (data.description ?? "").trim();
  const attrs = [
    `href="${escapeMarkdocString(href)}"`,
    `title="${escapeMarkdocString(title)}"`,
  ];

  if (description)
    attrs.push(`description="${escapeMarkdocString(description)}"`);

  return `{% link-card ${attrs.join(" ")} /%}`;
}

export function linkCardToPreview(data: Partial<LinkCardBlockData>): string {
  const href = data.href ?? "";
  const title = data.title ?? "";
  const description = (data.description ?? "").trim();
  const descHtml = description
    ? `<span class="kw-link-card__desc">${escapeHtml(description)}</span>`
    : "";

  return `<a class="kw-link-card" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="kw-link-card__title">${escapeHtml(title)}</span>${descHtml}</a>`;
}
