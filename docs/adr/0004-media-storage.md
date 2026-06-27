# 0004 — メディア管理: リポジトリ管理（`public/images/`）継続

- **ステータス**: Accepted（保存先の一部は #410 の決定で上書き予定 — 下記「2026-06-26 追記」参照）
- **決定日**: 2026-05-18
- **決定者**: @keroway
- **関連 Issue**: [#97 画像配信戦略の比較表を作成し ADR を起票する](https://github.com/keroway/astro-blog/issues/97), [#33 画像・メディアストレージ戦略の決定](https://github.com/keroway/astro-blog/issues/33)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)
- **後続 Issue**: [#98 既存 public/images/* の移行または維持を実行する](https://github.com/keroway/astro-blog/issues/98)

---

> **2026-06-26 追記（方針 update）**:
> 本 ADR の「`public/images/` に生ファイルをリポジトリ管理し `<img src>` で参照」という運用は、
> **[#410](https://github.com/keroway/astro-blog/issues/410)（astro:assets 本格移行）の決定で一部上書き**される。
> コンテンツ画像は `src/assets/` へ集約し `image()` ヘルパ + `<Image>`/`<Picture>` で配信し、
> CMS（Sveltia / ADR 0016）の `media_folder` も `src/assets` 系へ向ける。
> 本 ADR の「リポジトリ内保存・外部ストレージ不要」という根幹は維持（全体コスト・ベンダーロックイン回避）。
> 変わるのは**保存場所（`public/` → `src/assets/`）と参照方式（`<img>` → astro:assets）のみ**。
> 詳細・選定は #410 の新規 ADR で記録し、本 ADR はその時点で Superseded/改定とする。

## コンテキスト

keroway.com は Astro 6 + Vercel SSG で構築された個人ポートフォリオ兼テクニカルブログです。M5 マイルストーン「CMS 環境」において、Keystatic（ADR 0002）の導入に伴い画像・メディアの保存・配信戦略を明確にする必要があります。

### 現状

| 項目 | 状態 |
|------|------|
| 保存場所 | `public/images/blog/`（新規追加分）および `public/` 直下（旧来分） |
| ファイル数 | `public/images/blog/`: 41 ファイル、`public/` 直下: 17 ファイル |
| 合計サイズ | 約 7 MB（`public/images/blog/` のみ計測） |
| 配信方式 | Vercel CDN（静的ファイル配信） |
| 画像最適化 | `astro:assets` の `<Image>` コンポーネント（ビルド時変換） |
| CMS との連携 | Keystatic `heroImage` フィールドは URL / パスのテキスト入力で管理 |
| Keystatic ストレージ | `storage: { kind: "local" }` — ローカル Git リポジトリ保存モード |

記事内の画像は主に YouTube サムネイル URL（外部リンク）・`public/images/blog/{hash}.jpg`（ハッシュ命名）・`public/{shortcode}.png|jpg`（旧来の短縮命名）の3パターンを運用中です。全パスのファイルはリポジトリ内に存在することを確認済み。

### 要件

1. Keystatic から画像をアップロードし記事に埋め込めること
2. Vercel SSG（静的ビルド）で `astro:assets` によるビルド時最適化が継続できること
3. 外部ストレージ移行があるとすれば、Keystatic の `image` フィールド or カスタム画像ストレージと連携できること

---

## 決定事項

**リポジトリ管理（`public/images/blog/`）を継続する。** 外部ストレージへの移行は行わない。

採用構成:

- **保存先**: `public/images/blog/` （既存運用と同一）
- **Keystatic 連携**: `heroImage` フィールドは引き続きテキスト入力（URL / パス）で管理。Keystatic の `fields.image()` による自動 Git コミット方式の採用は将来評価
- **配信**: Vercel の静的ファイル CDN 配信を継続
- **最適化**: ビルド時 `astro:assets` による変換・最適化を維持
- **外部移行トリガー**: リポジトリ内画像が 100 MB を超えるか、外部 CMS 連携の必要が生じた場合に別 ADR で再評価

---

## 評価候補の比較

| 評価軸 | リポジトリ管理（採用） | Cloudflare R2 + Image Transformations | Vercel Blob | Cloudinary / ImageKit | GitHub LFS |
|--------|----------------------|---------------------------------------|------------|----------------------|-----------|
| **コスト** | ★★★ 無料（Git リポジトリ容量内） | ★★☆ R2: 10 GB / 月まで無料、Transformations は有料プランで変わる | ★★☆ 5 GB 無料、超過時 $0.023 / GB | ★☆☆ 無料枠 25 credits / 月（帯域制限あり）、超過時課金 | ★★☆ 1 GB 無料、追加 $5 / 50 GB |
| **配信パフォーマンス** | ★★☆ Vercel CDN（全世界エッジ）。ビルド時 `astro:assets` で WebP / AVIF 変換済 | ★★★ Cloudflare グローバル CDN + on-demand リサイズ | ★★★ Vercel Edge ネットワーク配信 | ★★★ 専用 CDN + on-demand リサイズ・変換 | ★☆☆ GitHub サーバーから直接配信。CDN 経由ではない |
| **動的リサイズ** | ★☆☆ 不可（ビルド時のみ `astro:assets` で変換） | ★★★ Image Transformations で width / format を URL パラメータ指定 | ★★☆ `/_vercel/image?url=...` で on-demand 変換（Vercel Adapter 必要） | ★★★ URL パラメータで動的変換（リサイズ・クロップ・フォーマット変換） | ★☆☆ 不可 |
| **CMS 連携容易性** | ★★★ Keystatic の `storage: local` と自然に統合。Git コミット = 画像追加 | ★★☆ Keystatic カスタム画像ストレージ（`S3Compatible`）で対応可能。R2 が S3 互換 | ★★☆ Keystatic カスタムストレージ実装が必要 | ★★☆ SDK / Cloudinary widget で連携可能だが別途実装 | ★☆☆ Keystatic からは扱いにくい |
| **実装コスト** | ★★★ 変更なし | ★☆☆ R2 バケット設定・Wrangler CLI・Keystatic カスタムストレージ実装 | ★☆☆ Vercel Blob SDK 導入・Keystatic カスタムストレージ実装 | ★☆☆ Cloudinary SDK 導入・Upload Preset 設定・Keystatic 連携 | ★★☆ LFS 設定・Git フックの変更 |
| **外部依存性** | ★★★ なし | ★☆☆ Cloudflare アカウント・課金設定 | ★☆☆ Vercel Blob API トークン（ホスティング固定化） | ★☆☆ 外部 SaaS（Cloudinary / ImageKit アカウント） | ★★☆ GitHub への依存（既存） |
| **個人ブログ規模への適合** | ★★★ 41 ファイル / 7 MB — 現状で問題なし | △ 現時点では過剰 | △ 現時点では過剰（SSR 不要の場合 on-demand 変換も不要） | △ 無料枠の制限に注意 | △ CDN 配信がないため採用するメリットが薄い |

---

## 採用理由（Why リポジトリ管理）

1. **現状規模で問題がない**: 41 ファイル / 7 MB はリポジトリ管理で完全に許容範囲。外部ストレージへの移行は Over-engineering になる
2. **Keystatic との自然な統合**: `storage: { kind: "local" }` モードで Keystatic が画像ファイルを Git リポジトリにコミットする設計が標準。追加設定不要
3. **`astro:assets` による最適化が有効**: SSG ビルド時に WebP / AVIF 変換・リサイズを適用でき、配信パフォーマンスも Vercel CDN で確保できる
4. **ゼロコスト**: 外部サービスのアカウント・課金設定・API トークン管理が不要
5. **外部依存の最小化**: SaaS や別クラウドへのロックインなしに SSG → 別ホスティング（Phase 3）への移行コストを低く抑えられる
6. **AI 補助執筆との相性**: Git 上で画像も Markdown も一元管理でき、Claude Code からの画像参照・追加が自然に行える

---

## 却下した候補

### Cloudflare R2 + Image Transformations

**却下理由**:

1. **現スケールに対して過剰**: 7 MB の画像資産に対して R2 バケット設定・Wrangler 設定・Keystatic カスタム画像ストレージの実装を行うコストが割に合わない
2. **SSG では on-demand 変換の恩恵が限定的**: `astro:assets` のビルド時変換で代替可能。R2 の Image Transformations が本領を発揮するのは SSR / ISR 構成（ADR 0003 で SSG 継続を決定済み）
3. **Cloudflare アカウントとの結合**: Cloudflare Pages への移行（Phase 3 候補）前に R2 を使い始めると、Vercel + Cloudflare の2アカウント管理になる。Phase 3 で Cloudflare に統合する際は別 ADR で再評価する

### Vercel Blob

**却下理由**:

1. **Vercel へのロックイン強化**: Vercel Blob は Vercel プラットフォームに強く結合しており、Phase 3 でホスティング移行する際の切り替えコストが上がる
2. **On-demand 変換に Vercel Adapter が必要**: `/_vercel/image` によるオンデマンド変換は Vercel Adapter（SSR モード）が前提に近く、SSG 継続（ADR 0003）の方針と整合しない
3. **超過コスト**: 5 GB 無料枠は現在の運用に対して余裕があるが、課金設定・トークン管理を避けたい現フェーズでは導入するモチベーションが薄い

### Cloudinary / ImageKit

**却下理由**:

1. **外部 SaaS への依存**: サービス継続性・価格改定リスクを新たに抱える
2. **無料枠制限**: Cloudinary の無料枠（25 credits / 月）は動的変換を多用すると意外と消費しやすく、超過後の課金発生リスクがある
3. **Keystatic 連携の実装コスト**: Upload Preset の設定・Cloudinary SDK の導入・Keystatic カスタムストレージへの組み込みが必要で、現在の規模には不釣り合い

### GitHub LFS

**却下理由**:

1. **CDN 配信がない**: GitHub LFS からのダウンロードは GitHub のサーバーから直接行われ、Vercel CDN や Cloudflare CDN のエッジ配信は適用されない。配信パフォーマンスが現在の Vercel 静的ファイル配信より劣化する可能性がある
2. **`astro:assets` の最適化が効かない**: LFS ポインターファイルをビルドプロセスが正しく扱えるよう追加設定が必要になる
3. **Vercel でのビルド設定**: Vercel の CI 環境で Git LFS を正しくプルするためのビルド設定（`git lfs pull`）が追加で必要になる

---

## 関連 Issue への影響

### #98 既存 public/images/* の移行または維持を実行する

- **方針**: 本 ADR の採用により「維持」を選択。移行スクリプトは不要
- **アクション**: #98 は本 ADR をもって「現状維持（移行なし）」と結論付け、維持の判断を文書化してクローズする

### #33 画像・メディアストレージ戦略の決定（親 Issue）

- **方針**: 本 ADR および #97 の完了をもって、親 Issue #33 の受け入れ条件が充足される

### #30 / #88 CMS リポジトリ構成

- **整合性**: Keystatic の `storage: { kind: "local" }` を継続する本決定は、リポジトリ構成（単一リポ継続, ADR 0005 予定）と完全に整合する

### ADR 0002 / Keystatic

- **整合性**: ADR 0002 の「当面はリポジトリ内 `public/images/blog/` に保存」方針を本 ADR で正式採用として確定する

---

## 外部ストレージ移行を再検討すべきトリガー

以下の条件が発生した場合は本 ADR を **Superseded** にした上で再評価する:

1. **リポジトリ内画像が 100 MB を超えた場合**: Git clone / CI ビルドの遅延が顕著になるタイミングで外部化を検討
2. **Keystatic リモートモードへの移行時**: Keystatic Cloud や GitHub App によるリモート編集を採用する場合、`fields.image()` の画像保存先を外部ストレージに切り替える必要が生じる
3. **Phase 3 で Cloudflare スタックに移行する際**: Cloudflare R2 + Image Transformations は Cloudflare スタック（Workers / D1 / Pages）に移行するタイミングで一元化すると費用対効果が高くなる
4. **動的リサイズが必須になった場合**: OGP 画像以外でオンデマンドの画像変換が必要な機能（レスポンシブ画像の API、ユーザーアバター等）が追加された場合

---

## 結果

リポジトリ管理を継続することで以下が実現できます:

- 外部サービスのアカウント・課金設定・API トークン管理なしに、`astro:assets` + Vercel CDN の組み合わせで現在の品質を維持できる
- Keystatic の `storage: local` モードと自然に統合でき、CMS からの画像アップロードを追加設定なしで受け入れられる
- Phase 3（Cloudflare スタック移行）でメディア戦略を全体的に再設計する選択肢を残せる
- #98 は「移行なし / 現状維持」として即座にクローズ可能になり、スプリントの消化を加速できる

---

## レビュー / 昇格手順

1. 本 ADR は **Status = Proposed** で起票
2. PR レビューでの合意後、`Accepted` へ昇格させる PR を別途出す
3. Accepted 後、Issue #98 を「現状維持」として close し、ADR README を更新する

---

## 実装確認サマリー（Issue #98）

**確認日**: 2026-05-18  
**対応**: 現状維持（移行なし）

| 確認項目 | 結果 |
|---------|------|
| `public/images/blog/` ファイル数 | 41 ファイル（ADR 記載の 41 ファイルと一致） |
| `public/images/blog/` サイズ | 7.0 MB（外部ストレージ移行トリガー 100 MB 未到達） |
| `public/` ルート画像 | 17 ファイル（旧来の短縮命名。全てリポジトリ内に存在確認済み） |
| heroImage パス整合性 | 全記事の heroImage パスがリポジトリ内ファイルまたは外部 URL として解決可能 |
| ビルド成功 | `pnpm run build` 正常完了 |
| E2E テスト | `pnpm exec playwright test` 全テスト通過 |

移行スクリプトは不要。ADR 決定（リポジトリ管理継続）の通りに運用されていることを確認。
