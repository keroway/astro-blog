# 0021 — CSP の script-src から 'unsafe-inline' を外し、インラインスクリプトを外部化する

- **ステータス**: Accepted
- **決定日**: 2026-11-14
- **決定者**: @keroway
- **関連 Issue**: [#706 CSP の script-src 'unsafe-inline' を撤廃する](https://github.com/keroway/astro-blog/issues/706)（子: #819 / #820 / #821）
- **関連 ADR**: [0016 CMS を Keystatic から Sveltia へ](./0016-cms-keystatic-to-sveltia.md)（/admin のバンドル）

---

## コンテキスト

`vercel.json` の CSP は `script-src 'self' 'unsafe-inline'` で、インラインスクリプトの実行を許していた。`'unsafe-inline'` は XSS が起きたときの最後の防壁を外す設定で、`base-uri` / `object-src` / `form-action` も未指定だった（これらは `default-src` にフォールバックしない）。

`'unsafe-inline'` が必要だった理由は 2 系統ある。

1. **`is:inline` で書いたスクリプト**: FOUC ガード（テーマ・文字サイズ・モーション低減。`BaseHead.astro`）、朱印帳（`StampRally.astro`）、`/admin` の prefs 先読み（`admin.astro`）。
2. **Astro が HTML へインライン展開するバンドル済みスクリプト**: 小さい `<script>`（検索・共有・目次・コマンドパレットなど）は、`vite.build.assetsInlineLimit`（既定 4KB）未満だと `<script type="module">…</script>` として HTML に埋め込まれる。ビルド結果を集計して初めて分かった（全 105 ページ）。

当初案は Astro の CSP 機能（`experimental.csp`、Astro 6 で `security.csp` として安定化）によるハッシュ化だった。#819 の調査で次が分かり、そのままでは実装できなかった。

- `security.csp` は **`<ClientRouter />` と Shiki を非対応**と明記している。本サイトは両方を使っている。
- ハッシュは `<meta http-equiv>` としてページ単位で出力され、ClientRouter による遷移後は初回ドキュメントの CSP が維持される。遷移先ページ固有のスクリプトのハッシュが許可されない。
- `vercel.json` の静的ヘッダーとの積集合になり、ヘッダー側の設計も作り直しになる。

---

## 決定事項

**ClientRouter は維持し、インラインスクリプトを外部ファイルへ移して `script-src 'self'` にする。Astro の `security.csp`（ハッシュ化）は使わない。**

- FOUC ガードは `src/scripts/fouc-guard.js`、`/admin` の prefs 先読みは `src/scripts/admin-prefs-bootstrap.js` に切り出し、`?url` で受け取ったハッシュ付き URL を **同期 classic script**（`<script is:inline src>`、defer / async / module なし）で `<head>` から読む。描画前に実行される性質を保つため、module や defer にはしない。ハッシュ付きなので長期キャッシュできる。
- `StampRally.astro` は通常のバンドル対象（`src/scripts/stamp-rally.ts`）にする。
- Astro が小さいスクリプトを HTML に展開しないよう、`vite.build.assetsInlineLimit` を **JS だけ** `false` にする関数形式にする（それ以外は `undefined` = 既定の 4KB 判定）。`0` にすると CSS まで外部化されて `<link rel="stylesheet">` が増える（トップで 4→8 を実測）。
- `vercel.json` の CSP: `script-src 'self' 'inline-speculation-rules'`、`base-uri 'self'`、`object-src 'none'`、`form-action 'self'`。
  - `'inline-speculation-rules'` は `type="speculationrules"` のインラインブロック（#474 の prerender）だけを許可するキーワードで、実行可能な JavaScript は許可しない（[MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)）。
  - JSON-LD（`application/ld+json`）は実行されないデータブロックなので `script-src` の対象外。変更しない。
- **`style-src 'unsafe-inline'` は対象外で維持する。** Shiki のインライン style と Astro Fonts / コンポーネントスコープの `<style>` が必要。スクリプトより攻撃面が小さい。
- 回帰テスト（`tests/playwright/csp-config.spec.ts`）で次を固定する。`vercel.json` の `script-src` に `'unsafe-inline'` が無いこと、`base-uri` / `object-src` / `form-action` があること、**ビルド済み HTML に実行されるインラインスクリプトが無いこと**。dev サーバーは CSP ヘッダーを適用せず、dev ではインライン展開もされないため、ビルド済み HTML を直接検査しないと「CSP を締めたら本番だけ壊れる」ことに気付けない。

*Rationale:* ClientRouter（ビュー遷移）を捨てずに `'unsafe-inline'` を撤廃できる唯一の経路。ヘッダーは `vercel.json` に一本化したままで、ADR 0016 の「Astro のバージョンに依存しない /admin」も保てる。

---

## 却下した候補

### 候補 A: Astro の `security.csp`（ハッシュ化）

**却下理由:** ClientRouter と Shiki が非対応で、遷移後に遷移先のインラインスクリプトが許可されない。使うには ClientRouter を撤去して native View Transitions へ移行する必要があり、UX の変更が大きすぎる。

### 候補 B: ClientRouter を廃止して `security.csp` を使う

**却下理由:** 同上。CSP のためにサイト全体の遷移体験を変えるのは釣り合わない。

### 候補 C: 現状維持（`'unsafe-inline'` を許容して明記）

**却下理由:** 外部化のコストは小さい（スクリプト 3 本の移動とビルド設定 1 つ）と実測で分かった。`base-uri` / `object-src` / `form-action` の追加だけでも価値はあるが、`script-src` を締められるのに残す理由がない。

### 候補 D: nonce 方式

**却下理由:** 静的出力（`output: static`）のため、リクエストごとの nonce を発行できない。

---

## Revisit When

- Astro の `security.csp` が `<ClientRouter />` に対応したとき（ハッシュ化へ寄せると外部ファイルが不要になる）
- 新しい `is:inline` スクリプトや、Astro がインライン展開する小さい `<script>` を足して、回帰テスト（ビルド済み HTML の検査）が落ちたとき。まず外部化を検討し、`'unsafe-inline'` を戻さない
- `style-src` の `'unsafe-inline'` を外す必要が出たとき（Shiki のインライン style の扱いが論点）
