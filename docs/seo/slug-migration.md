# 日本語スラッグ ASCII 化方針

## 結論

**日本語スラッグを保持する（ASCII 化はしない）**

Issue #31 の調査を経て、現行の日本語スラッグ（パーセントエンコード URL）をそのまま維持する方針を決定した。

---

## 背景

本サイト（keroway.com）のブログ記事は、ファイル名そのものがスラッグとなる Astro Content Layer API の仕様に基づいている。記事ファイルが日本語ファイル名（例: `クラウドコストの最適化.md`）を持つため、生成される URL も日本語をパーセントエンコードした形式になる（例: `/blog/%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89.../`）。

ASCII 化とは、これらのスラッグを `/blog/cloud-cost-optimization/` のようなラテン文字のみの URL に変更する作業を指す。

---

## 評価した選択肢

| 選択肢 | 概要 | 評価 |
|--------|------|------|
| **A: 日本語スラッグ保持（採用）** | 現行 URL を維持し、エンコード処理を継続する | SEO リスク最小・実装コスト不要 |
| B: ASCII スラッグへ移行 | 全記事ファイルをリネームし、301 リダイレクトを設定する | コスト高・インデックス引き継ぎリスクあり |

---

## 判断根拠

### 1. SEO への影響

- Google は RFC 3986 に準拠したパーセントエンコード済み URL を正しく認識・インデックスする。日本語 URL が SEO 上の不利になることはない。
- Search Console で `keroway.com` のブログ記事 URL がすでにインデックス済みであれば、現行 URL のまま維持する方がページランクの継続性を保てる。
- ASCII 化した場合、旧 URL から新 URL への 301 リダイレクトが必要になる。301 は PageRank を引き継ぐが、クロール・再評価のタイムラグ（数週間〜数ヶ月）が発生し、一時的な順位変動リスクがある。

### 2. 既存被リンク・インデックスの保全

- `docs/seo/url-migration.md`（PR #105/#106 対応）の確認結果として、全ブログ記事 URL（50 件以上）が HTTP 200 を返すことが Playwright テストで確認済みであり、リダイレクト不要と判定されている。
- はてなブックマーク・Qiita/Zenn クロスポスト・Twitter/X 等からの被リンクは現行 URL を参照している可能性が高い。ASCII 化によって旧 URL が消滅すると、リダイレクト設定漏れが致命傷になる。
- 被リンク URL をすべて洗い出して移行する労力と比較して、保持のメリットが大きい。

### 3. エンコード処理の確立

日本語スラッグを扱うためのエンコードパターンはすでに `CLAUDE.md`（「Critical: Japanese Slug Encoding Pattern」セクション）に文書化・実装済みである。

- `getStaticPaths()` のパラメータ: エンコード不要（Astro が内部処理）
- `href` 属性: `encodeURIComponent` でエンコード必須
- RSS フィード・サイトマップ: 同様にエンコード済み URL を使用

このパターンは PR #105/#106 の時点で本番稼働しており、追加の技術的負債は存在しない。

### 4. ASCII 化のコスト

ASCII 化を実施した場合に必要な作業：

1. 全記事ファイルのリネーム（50 件以上）
2. `vercel.json` に 301 リダイレクトルールを追加（記事数分 × パターン）
3. 内部リンクの更新
4. Playwright URL チェックテストの更新
5. Search Console への変更通知・サイトマップ再送信
6. 1〜2 ヶ月間の順位変動モニタリング

これらは機能的な改善を一切伴わない純粋なコストであり、現時点でのリターンが見込めない。

---

## 決定事項

| 項目 | 内容 |
|------|------|
| 方針 | 日本語スラッグ保持 |
| ASCII 化 | 実施しない |
| リダイレクト整備（Issue #20 連動） | 不要（リダイレクト対象 URL なし、`docs/seo/url-migration.md` 参照） |
| 再評価タイミング | 記事数が大幅増加、または Google の URL 正規化ポリシー変更があった場合 |

---

## 将来 ASCII 化を行う場合の手順メモ（オプション）

保持方針の変更が生じた場合に備え、移行手順の概要を記録する。

### 前提

- 全記事ファイル名の ASCII スラッグ対応表を作成する（例: `クラウドコスト最適化.md` → `cloud-cost-optimization`）
- [slugify](https://github.com/simov/slugify) 等のライブラリを使用する場合は日本語の翻字ルールを事前に決定する（ローマ字変換 vs 英訳）

### 移行スクリプトの段取り

1. **スラッグ対応表の生成**

   ```bash
   # 記事ファイル一覧を取得し、手動で ASCII スラッグ対応表 (CSV) を作成する
   find src/content/blog -name "*.md" -o -name "*.mdx" | sort
   ```

2. **ファイルリネーム**

   ```bash
   # 対応表を読み込んでリネームするスクリプト（例）
   # scripts/rename-slugs.ts として実装し、pnpm tsx scripts/rename-slugs.ts で実行
   ```

3. **`vercel.json` に 301 リダイレクトを追加**

   日本語スラッグの URL は `source` にパーセントエンコード済み文字列を記載すること（`docs/seo/url-migration.md` の注意事項参照）。

   ```json
   {
     "redirects": [
       {
         "source": "/blog/%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89.../",
         "destination": "/blog/cloud-cost-optimization/",
         "permanent": true
       }
     ]
   }
   ```

4. **内部リンク・RSS フィード・サイトマップの確認**

   `pnpm run build` でビルドエラーがないことを確認し、Playwright テストを実行する。

5. **Search Console への通知**

   `docs/seo/url-migration.md` の「Search Console での URL 変更通知手順」を参照。

---

## 関連ドキュメント

- `CLAUDE.md` — Critical: Japanese Slug Encoding Pattern（実装パターン詳細）
- `docs/seo/url-migration.md` — URL マイグレーション記録・リダイレクト不要判定（PR #105/#106）
- Issue #20 — 旧 URL 維持とリダイレクト整備
- Issue #31 — 日本語スラッグ ASCII 化方針の策定（本 Issue）
- Issue #68 — vercel.json redirects 整備と Search Console 対応

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-05-14 | 初版作成（Issue #93 対応）、日本語スラッグ保持方針を決定 |
