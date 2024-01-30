---
title: "Elixir"
description: ""
pubDate: 2018-02-21
category: "Elixir"
heroImage: 'https://lh3.googleusercontent.com/sHfZMtjO4T0Zcq4ofKYViAL11Ul1sO5FR2D4Yxlw7_8AMqZFCKiO_dmxOXy2yS0t_ltw6fkB871vyQ'
---

もうちょっと、ちゃんと覚えてから使いたいテーマでしたが、さらっと触れておきます。

## 概要
Elixir(エリクサー)
- 本家 https://elixir-lang.org/
- 日本語解説（レッスン）https://elixirschool.com/ja/

![enter image description here](https://lh3.googleusercontent.com/sHfZMtjO4T0Zcq4ofKYViAL11Ul1sO5FR2D4Yxlw7_8AMqZFCKiO_dmxOXy2yS0t_ltw6fkB871vyQ)

## インストール
本家の[インストールガイド](https://elixir-lang.org/install.html)を参照

Macの場合は`brew install elixir`でOK

## 実行
elixirをインストールするとiexというREPLがついてきます。
Hello World的なやつをやってみます。
```elixir
$ iex
Erlang/OTP 20 [erts-9.2.1] [source] [64-bit] [smp:4:4] [ds:4:4:10] [async-threads:10] [hipe] [kernel-poll:false] [dtrace]

Interactive Elixir (1.6.1) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)> hello = &("Hello, " <> &1)
#Function<6.99386804/1 in :erl_eval.expr/5>
iex(2)> hello.("keroway")
"Hello, keroway"
iex(3)> IO.puts hello.("Elixir!")
Hello, Elixir!
:ok
```
ざっと解説。
1.  `<>` は文字列連結。`"Hello, "` の後ろに第一引数の値`&1`を結合する匿名関数を`hello`にセット
2. さきほどの`hello`に`"keroway"`を渡して実行。結果は連結した文字列。
3. `IO.puts`で出力。再度`hello`を利用して作成した連結文字列を引数に渡す。
出力が表示され、結果`:ok`が返る。

## 今後
そのうち改めて特性を活かしたネタに挑戦したいです。<br>
（分散処理が活かせるもの・・・できるかな）

