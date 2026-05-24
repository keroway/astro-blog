# 0008 — 管理者向け記事作成補助の自動化: Claude Agent SDK を非ランタイム CLI として導入

- **ステータス**: Accepted
- **決定日**: 2026-05-24
- **決定者**: @keroway
- **関連 Issue**: [#180 管理者向けの記事作成補助・レビュー機能を Agent SDK で検討する](https://github.com/keroway/astro-blog/issues/180)
- **前提 ADR**: [0001 — CSS フレームワーク](./0001-css-framework.md)（新規依存は ADR を要する＝implementation.md D1 の根拠）
- **後続 Issue**: 各補助機能の実装は本 ADR では行わず、follow-up sub-issue に切る（「スコープ」セクション参照）。最初の縦切りは frontmatter 補完提案 = [#181](https://github.com/keroway/astro-blog/issues/181)。

---

## コンテキスト

keroway.com の記事執筆まわりには、すでに **静的検査** と **人手起動のレビュー** の二系統の補助がある。

| 種別 | 実体 | できること | できないこと |
|------|------|-----------|------------|
| 静的検査スクリプト | `scripts/audit-blog.ts` / `scripts/lint-alt.ts` / `scripts/backfill-frontmatter.ts` | 公開維持/更新必要/アーカイブの機械判定、alt の空/短検出、readingTime の文字数計算 | 文章を読んだ上での**生成・提案**（alt 文の候補、description の起案、改善内容の具体化） |
| 人手起動エージェント | `.claude/agents/literary-tech-editor.md` | 技術層/論理層/情緒層の三層推敲、トーン調整、タイトル/description 案出し | 自動実行（管理者が会話で起動する前提。CI や CLI からは回らない） |

静的検査は「欠落の検出」止まりで、欠落を**埋める文面の生成**はできない。人手起動エージェントは生成できるが、管理者が対話で呼び出す必要があり、定型作業（frontmatter 補完・alt 候補出し）まで毎回会話で回すのは運用負荷が高い。この隙間 ——「機械的だが文章理解を要する定型生成」—— を埋める手段がない。

### なぜ今か（採用根拠）

Claude の **Agent SDK / `claude -p`（非対話モード）/ Claude Code GitHub Actions** といったプログラム利用は、2026-06-15 開始の有料プラン月間クレジット制度の対象になる（参照: gihyo.jp/article/2026/05/claude-agent-sdk-credit）。

- 月間クレジット: Pro $20 / Max 5x $100 / Max 20x $200（月次リセット・**繰り越しなし**、超過分は API レート課金）。
- 対話的利用（ターミナル/IDE/Web/モバイルでの会話）は対象外。
- **API キー直課金とは別枠**で、個人サブスクに紐づくクレジットでプログラム利用を回せる。

つまり、API キーで従量課金を積む構成を避けつつ、**既に支払っている個人サブスクの月間クレジット枠で**執筆補助を自動化できる。個人ブログの低頻度ワークロード（記事公開のたびに数回程度）であれば、月間クレジット枠に十分収まる見込みであり、これが「今、Agent SDK を入れる」根拠になる。

### Agent SDK の技術的前提（ctx7 で確認）

`@anthropic-ai/claude-agent-sdk` の TypeScript `query()` は、本用途に必要な機能を備える（ctx7 `/nothflare/claude-agent-sdk-docs` で確認）:

- **構造化出力** (`outputFormat: { type: 'json_schema', schema }`): frontmatter の `description` / `tags` / `category` のような構造化提案を JSON Schema で受け取れる。
- **権限モード** (`permissionMode`): CI/非対話実行向けに `bypassPermissions`、`settingSources: ['project']` でローカル設定を排除して再現性を確保できる。
- **ツール制御** (`allowedTools` / `disallowedTools` / `canUseTool`): 読み取り専用に絞る、書き込み先を制限するなどの安全弁を持てる。

これらは「読んで・構造化して・提案を返す」という本用途に過不足なく対応する。

---

## 決定事項

**管理者向け（非公開・サイトランタイム非搭載）の記事作成補助を、Claude Agent SDK を用いて段階的に自動化する。** 実装レイヤは `scripts/` のローカル CLI を第一とし、将来必要なら GitHub Actions（PR コメント形式）に拡張する。認証は個人サブスクの月間クレジットを使う経路（API キー直課金を避ける）に限定する。

確定する内容:

1. **導入の是非**: Agent SDK を「管理者向け執筆補助」の実装手段として**採用する**。新規依存 `@anthropic-ai/claude-agent-sdk`（および必要なら関連 `@anthropic-ai/*`）の追加を本 ADR で承認する。
2. **実装レイヤの固定**: 公開サイトのランタイム（`dist/` の HTML・クライアント JS・Vercel Function）には**絶対に載せない**。実装は (a) `scripts/` のローカル CLI（`node --experimental-strip-types`、既存スクリプトと同経路）を第一とし、(b) GitHub Actions は follow-up で必要性が出たら検討する。
3. **認証・課金の制約**: プログラム利用クレジット（個人サブスク紐づき）で回す。**API キー直課金はしない。** ローカル CLI は管理者がログイン済みの Claude Code 認証を用いる。GH Actions 化する場合は API キーではなく OAuth トークン（`CLAUDE_CODE_OAUTH_TOKEN`）でサブスククレジットを使う。
4. **候補機能の棚卸しと優先度**: 下記「候補機能の棚卸し」表のとおり優先度と想定工数を確定し、**最初の縦切り（1 PR サイズ）を frontmatter 補完提案とする**。
5. **人手起動エージェントとの棲み分け**: `literary-tech-editor` は廃止しない。定型・構造化タスク（frontmatter 補完、alt 候補）は自動 CLI、深い編集判断（トーン・論理構造・文学的推敲）は人手起動エージェント、と役割を分ける。

### ステータスを Accepted とする理由

本 ADR は「導入方針・実装レイヤ・認証制約・棲み分けを確定し、各機能の実装だけを follow-up sub-issue に分離する」立場である。導入の是非そのもの（Agent SDK を採用し、非ランタイム CLI として、サブスククレジットで回す）は本 PR で確定する。依存追加と CLI 実装が未着手である点は「決定の保留」ではなく「スコープの分割」（B1: 1 PR = 1 関心事 / B3: 差分分割）であり、ADR 0007 の前例（語彙を確定し実装を follow-up に分離して Accepted）に倣う。

---

## 候補機能の棚卸し（受け入れ条件 1）

Issue #180 の候補 (1)〜(5) を「管理者向け・非ランタイム」前提で棚卸しし、優先度・想定工数・既存フックを付けた。

| # | 機能 | 既存フック | 出力の性質 | 優先度 | 想定工数 | 備考 |
|---|------|-----------|-----------|--------|---------|------|
| (2) | **frontmatter 補完提案** | `backfill-frontmatter.ts` | 構造化（description/tags/category）。`outputFormat` の JSON Schema に素直に乗る | **高（最初に着手）** | 半日〜1日 | テキスト入力のみ。category は audit-blog.ts の正規カテゴリ集合に沿わせる。Agent SDK 統合のパターンを最小で実証できる |
| (3) | alt テキスト候補生成 | `lint-alt.ts` | 画像＋文脈 → alt 文。管理者が確認して採用 | 中 | 1日 | 画像入力（マルチモーダル）が必要で (2) より複雑。lint:alt と連携 |
| (5) | 過去記事の改善提案 | `audit-blog.ts` | 「更新必要」記事への自然文提案 | 中 | 1日 | audit-blog の静的判定を具体提案で強化。出力が主観的で評価が難しい |
| (1) | 下書きの推敲・トーンレビュー | `literary-tech-editor.md` | 三層レビュー（技術/論理/情緒） | 中〜低 | 1〜2日 | 人手起動エージェントと役割が重なる。自動化と人手の棲み分け設計が前提 |
| (4) | 公開前の総合レビュー | （複合） | 事実確認・リンク切れ・用語・モチーフ整合 | 低（最後） | 2日 | 記事版 `/ship-check`。(2)(3)(5) の部品が揃ってから複合させるのが筋 |

**最初の縦切りを (2) frontmatter 補完提案とする理由**:

- テキスト入力のみで完結し、マルチモーダルや複合判定が要らない（最小の縦切り）。
- 出力が構造化されており、Agent SDK の `outputFormat`（JSON Schema 構造化出力）に素直に乗る。統合パターンを一直線で実証できる。
- 既存の `backfill-frontmatter.ts`（frontmatter を機械挿入する先例）の延長で、認証→`query()`→構造化出力→提案提示という一連の経路を最小コードで通せる。
- category 制約（正規カテゴリ集合）という明確なガードレールがあり、出力の妥当性を機械検証しやすい。

---

## 認証・クレジット運用の制約（受け入れ条件 4）

本 ADR で確定し、実装 sub-issue が遵守する制約:

1. **プログラム利用クレジットで回す。** Agent SDK / `claude -p` / Claude Code GH Actions は 2026-06-15 以降、有料プラン月間クレジットの対象。個人サブスク（Pro $20 / Max 5x $100 / Max 20x $200・月次・繰り越しなし）の枠内で運用する。
2. **API キー直課金はしない。** 従量 API キー課金は採用根拠（サブスククレジット活用）を無効化するため使わない。
3. **ローカル CLI は管理者のログイン済み Claude Code 認証を使う。** リポジトリに API キー/トークンを置かない。
4. **GH Actions 化する場合は OAuth トークン (`CLAUDE_CODE_OAUTH_TOKEN`) を使う。** API キーではなくサブスククレジット経路。トークンは GitHub Secrets に格納し、リポジトリにコミットしない。
5. **個人ブログ運用に限る。** クレジットは個人サブスクに紐づくため、共有/商用ではなく keroway 個人の運用前提。クレジット超過時は API レート課金になる点に留意し、低頻度（公開のたびに数回）の使用に留める。
6. **公開サイトには一切の認証情報・SDK を載せない。** SDK と認証は `scripts/`（ローカル）または GH Actions（CI）に閉じ、`dist/` のビルド成果物・クライアント JS・Vercel Function には絶対に含めない。

---

## 検討した選択肢

| 選択肢 | 概要 |
|--------|------|
| **A: Agent SDK を非ランタイム CLI として採用** ★採用 | `@anthropic-ai/claude-agent-sdk` を dev 依存として導入し、`scripts/` のローカル CLI（将来 GH Actions）で執筆補助を自動化。サブスククレジットで運用 |
| **B: Anthropic API（API キー）を直接叩く** | SDK を介さず REST/SDK + API キーで実装。クレジット制度ではなく従量課金 |
| **C: 人手起動エージェント＋静的スクリプトの現状維持** | `literary-tech-editor` と `audit-blog`/`lint-alt`/`backfill-frontmatter` のみ。自動生成は入れない |
| **D: 何も導入しない（完全現状維持）** | 補助の拡張を行わない |

---

## 比較評価

### A: Agent SDK を非ランタイム CLI として採用（採用）

**メリット**:

- **採用根拠（サブスククレジット）に直結。** Agent SDK 経路はクレジット制度の対象で、API キー直課金を避けられる。個人ブログの低頻度ワークロードなら月間枠に収まる見込み。
- **構造化出力・権限モード・ツール制御が標準装備。** frontmatter 補完のような構造化タスク（`outputFormat`）、CI 実行（`bypassPermissions` / `settingSources: ['project']`）、読み取り専用化（`allowedTools`）を自前実装せず使える。
- **既存 CLI 経路に乗る。** `scripts/*.ts` を `node --experimental-strip-types` で回す既存パターンを踏襲でき、ビルド/配信構成に影響しない。
- **ランタイム非搭載を機械的に担保できる。** SDK は dev 依存・`scripts/` 限定で、`dist/` にも Vercel Function にも入らない。公開サイトの速度・バンドルへの影響はゼロ。

**デメリット**:

- 新規依存カテゴリ（`@anthropic-ai/*`）が増える（ADR で承認・本デメリットを受容）。
- クレジット消費が発生する（低頻度運用と超過監視で対処。繰り越しなしの月次枠を意識する）。
- SDK のバージョン追従コスト（実装 sub-issue でバージョンを pin し、ctx7 で挙動確認する運用＝implementation.md A3）。

### B: Anthropic API（API キー）を直接叩く

**メリット**:

- 依存が薄い（SDK を介さず軽量に書ける場合がある）。

**却下理由**:

- **採用根拠を無効化する。** API キー直課金はクレジット制度の枠外で、サブスククレジットを使うという #180 の前提（コスト面の採用根拠）を壊す。
- 構造化出力・権限モード・ツール制御を自前で組む必要があり、かえって実装が増える。

### C: 人手起動エージェント＋静的スクリプトの現状維持

**メリット**:

- 追加依存ゼロ。`literary-tech-editor` と既存スクリプトで完結。

**却下理由**:

- 静的スクリプトは「欠落の検出」止まりで、欠落を埋める文面を生成できない（lint-alt は空 alt を検出するが alt 文は書けない）。
- 人手起動エージェントは生成できるが自動実行されず、定型作業を毎回会話で回す負荷が残る。#180 が解こうとする「機械的だが文章理解を要する定型生成」の隙間が埋まらない。
- なお C の資産（`literary-tech-editor`・静的スクリプト）は A でも廃止せず、棲み分けて併存させる（深い編集判断は人手、定型生成は自動）。

### D: 何も導入しない（完全現状維持）

**却下理由**:

- 採用根拠（クレジット制度で今ならサブスク枠で回せる）という機会を見送るだけで、#180 の課題を一切解消しない。

---

## スコープ（本 ADR の境界）

| 範囲 | 本 ADR / 本 PR | follow-up sub-issue |
|------|----------------|---------------------|
| 導入是非・実装レイヤ・認証制約・棲み分けの確定 | ◯（本 ADR） | — |
| 候補機能の棚卸し・優先度・最初の縦切り選定 | ◯（本 ADR） | — |
| `@anthropic-ai/claude-agent-sdk` の依存追加 | ✗ | ◯（最初の sub-issue） |
| frontmatter 補完 CLI（`scripts/`）の実装 | ✗ | ◯（最初の sub-issue） |
| alt 候補生成 / 過去記事改善提案 / 推敲 / 総合レビュー | ✗ | ◯（個別 sub-issue、本 ADR の優先度順） |
| GitHub Actions（PR コメント形式）への拡張 | ✗ | ◯（必要性が出たら別 Issue） |

**本 PR はドキュメントのみ**（ADR 0008 / README 連番表）。依存追加・コードは最初の sub-issue（frontmatter 補完提案）の PR で行う。

---

## 影響

### docs/adr/README.md

- 連番表に 0008 の行（ステータス: Accepted）を追記する。

### package.json / 依存

- **本 PR では変更しない。** `@anthropic-ai/claude-agent-sdk` の追加は最初の sub-issue の PR で行う。導入時は pnpm 11 のサプライチェーン保護（`minimumReleaseAge` 等）と整合するバージョンを選び、ctx7 で挙動を確認する（A3）。

### 公開サイト（`dist/` / Vercel Function / クライアント JS）

- **一切変更しない。** SDK・認証は `scripts/`（または将来の GH Actions）に閉じ、ランタイムには載せない。

### `.claude/agents/literary-tech-editor.md` / 既存スクリプト

- **廃止しない。** 自動 CLI と棲み分けて併存。深い編集判断は人手起動、定型生成は自動。

### follow-up sub-issue（実装）

- 本 ADR の優先度順（(2)→(3)/(5)→(1)→(4)）で個別に起票・実装する。最初は frontmatter 補完提案を 1 PR サイズの縦切りで実装する（[#181](https://github.com/keroway/astro-blog/issues/181) として起票済み）。

---

## 結果

本 ADR の確定により、以下が実現できる:

- 「機械的だが文章理解を要する定型生成」（frontmatter 補完・alt 候補など）を、サブスククレジット枠で自動化する道筋が定まる。
- 実装が「ランタイム非搭載・サブスククレジット・ローカル CLI 第一」という制約に縛られ、公開サイトへの影響と従量課金リスクを構造的に排除できる。
- 人手起動エージェントと自動 CLI の棲み分けが明文化され、`literary-tech-editor` と重複せずに補完関係を保てる。
- 最初の縦切り（frontmatter 補完提案）が 1 PR サイズで定義され、follow-up sub-issue として着手可能になる。

---

## 参考

- [Issue #180 — 管理者向けの記事作成補助・レビュー機能を Agent SDK で検討する](https://github.com/keroway/astro-blog/issues/180)
- [ADR 0001 — CSS フレームワーク](./0001-css-framework.md)（新規依存は ADR を要する根拠）
- Claude Agent SDK ドキュメント（ctx7: `/nothflare/claude-agent-sdk-docs`） — `query()` の `outputFormat` / `permissionMode` / `settingSources` / `allowedTools`
- gihyo.jp『Claude 有料プランの月間クレジット制度』(2026-05) — プログラム利用クレジットの開始日・対象・金額・繰り越しなし
- 既存資産: `.claude/agents/literary-tech-editor.md`, `scripts/{audit-blog,lint-alt,backfill-frontmatter}.ts`
</content>
</invoke>
