# 実装方針 (strict)

CLAUDE.md / AGENTS.md の補完。一般論ではなく**このプロジェクトで実際に踏んだ罠**を反映した、強制力のあるルール群。

---

## A. 着手前

A1. **Issue を確認する。** 着手前に必ず `gh issue view <番号>` で assignees と関連 PR を見る。重複対応を防ぐためのもの。assignee を自分にし、`in-progress` ラベルを付けてからブランチを切る。

A2. **ブランチ名は `<type>/issue-<番号>-<短い要約>`。** type は `feat | fix | chore | docs | refactor` のいずれか。例: `feat/issue-98-media-storage-maintain`。

A3. **ライブラリ/フレームワーク/CLI の挙動を確認するときは ctx7 を引く。** Astro / pnpm / Vercel / Biome / GitHub Actions などはバージョン依存が激しい。訓練データの記憶で書かない。`npx ctx7@latest library <name> "<質問>"` → `npx ctx7@latest docs <libraryId> "<質問>"` の 2 ステップを必ず通す。

A4. **過去の判断 (ADR) を確認する。** `docs/adr/` を grep して関連 ADR を読む。逆らうなら新しい ADR を起票する提案を先に出す。

---

## B. スコープと PR 分割

B1. **1 PR = 1 関心事。** リファクタ・依存更新・型整備・テスト追加はそれぞれ別 PR。「ついで」で混ぜない。レビューの単位が壊れる。

B2. **コードを書いている最中に「あ、ここも直したい」と思ったら、Issue を切る。** その場で直さない。Issue 番号をコミットメッセージに残す。

B3. **PR は 400 行差分を超えそうなら分割を検討する。** 機能を縦に切れるか (例: バックエンド追加 → フロント表示 → 整形) を必ず一度考える。

B4. **「念のため」のコードを書かない。** 起きない分岐の防御、使われない引数、将来のためのフラグはすべて削る。コード量と認知負荷が増えるだけ。

---

## C. Astro 7 固有の罠

C1. **`getStaticPaths()` の `params` には `post.id` をエンコードせずに渡す。** Astro 7 の Content Layer API は内部でエンコードする。エンコードすると二重デコードで 404。

C2. **`href` 属性に出すスラグだけ `encodeURIComponent` する。** 日本語スラグは HTML 上ではパーセントエンコードが必要。実装パターンは CLAUDE.md の "Critical: Japanese Slug Encoding Pattern" を参照する。

C3. **画像は `astro:assets` の `Image` コンポーネント + `width` / `height` 明示。** 直 `<img>` 禁止。ヒーロー画像のサイズは `1020x510` (16:9) を基準にする。

C4. **frontmatter は `src/content.config.ts` のスキーマと一致させる。** 新フィールドはスキーマ更新が先。スキーマ違反は `pnpm run build` で必ず落ちるので、PR 前に build を通す。

C5. **Node は v22.12.0 以上 (Astro 7 の要件)。運用は 24 にピン。** keroway ワークスペース標準として `mise.toml` で node 24 / pnpm 11 をピンし、CI (`actions/setup-node` の `node-version: "24"`) も揃える。CI / Vercel / ローカルすべてここに揃える。

C6. **CI と Vercel の整合は「ツール経路一致」ではなく「バージョン pin 一致」で取る。**
   - CI (`.github/workflows/ci.yml`) は `pnpm/action-setup` を使う (pnpm 公式推奨)。
   - Vercel (`vercel.json`) は意図的に corepack 経路 (`corepack pnpm install` / `corepack pnpm run build`)。
   - 両者は `package.json` の `packageManager: pnpm@<version>` で同じ pnpm バージョンを取得する。**経路を無理に揃える変更を提案しない。** 過去 PR #44 で揃えようとして corepack 署名検証エラーに当たった経緯あり。

C7. **`astro dev` は AI エージェント検出時に自動で background 化する (Astro 7)。** Playwright の webServer が「早期終了」と誤認して落ちるため、エージェントセッションからの E2E は `ASTRO_DEV_BACKGROUND=0` を付けて実行する。残留デーモンは `pnpm exec astro dev status` / `astro dev stop` で扱う。

---

## D. スタイリング

