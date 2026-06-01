# 0010 — 既存 blog 52 記事の slug を ASCII 正規化し旧 URL を全件リダイレクトする

- **ステータス**: Accepted
- **決定日**: 2026-06-01
- **決定者**: @keroway
- **関連 Issue**: [#222 ADR 0010 を起票し slug 正規化規則と旧→新マッピングを確定する](https://github.com/keroway/astro-blog/issues/222) / 親 [#215](https://github.com/keroway/astro-blog/issues/215) / 前提調査 [#221](https://github.com/keroway/astro-blog/issues/221)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)（「既存 52 記事はパス・拡張子・frontmatter とも変更せず継続利用」を**本 ADR で改定**）, [0009 — 本文 content フィールドの format](./0009-content-authoring-format.md)（52 記事を `.mdoc` 化済み）
- **後続 Issue**: [#223 52記事を ASCII slug にリネームし旧URLリダイレクトを整備する](https://github.com/keroway/astro-blog/issues/223)（本 ADR の [マッピング TSV](./0010-slug-mapping.tsv) を機械消費）, [#224 リネーム後の Keystatic 動作と全経路を回帰検証する](https://github.com/keroway/astro-blog/issues/224)

---

## コンテキスト

blog 52 記事のファイル名には空白・半角/全角括弧・日本語・複数ドットが含まれる（例: `Apache Solr (1).mdoc`, `0.96インチ有機ELディスプレイ(SSD1306).mdoc`, `code.org.mdoc`）。本リポの blog は `keystatic.config.ts` で `path: "src/content/blog/*"` + `slugField: "title"`（`fields.slug`）の構造であり、**ファイル名 = slug = URL**。Keystatic の slugify は非 ASCII / 空白 / 記号を許容しないため、これらのファイルは Keystatic admin UI 上で一覧・編集が破綻する。

ADR 0002 line 60 は「既存 52 記事はパス・拡張子・frontmatter とも変更せず継続利用」を採用構成に挙げていた。しかし `.mdoc` 化（ADR 0009 / #219）で既に拡張子は変更済みであり、Keystatic で本文編集を行う（ADR 0002 の必須要件）には slug（= ファイル名 = URL）の正規化が避けられない。これは ADR 0002 の当該判断と矛盾するため、本 ADR で再評価する。

### 現状ファイル名の破綻パターン分類（#221 の調査前提を本 ADR で確定）

52 件を機械分類したところ、Keystatic slugify に不適合な要素を持つのは以下のパターン。52 件中 約40 件が 1 つ以上に該当する。

| パターン | 例 | 件数感 |
|----------|-----|--------|
| 半角空白 | `Apache Solr (1)`, `Mastodon on Docker` | 多数 |
| 半角括弧 `()` | `BeautifulSoup4(1)`, `cloud9 (php)`, `nerodia(1)` | 多数 |
| 全角括弧 `（）` | `技術系電子書籍（国内）` | 1 |
| 日本語（かな/漢字/全角） | `RaspberryPi3 セットアップ`, `買い物と半田付け` | 多数 |
| 全角隅付き括弧 `【】` | `【読書】…` 系 | 6 |
| 複数ドット | `code.org`, `repl.it`, `HackMd.io`, `scratch3.0`, `0.96…` | 5 |
| アンダースコア | `Arduino_rgb_led`, `unity_sample` | 2 |

ASCII 英数のみで構成され正規化不要なのは `clojure` / `go` / `nginx` / `python-docx` 等の少数。

## 決定事項

**52 記事すべてを ASCII slug に正規化（git rename）し、旧 URL → 新 URL を全件 308 リダイレクトする。** 方針（全件 ASCII 化 + 全件恒久リダイレクト）はオーナー決定済み。本 ADR は (1) slug 命名規則、(2) 旧→新 52 件マッピング、(3) リダイレクト方式 を確定する。実装（rename + redirect）は #223 で原子的に行う。

### 1. ASCII slug 命名規則

1. **文字種**: `[a-z0-9-]` のみ。区切りはハイフン `-`。先頭・末尾のハイフンは付けない。連続区切りは単一 `-` に畳む。
2. **英字主体タイトル**: 既存の英単語をそのまま小文字化。空白 / アンダースコア / ドットは `-` に置換（`Arduino_rgb_led` → `arduino-rgb-led`, `code.org` → `code-org`, `repl.it` → `repl-it`）。
3. **日本語主体タイトル**: 音写ではなく**意味ベースで英語化**する。固有名詞は一般的な英語表記を使う（`買い物と半田付け` → `shopping-and-soldering`, `レーザー測距モジュール` → `laser-distance-module`）。
4. **書評記事の接頭辞**: `【読書】` で始まる 6 件は `book-` プレフィックスに正規化する（`【読書】Expert Angular` → `book-expert-angular`）。
5. **括弧連番の曖昧化**: `(1) (2) (3)` 等の連番は末尾サフィックス `-1` `-2` `-3` に移す（`nerodia(1)` → `nerodia-1`）。括弧内の補足語（`(php)`, `(半田付け)`, `(Event参加)`）は曖昧性解消に必要な範囲で英語化して連結する。
6. **型番・バージョン識別子の温存**: `SSD1306` / `VL53L0X` / `wroom02` 等は小文字 ASCII で保持し識別性を残す。
7. **衝突解決**: 同名化する 2 件は補足語で区別する（`Raspberry Pi(Event)` → `raspberry-pi-event` / `Raspberry Pi(Event参加)` → `raspberry-pi-event-attend`）。

### 2. 旧→新マッピング（52 件）

機械消費用の正本は [`0010-slug-mapping.tsv`](./0010-slug-mapping.tsv)（`old_id<TAB>new_slug`）。#223 がこの TSV を読み、git rename とリダイレクト生成の両方に使う。**下表はレビュー用ミラーであり、TSV と一致させること。**

| # | 旧 `post.id`（現ファイル名・拡張子除く） | 新 slug |
|---|---|---|
| 1 | `0.96インチ有機ELディスプレイ(SSD1306)` | `oled-display-ssd1306` |
| 2 | `Apache Solr (1)` | `apache-solr-1` |
| 3 | `Arduino_rgb_led` | `arduino-rgb-led` |
| 4 | `BeautifulSoup4(1)` | `beautifulsoup4-1` |
| 5 | `BeautifulSoup4(2)` | `beautifulsoup4-2` |
| 6 | `clojure` | `clojure` |
| 7 | `cloud9 (php)` | `cloud9-php` |
| 8 | `code.org` | `code-org` |
| 9 | `Dwitter` | `dwitter` |
| 10 | `Elixir` | `elixir` |
| 11 | `ESP-WROOM02 DIP化キット(半田付け)` | `esp-wroom02-dip-kit-soldering` |
| 12 | `GAE sendmail test` | `gae-sendmail-test` |
| 13 | `Getting started with Python Web Scraping` | `getting-started-with-python-web-scraping` |
| 14 | `go` | `go` |
| 15 | `GoogleCloudSourceRepositories` | `google-cloud-source-repositories` |
| 16 | `HackMd.io` | `hackmd-io` |
| 17 | `Kotlin` | `kotlin` |
| 18 | `Mac OS (High Sierra) で X11フォワーディング` | `macos-high-sierra-x11-forwarding` |
| 19 | `Maker Faire Tokyo` | `maker-faire-tokyo` |
| 20 | `Maker Faire Tokyo 2018(8_4-8_5)` | `maker-faire-tokyo-2018` |
| 21 | `Mastodon on Docker(2)` | `mastodon-on-docker-2` |
| 22 | `Mastodon on Docker` | `mastodon-on-docker` |
| 23 | `Mozilla SSL Configuration Generator` | `mozilla-ssl-configuration-generator` |
| 24 | `nerodia(1)` | `nerodia-1` |
| 25 | `nerodia(2)` | `nerodia-2` |
| 26 | `nerodia(3)` | `nerodia-3` |
| 27 | `nginx` | `nginx` |
| 28 | `PICO(Arduino互換ボード)` | `pico-arduino-compatible-board` |
| 29 | `python-docx` | `python-docx` |
| 30 | `Raspberry Pi(Event)` | `raspberry-pi-event` |
| 31 | `Raspberry Pi(Event参加)` | `raspberry-pi-event-attend` |
| 32 | `RaspberryPi3 セットアップ(2)` | `raspberrypi3-setup-2` |
| 33 | `RaspberryPi3 セットアップ` | `raspberrypi3-setup` |
| 34 | `repl.it` | `repl-it` |
| 35 | `rust(予告)` | `rust-preview` |
| 36 | `rust on Codeanywhere` | `rust-on-codeanywhere` |
| 37 | `scratch3.0` | `scratch3-0` |
| 38 | `StackEdit` | `stackedit` |
| 39 | `unity_sample` | `unity-sample` |
| 40 | `Unity chan` | `unity-chan` |
| 41 | `Xamarin(2)` | `xamarin-2` |
| 42 | `Xamarin` | `xamarin` |
| 43 | `【読書】100人のプロが選んだソフトウェア開発の名著` | `book-software-dev-masterpieces` |
| 44 | `【読書】Expert Angular` | `book-expert-angular` |
| 45 | `【読書】ソフトウェア・グローバリゼーション入門` | `book-software-globalization` |
| 46 | `【読書】プログラマの数学(第2版)` | `book-programmers-math-2nd-edition` |
| 47 | `【読書】プログラマーとお仕事をするということ` | `book-working-with-programmers` |
| 48 | `【読書】新装版 達人プログラマー` | `book-pragmatic-programmer` |
| 49 | `レーザー測距モジュール(VL53L0X)` | `laser-distance-module-vl53l0x` |
| 50 | `技術系電子書籍（国内）` | `tech-ebooks-domestic` |
| 51 | `買い物と半田付け` | `shopping-and-soldering` |
| 52 | `電子書籍` | `ebooks` |

全 52 件の新 slug は一意（衝突なし）で、`[a-z0-9-]` に準拠する。

### 3. リダイレクト方式: Astro `redirects` config（object 形式・`status: 308`）

**`astro.config.mjs` の `redirects` に object 形式 `{ status: 308, destination }` でエントリを定義し、`@astrojs/vercel` アダプタにサーバーレベルの実 308 リダイレクトを生成させる。** `vercel.json` への手書きは採らない。

選定理由:

- 本プロジェクトは `output: "static"` + `adapter: vercel()`。Astro 公式ドキュメントによれば、`redirects` の **object 形式でのカスタムステータスコードは「SSR または static adapter 使用時」に有効**で、アダプタがルーティング層（`.vercel/output/config.json`）に実リダイレクトを emit する。純静的（アダプタなし）だと `<meta http-equiv="refresh">` の擬似リダイレクトになり実ステータスコードを返せないが、本構成はアダプタありのため**実 308 が出る**。
- `astro.config.mjs` 側に集約することで、slug の正本（マッピング）と同一ビルドパイプライン内で型チェック・生成でき、`vercel.json` との二重管理・ドリフトを避けられる。`vercel.json` は install/build/crons の責務に保つ（ADR 0006 / implementation.md C6 の経路分離方針と整合）。
- **308（Permanent Redirect）**を採る。method を保持する恒久リダイレクトで、SEO のリンクエクイティ継承と既存被リンク保護の要件を満たす。301 でも GET のみの blog URL では実害ないが、Vercel の `permanent` 既定（308）と揃え、modern な恒久リダイレクトに統一する。

#### リダイレクト source の組み立て（#223 への申し送り）

旧 URL は `/blog/<encodeURIComponent(old_id)>/`（CLAUDE.md "Critical: Japanese Slug Encoding Pattern" のとおり `href` はパーセントエンコード）。`redirects` の source キーは old_id を URL エンコードしたパスで組み立てる。例:

```js
// astro.config.mjs（#223 で生成）
redirects: {
  "/blog/Apache%20Solr%20(1)/": { status: 308, destination: "/blog/apache-solr-1/" },
  "/blog/%E9%9B%BB%E5%AD%90%E6%9B%B8%E7%B1%8D/": { status: 308, destination: "/blog/ebooks/" },
  // …52 件
}
```

エンコード規則の取りこぼし（半角空白を `%20` とするか `+` とするか、括弧 `()` を素通しするか等）で source が実 URL と不一致になるとリダイレクトが効かない。#223 では `encodeURIComponent(old_id)` 由来の値で機械生成し、Vercel deploy preview で代表 URL を実機 308 確認すること（implementation.md F3 / #224）。

## 改定する既存判断（ADR 0002）

ADR 0002 line 60「既存 52 記事はパス・拡張子・frontmatter とも変更せず継続利用」を本 ADR で **Amended** する。

- **拡張子**: ADR 0009 / #219 で `.md` → `.mdoc` 済み（本 ADR 以前に改定済み）。
- **パス（= slug = URL）**: 本 ADR で ASCII 正規化に改定。旧 URL は 308 リダイレクトで継承する。
- **frontmatter**: 本 ADR では変更しない（0002 の判断を維持）。

ADR 0002 は Superseded ではなく Accepted のまま、当該行に本 ADR への参照注記を加える。

## 影響範囲

- `src/content/blog/` の 52 ファイル名（#223 で git rename）
- `src/pages/blog/[...slug].astro`（`params.slug` は**非エンコード**で渡す。新 slug は ASCII なので従来どおり）
- `src/pages/blog/index.astro` / `src/pages/index.astro` / `src/pages/rss.xml.js`（いずれも `encodeSlugId(post.id)`。新 slug が ASCII なら encode 後も同値）
- `src/lib/slug.ts`（`encodeSlugId` の挙動は不変。ASCII 入力では no-op 同然）
- `astro.config.mjs`（`redirects` 追加 = #223）
- `@astrojs/sitemap` 自動生成 sitemap（新 slug ベースに更新される）
- 外部被リンク・RSS 購読 URL（308 で継承）

本 ADR 自体はドキュメントのみで、コード・記事ファイルは変更しない（rename と redirects は #223）。

## 結果

- slug 命名規則・52 件マッピング・リダイレクト方式が確定し、#223 が判断を持ち越さず機械的に実装着手できる。
- マッピングは [TSV](./0010-slug-mapping.tsv) として機械消費可能な正本を持ち、本文表でレビュー可能。
- ADR 0002 との矛盾（パス不変方針）を本 ADR で明示的に改定し、判断の履歴を残す。
