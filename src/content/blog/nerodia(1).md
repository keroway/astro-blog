---
title: "nerodia(1)"
description: ""
pubDate: 2018-03-22
category: "nerodia"
heroImage: '/blog-placeholder-100.png'
---
## 環境構築編

https://github.com/watir/nerodia
[watir](http://watir.com/)([selenium](https://www.seleniumhq.org/)を利用した、rubyの自動テストツール)のpython版

例によって環境はMacOS(High Sierra)です。
```bash
pip3 install nerodia
...
PermissionError: [Errno 13] Permission denied: '/usr/local/selenium'
```
ディレクトリを作って、書き込みできるように権限を設定します。
```bash
sudo mkdir /usr/local/selenium
sudo chown -R ユーザー名:admin /usr/local/*
```
インストールを再実行しても`/usr/local/selenium`に何も置かれないので、`pip3 uninstall selenium`して、`pip3 install selenium`を実行しました。

- firefox用のドライバ
```bash
brew install geckodriver
```
- chrome用のドライバ
```bash
brew install chromedriver
```
実は`chromedriver`はインストールされていたのですが、何度試してもうまく動かず困っていたところ、ふとバージョンを確認するとだいぶ古いものを使っていた、というオチでした。

そのままbrewでインストールするとリンク作成に失敗。
```bash
rm /usr/local/bin/chromedriver
brew link chromedriver
```
とすることで、無事chromeも使えるようになりました。

次回実際に動かします。

> Written with [StackEdit](https://stackedit.io/)