D1. **新しい CSS フレームワーク / CSS-in-JS を導入しない。** UnoCSS + 純 CSS (コンポーネントスコープ) が現状の答え。導入提案は ADR 必須。

D2. **色・余白・角丸は `src/styles/tokens.css` の `--kw-*` デザイントークンを使う。** 新トークンを増やすときは既存の命名規則 (`--kw-accent`, `--kw-bg`, `--kw-fg` など `docs/design-system.md` §4-5 参照) に揃える。ベース要素スタイルは `global.css`。

D3. **フォントサイズはピクセル直指定でなく `clamp()`。** 流体タイポが既存パターン。

D4. **`prefers-reduced-motion: reduce` を尊重する。** モーションを足すときは必ずメディアクエリでオフにできる経路を用意する。

D5. **3 ブレークポイント (900px / 720px / 640px) で必ず確認する。** スクリーンショット (Playwright MCP) で Before/After を出す習慣。

---

## E. 検証順序 (PR 前の必須シーケンス)

E1. **`pnpm run lint`** — Biome lint + format check (= `biome ci`。CI の `lint` ジョブは加えて `pnpm run lint:alt` も走る)。差分が出ない状態にする。安全な自動修正だけ試したいときは `pnpm exec biome check --write .` を別途実行する (`--unsafe` は付けない)。
E2. **`pnpm run test:unit`** — vitest (CI の `unit` ジョブと一致)。
E3. **`pnpm exec astro check`** — typecheck (CI の `typecheck` ジョブと一致)。
E4. **`pnpm exec astro build`** — schema 違反と build 時エラーを surface (CI の `build` ジョブと一致、`pnpm run build` ではなく `astro build` 直叩き)。
E5. **`ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e`** — E2E (CI の `test` ジョブ相当、`CRON_SECRET` を CI と同値でセット)。デフォルトポートは 4335。競合のときは `PLAYWRIGHT_PORT` で明示。
E6. **目視確認** — 1280 / 768 / 375 の 3 解像度で実画面を確認。

`/ship-check` で E1〜E5 を順に走らせられる (CI の Lighthouse / Link check はローカル対象外)。**スキップ厳禁。**

---

## F. CI とデプロイ

F1. **CI を緑にしてからレビュー依頼。** 赤いまま review request しない。

F2. **CI の検査内容を骨抜きにする変更を入れない。** テストの `.skip`、lint ルールの個別 disable、検査ジョブの削除、`exclude` パターンで網を広げる、などは禁止。例外を出すときは ADR / Issue に残す。

   **これは「検査の skip 禁止」であって「ジョブ分割禁止」ではない。** 現状の CI は意図的に `typecheck` ジョブ (`astro check`) と `build` ジョブ (`astro build` 直叩き) を並列化している。`pnpm run build` (= `astro check && astro build`) を build ジョブで使わないのは設計判断 — ci.yml 冒頭コメントを参照。同等の検査が別ジョブで担保されていれば分離はむしろ推奨。

F3. **`vercel.json` の build / install コマンドを変更したら Vercel 上で deploy preview が緑であることを必ず確認する。** ローカル build が通っても Vercel ランナーで落ちることがある。

F4. **失敗した CI は `/fix-ci <PR番号>` で当たる。** PR 番号は明示的に渡す (誤爆防止)。

---

## G. コミット & PR メッセージ

G1. **サブジェクトは 50 文字以内、imperative。** 日本語可。例: `記事を追加` / `fix(ci): Biome lint の no-unused-imports に対応`。

G2. **PR description は要約 + 検証手順 + スクリーンショット (ビジュアル変更時)。** テンプレは AGENTS.md に従う。

G3. **`Co-Authored-By: Claude` 行は Claude が書いたコミットで必ず付与する。** 著者性の可視化。

---

## H. やってはいけないことの集約

- `--no-verify` で hook をスキップする
- `git push --force` を main に向ける
- 関係ない依存更新を機能 PR に混ぜる
- 「動いたっぽい」で build / lint / test のいずれかをスキップする
- `docs/adr/` の既存判断に逆らう変更を ADR なしで入れる
- 訓練データの記憶で API バージョン依存の話をする (= ctx7 を引かない)
