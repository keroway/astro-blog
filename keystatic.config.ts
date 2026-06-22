import { collection, config, fields } from "@keystatic/core";
import { block, wrapper } from "@keystatic/core/content-components";
import { createElement } from "react";

// content components (#365): blog/works 共通のカスタムコンポーネント定義。
// markdoc タグ名は markdoc.config.mjs の tags キーと一致させる。
const contentComponents = {
  callout: wrapper({
    label: "コールアウト",
    description: "注記・補足ボックス。type で色とアイコンを切り替えられます。",
    schema: {
      type: fields.select({
        label: "タイプ",
        options: [
          { label: "情報 (info)", value: "info" },
          { label: "ヒント (tip)", value: "tip" },
          { label: "注意 (warning)", value: "warning" },
          { label: "危険 (danger)", value: "danger" },
        ],
        defaultValue: "info",
      }),
      title: fields.text({
        label: "タイトル（任意）",
        validation: { isRequired: false },
      }),
    },
  }),
  "link-card": block({
    label: "リンクカード",
    description: "外部リンクをカード形式で表示します。",
    schema: {
      href: fields.url({
        label: "URL（必須）",
      }),
      title: fields.text({
        label: "タイトル（必須）",
      }),
      description: fields.text({
        label: "説明（任意）",
        multiline: false,
        validation: { isRequired: false },
      }),
    },
  }),
};

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
// light: 紺碧地(#003366) + 紙白文字(#F3F1EC) + 砂金アクセント帯(#D9B382)
// dark : 薄紺地(#9CB4DA) + 深紺文字(#0B1B33) + 砂金アクセント帯(#D9B382)
function KeroMark({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const bg = colorScheme === "dark" ? "#9CB4DA" : "#003366";
  const fg = colorScheme === "dark" ? "#0B1B33" : "#F3F1EC";
  const accent = "#D9B382"; // 砂金 — 両モード共通
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: 24,
      height: 24,
      "aria-hidden": true,
    },
    // 背景
    createElement("rect", { width: 24, height: 24, rx: 5, fill: bg }),
    // 砂金アクセント帯（下端）
    createElement("rect", {
      x: 0,
      y: 20,
      width: 24,
      height: 4,
      rx: 0,
      fill: accent,
      opacity: 0.85,
    }),
    // 角丸の下端を背景色でマスク（rounded cornerを維持するため）
    createElement("rect", {
      x: 0,
      y: 20,
      width: 24,
      height: 4,
      rx: 5,
      fill: accent,
      opacity: 0.85,
    }),
    // モノグラム「K」
    createElement(
      "text",
      {
        x: 12,
        y: 11,
        dominantBaseline: "central",
        textAnchor: "middle",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.02em",
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
      previewUrl: "/blog/{slug}/",
      // works と同様に本文を content フィールド (markdoc → .mdoc) に束ねる。
      // Keystatic は collection 単位で format を決めるため全エントリを .mdoc に揃える。詳細は ADR 0009。
      format: { contentField: "content" },
      schema: {
        title: fields.slug({
          name: { label: "タイトル" },
          slug: {
            label: "URL slug（英数・必須）",
            description:
              "公開 URL（/blog/<slug>/）になります。日本語は使わず英数とハイフンで入力してください。",
          },
        }),
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
        category: fields.select({
          label: "カテゴリ（大分類）",
          description:
            "記事の大分類。細かいトピックは tags で表現してください。",
          options: [
            { label: "開発・プログラミング", value: "dev" },
            { label: "ハードウェア・電子工作", value: "hardware" },
            { label: "ツール・インフラ", value: "tools" },
            { label: "読書", value: "reading" },
            { label: "イベント・参加記", value: "event" },
          ],
          defaultValue: "dev",
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧（任意）",
          description:
            "検索・関連記事判定に使うキーワード。既存タグの再利用を優先してください（docs/keystatic-authoring.md）。",
          itemLabel: (props) => props.value || "タグ",
        }),
        draft: fields.checkbox({
          label: "下書き",
          description: "チェック時は本番公開されません。",
          defaultValue: false,
        }),
        ogImage: fields.image({
          label: "OG 画像（任意）",
          description:
            "SNS シェア時のサムネイル。省略時はタイトルから自動生成されます（1200×630 推奨）。",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: false },
        }),
        author: fields.text({
          label: "著者（任意）",
          description: "省略時はサイトデフォルトの著者名が使用されます。",
          validation: { isRequired: false },
        }),
        canonicalUrl: fields.url({
          label: "Canonical URL（任意）",
          description: "外部掲載など正規 URL が別にある場合のみ設定します。",
          validation: { isRequired: false },
        }),
        content: fields.markdoc({
          label: "本文",
          components: contentComponents,
          options: {
            // 本文中に挿入する画像の保存先。heroImage と同じ規約に揃える (#356)。
            image: {
              directory: "public/images/blog",
              publicPath: "/images/blog/",
            },
          },
        }),
      },
    }),

    works: collection({
      label: "Works",
      slugField: "title",
      path: "src/content/works/*",
      columns: ["title", "status", "featured"],
      previewUrl: "/works/{slug}/",
      // 本文を content フィールド (markdoc → .mdoc) に束ねる。Keystatic は collection 単位で
      // format を決めるため、works の全エントリを .mdoc に揃える。blog は別途 #218 で移行。詳細は ADR 0009。
      format: { contentField: "content" },
      schema: {
        title: fields.slug({
          name: { label: "プロジェクト名" },
          slug: {
            label: "URL slug（英数・必須）",
            description:
              "公開 URL（/works/<slug>/）になります。日本語は使わず英数とハイフンで入力してください。",
          },
        }),
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
        repoUrl: fields.url({
          label: "リポジトリ URL（任意）",
          description: "GitHub など実装の主参照リポジトリ URL。",
          validation: { isRequired: false },
        }),
        lpUrl: fields.url({
          label: "ランディングページ URL（必須）",
          description: "機能紹介・外部紹介ページなどの URL。",
        }),
        demoUrl: fields.url({
          label: "デモ URL（任意）",
          description: "動作するデモが公開されている場合のみ設定します。",
          validation: { isRequired: false },
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧（必須）",
          description:
            "技術スタック・カテゴリなどのキーワード。既存タグの再利用を優先してください。",
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
          directory: "public/images/works",
          publicPath: "/images/works/",
          validation: { isRequired: false },
        }),
        featured: fields.checkbox({
          label: "注目プロジェクト",
          description:
            "チェック時はトップページの注目プロジェクトセクションに表示されます。",
          defaultValue: false,
        }),
        content: fields.markdoc({
          label: "本文",
          components: contentComponents,
          options: {
            // 本文中に挿入する画像の保存先。works 専用 dir に heroImage と揃える (#363)。
            image: {
              directory: "public/images/works",
              publicPath: "/images/works/",
            },
          },
        }),
      },
    }),
  },
});
