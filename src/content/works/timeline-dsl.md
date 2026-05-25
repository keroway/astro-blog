---
title: "timeline-dsl"
description: "Wikidata を起点に年表を構造化し、調査から公開までの導線を整える timeline-dsl の紹介枠です。"
status: "active"
repoUrl: "https://github.com/keroway/timeline-dsl"
lpUrl: "https://timeline-dsl-lp.pages.dev/"
demoUrl: "https://keroway.github.io/timeline-dsl/"
tags:
  - "Rust"
  - "TypeScript"
  - "Astro"
  - "Wikidata"
  - "DSL"
  - "WebAssembly"
createdAt: 2026-05-10
updatedAt: 2026-05-25
featured: true
---

## 制作経緯

Wikidata には歴史上の出来事や人物の構造化データが豊富に蓄積されているのに、それを手元で「育てられる年表」として管理する仕組みが意外と手薄でした。スプレッドシートは差分管理に向かず、既製の年表ツールはテキスト定義に対応していないものが多い。

「テキストで定義し、Git で管理し、CI で自動生成する」という開発者の感覚で年表を扱いたいという動機から、timeline-dsl は始まりました。創作設定の世界史、教材の沿革、研究ノートの人物関係図など、長期にわたって更新される年表をコードと同じ感覚で育てることを目指しています。

## 概要

`.tdsl` ファイルに C 風の宣言的構文で年表を記述します。Wikidata から QID を指定して歴史データを自動取得でき、HTML（インタラクティブ / 静的）・SVG・PDF・PNG の 4 形式で出力できます。

ブラウザ上の [Playground](https://keroway.github.io/timeline-dsl/) でリアルタイム編集・プレビュー → ローカルで `tdsl check` → CI で自動ビルドという 3 段階のワークフローを想定しています。VS Code 拡張と LSP サーバーも整備しており、エディタ上でシンタックスエラーをリアルタイムにフィードバックできます。

## 技術選定

- **Rust 2024 + マルチクレートワークスペース** — コンパイラ本体にパフォーマンスと型安全性が必要で、Rust を選んだ。機能ごとにクレートを分離（`tdsl-parser` / `tdsl-core` / `tdsl-wikidata` / `tdsl-render` / `tdsl-wasm`）し、テスト対象・WASM ターゲットを切り替えやすくしている。
- **pest PEG パーサー** — DSL の文法を `.pest` ファイルで宣言的に管理できる。文法変更の影響範囲が明確になり、ブラウザ向け WASM ビルドにも素直に乗せられる。
- **4-pass IR lowering** — 宣言解決 / 静的アイテム展開 / Wikidata import 解決 / map 適用の 4 段階に分離。ネットワーク I/O が必要な Pass 3 だけを async にし、WASM ビルドでは Pass 3・4 をスキップして同期実行できる。
- **wasm-bindgen** — `tdsl-wasm` をブラウザ向け WASM facade として npm 公開（`@keroway/tdsl-wasm`）。WebUI と Obsidian プラグインがこの薄いラッパー越しにコンパイラを呼び出す。
- **Wikidata REST/SPARQL + ローカルキャッシュ** — QID 指定で歴史データを自動取得。24 時間 TTL のディスクキャッシュでオフライン利用と CI の安定性を両立させた。

## 学び

- **IR スキーマを外部契約として早期に安定させる。** JSON IR は CLI・WebUI・WASM の共通インターフェースなので、新規フィールドには `skip_serializing_if = "Option::is_none"` を必須にして後方互換を維持する原則を最初に決めた。この判断がなければ、Obsidian プラグインなど外部統合が機能追加のたびに壊れていた。
- **ネットワーク依存を 1 クレートに閉じ込める効果は大きかった。** `tdsl-wikidata` だけが HTTP クライアントを持ち、他クレートは trait 越しにモックを差し替えられる。CI でのテストが高速・安定し、WASM ビルドも `default-features = false` だけで Wikidata 依存を完全に外せる。
- **LSP を整備すると「年表を書くリズム」が変わった。** CLI でコンパイルして確認するフローでは、エラーを目視で追う手間が残る。LSP サーバーでエディタ内にエラーをハイライトするようにしてからの方が、`.tdsl` を書く体験が明らかに快適になった。

## 今後の方向性

LSP の完成度を上げることが直近の関心事です。Completion（キーワード補完）・Hover（hover 情報）は実装済みで、Goto Definition や Code Action を次のターゲットとして検討しています。

WebUI 側では共有 URL コピー、履歴スナップショット、エディタ⇄プレビュー双方向ジャンプを順次追加してきており、ブラウザ完結での年表制作体験が着実に上がっています。

本サイト側では、Wikidata から実際に歴史データを取り込んで可視化する過程を記事として深掘りしたいと考えています。
