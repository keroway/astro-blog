import { collection, config, fields } from "@keystatic/core";
import { createElement } from "react";

// このファイルは Keystatic Admin UI の hydration でブラウザにもバンドルされる。
// `process.env` を直接参照するとブラウザで `ReferenceError: process is not defined`
// になるため、Vite が両環境で展開する `import.meta.env.PUBLIC_*` を使う。
// storage 種別 ("local" / "github") は Admin UI の挙動から観測可能なので秘匿不要。
//
// 必須変数 (本番):
//   PUBLIC_KEYSTATIC_STORAGE_KIND=github
//   KEYSTATIC_GITHUB_CLIENT_ID / KEYSTATIC_GITHUB_CLIENT_SECRET / KEYSTATIC_SECRET
//   PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
// 本番フェイルファストは astro.config.mjs (サーバー専用) 側で担保する。
// セットアップ手順は docs/cms-flow.md を参照。
// Keystatic admin UI ブランドマーク。colorScheme に応じて navy / paper-white で反転。
// CSS 変数は Keystatic admin DOM では利用できないため design-system.md の実値を直参照。
function KeroMark({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const bg = colorScheme === "dark" ? "#9CB4DA" : "#003366";
  const fg = colorScheme === "dark" ? "#0B1B33" : "#F3F1EC";
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: 24,
      height: 24,
      "aria-hidden": true,
    },
    createElement("rect", { width: 24, height: 24, rx: 5, fill: bg }),
    createElement(
      "text",
      {
        x: 12,
        y: 12,
        dominantBaseline: "central",
        textAnchor: "middle",
        fontFamily: "Georgia, serif",
        fontSize: 15,
        fontWeight: 700,
        fill: fg,
      },
      "K"
    )
  );
}

const storage =
  import.meta.env.PUBLIC_KEYSTATIC_STORAGE_KIND === "github"
    ? ({
        kind: "github",
        repo: { owner: "keroway", name: "astro-blog" },
        branchPrefix: "keystatic/",
      } as const)
    : ({ kind: "local" } as const);

export default config({
  storage,

  ui: {
    brand: {
      name: "keroway",
      mark: KeroMark,
    },
    navigation: {
      ブログ記事: ["blog"],
      Works: ["works"],
    },
  },

  collections: {
    blog: collection({
      label: "ブログ記事",
      slugField: "title",
      path: "src/content/blog/*",
      columns: ["title", "pubDate", "category", "draft"],
      // works と同様に本文を content フィールド (markdoc → .mdoc) に束ねる。
      // Keystatic は collection 単位で format を決めるため全エントリを .mdoc に揃える。詳細は ADR 0009。
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "タイトル" } }),
        description: fields.text({
          label: "概要（必須）",
          multiline: true,
          description:
            "カード・SNS シェア・SEO に使われる要約文。1〜2 文程度が目安。",
        }),
        pubDate: fields.date({
          label: "公開日（必須）",
          description: "記事一覧の並び順と表示日付に使用されます。",
        }),
        updatedDate: fields.date({
          label: "更新日（任意）",
          description: "内容を大きく更新した場合のみ設定してください。",
          validation: { isRequired: false },
        }),
        heroImage: fields.image({
          label: "ヒーロー画像（任意）",
          description: "カードサムネイルに使用。16:9 の画像を推奨します。",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: false },
        }),
        category: fields.text({
          label: "カテゴリ（任意）",
          description: "例: Cloud & DevOps / AI / 日記",
          validation: { isRequired: false },
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧（任意）",
          description: "検索・フィルターに使うキーワードを追加してください。",
          itemLabel: (props) => props.value || "タグ",
        }),
        draft: fields.checkbox({
          label: "下書き",
          description: "チェック時は本番公開されません。",
          defaultValue: false,
        }),
        ogImage: fields.text({
          label: "OG 画像 URL（任意）",
          description:
            "SNS シェア時のサムネイル URL。省略時は heroImage が使用されます。",
          validation: { isRequired: false },
        }),
        author: fields.text({
          label: "著者（任意）",
          description: "省略時はサイトデフォルトの著者名が使用されます。",
          validation: { isRequired: false },
        }),
        canonicalUrl: fields.text({
          label: "Canonical URL（任意）",
          description: "外部掲載など正規 URL が別にある場合のみ設定します。",
          validation: { isRequired: false },
        }),
        readingTime: fields.number({
          label: "読了時間（分）（任意）",
          description: "記事の推定読了時間。自動計算されない場合に手動設定。",
          validation: { isRequired: false, min: 0 },
        }),
        content: fields.markdoc({ label: "本文" }),
      },
    }),

    works: collection({
      label: "Works",
      slugField: "title",
      path: "src/content/works/*",
      columns: ["title", "status", "featured"],
      // 本文を content フィールド (markdoc → .mdoc) に束ねる。Keystatic は collection 単位で
      // format を決めるため、works の全エントリを .mdoc に揃える。blog は別途 #218 で移行。詳細は ADR 0009。
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "プロジェクト名" } }),
        description: fields.text({
          label: "概要（必須）",
          multiline: true,
          description:
            "プロジェクト一覧・SNS シェア・SEO に使われる要約文。1〜2 文程度が目安。",
        }),
        status: fields.select({
          label: "ステータス（必須）",
          description:
            "active = 積極メンテ中 / wip = 開発中 / archived = 保管済み",
          options: [
            { label: "アクティブ (active)", value: "active" },
            { label: "アーカイブ (archived)", value: "archived" },
            { label: "作業中 (wip)", value: "wip" },
          ],
          defaultValue: "active",
        }),
        repoUrl: fields.text({
          label: "リポジトリ URL（任意）",
          description: "GitHub など実装の主参照リポジトリ URL。",
          validation: { isRequired: false },
        }),
        lpUrl: fields.text({
          label: "ランディングページ URL（必須）",
          description: "機能紹介・外部紹介ページなどの URL。",
        }),
        demoUrl: fields.text({
          label: "デモ URL（任意）",
          description: "動作するデモが公開されている場合のみ設定します。",
          validation: { isRequired: false },
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧（必須）",
          description:
            "技術スタック・カテゴリなどのキーワードを追加してください。",
          itemLabel: (props) => props.value || "タグ",
        }),
        createdAt: fields.date({
          label: "作成日（必須）",
          description: "プロジェクトを開始した日付。",
        }),
        updatedAt: fields.date({
          label: "更新日（任意）",
          description: "内容を大きく更新した場合のみ設定してください。",
          validation: { isRequired: false },
        }),
        heroImage: fields.image({
          label: "ヒーロー画像（任意）",
          description:
            "プロジェクトカードのサムネイル。16:9 の画像を推奨します。",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: false },
        }),
        featured: fields.checkbox({
          label: "注目プロジェクト",
          description:
            "チェック時はトップページの注目プロジェクトセクションに表示されます。",
          defaultValue: false,
        }),
        content: fields.markdoc({ label: "本文" }),
      },
    }),
  },
});
