# Architecture Decision Records (ADR)

このディレクトリには、keroway.com の設計・技術選定に関するアーキテクチャ決定記録 (ADR) を管理します。

フォーマットは **MADR (Markdown Architectural Decision Records)** を採用しています。

## 連番ルール

| 番号 | カテゴリ | ファイル |
|------|----------|---------|
| 0001 | CSS フレームワーク | [0001-css-framework.md](./0001-css-framework.md) |
| 0002 | CMS / コンテンツ管理 | [0002-cms.md](./0002-cms.md) |
| 0003 | レンダリング戦略 | [0003-rendering-strategy.md](./0003-rendering-strategy.md) |
| 0004 | メディア管理 | [0004-media-storage.md](./0004-media-storage.md) |

## ADR の書き方

新しい ADR を追加する場合は、次の連番を割り当て、[MADR テンプレート](https://adr.github.io/madr/) に従って記述してください。

```
docs/adr/NNNN-<kebab-case-title>.md
```

ステータスは以下のいずれかを使用します:

- `Proposed` — 提案中
- `Accepted` — 採用
- `Deprecated` — 廃止（後継 ADR への参照を含める）
- `Superseded` — 別の ADR に置き換え済み
