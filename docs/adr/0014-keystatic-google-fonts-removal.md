# 0014 — Keystatic 管理 UI の Google Fonts 参照を `pnpm patch` で除去する

- **ステータス**: Accepted
- **決定日**: 2026-06-21
- **決定者**: @keroway
- **関連 Issue**: [#327 Keystatic 管理 UI が Google Fonts (Inter) を読み込む参照を除去する](https://github.com/keroway/astro-blog/issues/327) / [#342 Keystatic の Google Fonts 除去手段を ADR で確定する](https://github.com/keroway/astro-blog/issues/342)
- **関連 PR**: 後続の #343 (実装) で参照する

---

## コンテキスト

[ADR 0013](./0013-web-fonts-self-hosting.md) でコンテンツページ (`/`・`/blog/`・`/about`・`/works/`) の Web フォント自己ホスト化を完了したが、`/keystatic` 管理画面のみ Inter を Google Fonts から読み込む既知の限界が残った。

`@keystatic/core@0.5.50` の `dist/keystatic-core-ui.js` に、管理 UI のルート要素として次の React 要素がハードコードされている (該当箇所は 1 箇所のみ):

```js
jsx("link", {
  href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  rel: "stylesheet",
});
```

確定している制約:

- この参照は `keystatic.config.ts` などプロジェクト設定では制御できない (パッケージ内部にバンドル済み)。
- npm 最新版 = 導入版 (`0.5.50`) のため、バージョンアップによる upstream 修正の取り込みはできない。
- 注入されるのは `<link rel="stylesheet">` であり、CSP では **`font-src` ではなく `style-src`** が支配する。`fonts.gstatic.com` (実フォントファイル) への参照は dist 内に存在せず、`fonts.googleapis.com` の CSS 1 リクエストのみが発生源。
- `vercel.json` には全ページ適用の `Content-Security-Policy-Report-Only` (`style-src 'self' 'unsafe-inline'` / `font-src 'self'`) が既に存在するが、Report-Only のためリクエストはブロックされない。

流動的な点:

- upstream (`@keystatic/core`) が self-host 対応を入れる時期は不明。
- CSP を enforce 昇格した場合のサイト全体 (コンテンツページの inline style、Keystatic 管理 UI 自身の inline style、Vercel Analytics) への波及は未検証。

---

## 決定事項

**`pnpm patch @keystatic/core` で `keystatic-core-ui.js` の Google Fonts `<link>` 注入を除去し、フォントを system フォールバックに委ねる。** パッチは lockfile に固定し、Keystatic 更新ごとに再検証する。

*Rationale:* 注入箇所が単一かつ境界の明確な React 要素 (`jsx("link", { href, rel })`) であり、`pnpm patch` で href を除去 (または要素自体を削除) する変更は外科的で副作用が局所に閉じる。これに対し CSP enforce 昇格 (候補 A) はサイト全体の inline style / script / Vercel Analytics への波及検証が必要で、リスクと検証コストが除去対象 (フォント 1 リクエスト) に見合わない。管理 UI の表示は Inter が system sans-serif フォールバックに変わるだけで操作性に影響しない。

---

## 却下した候補

### 候補 A: 既存 CSP-Report-Only を全ページ enforce へ昇格する

**却下理由:** `style-src 'self' 'unsafe-inline'` を enforce にすれば Google Fonts の `<link>` 読み込み自体はブロックできるが、影響範囲が `/keystatic` に限定されず全ページに及ぶ。

- Keystatic 管理 UI 自身が大量の inline style / runtime injection (Emotion 系) を用いており、enforce 昇格で管理 UI が破綻するリスクがある。
- コンテンツページ・Vercel Analytics (`https://va.vercel-scripts.com`) の `script-src` / `connect-src` も同時に厳格化され、想定外の退行を招きうる。
- 除去したいのはフォント CSS 1 リクエストのみであり、サイト全体のセキュリティポリシー変更という大きな手段は釣り合わない。

CSP の enforce 昇格自体は将来的に価値があるが、本 issue (フォント参照除去) とはスコープを分離し、独立した検討事項とする。

### 候補 B: upstream (`@keystatic/core`) へ self-host 化を要望する

**却下理由:** feature request の採否・反映時期が upstream 依存で不確実であり、本サイトの受け入れ条件 (全ページで Google Fonts リクエストゼロ) を自分の制御下で達成できない。`pnpm patch` で即時解決したうえで、Revisit 条件として upstream 修正の取り込みを監視する方が確実。要望の起票自体は並行して行ってよい (補助的手段)。

---

## Revisit When

- `@keystatic/core` のマイナー / メジャーアップデートを取り込むとき (パッチが当たらなくなる / 注入箇所が変わる可能性があるため、`pnpm patch` の再検証が必須)。
- `@keystatic/core` upstream が Google Fonts 依存を廃止し self-host 対応したとき (パッチを撤去し標準挙動へ戻す)。
- サイト全体の CSP を Report-Only から enforce へ昇格する別 issue が立ったとき (本 ADR の候補 A を再評価し、パッチとの役割分担を整理する)。
