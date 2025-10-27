---
title: "Mac OS (High Sierra) で X11フォワーディング"
description: ""
pubDate: 2018-03-09
category: "High Sierra"
heroImage: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhzqH27QWnkdSFP8oPMgQxD4KBC0Ux2rytW8-T_MJEj0wfQn0QpN8j8Uy3sS5zuGuAknk2v0T2HUN_g35tjWSRnhIfz2nwUu3ce3tARR9uHGApsvUOjWWd7r_kJzecI-Qvp6EKB36Exm7s/'
---
引き続きラズパイを使って・・・

LCDを取り付けたはいいものの、画面が小さすぎて設定もままなりません。
ssh経由のコマンドだけではなく、GUIも使いたいと思い、X11フォワーディングをやってみました。

Macから接続しますので[XQuqrtz](https://www.xquartz.org/)をインストールします。
![enter image description here](https://lh3.googleusercontent.com/rTLYi5Sz2tX6CCNDZDIvosLzlqToFxt23ymDm_UFrxCNDHCjZJtfcCYe3YakuiLty-oTFu41xQeqdQ)
インストール完了時、このようにログアウトしろと言われますので、一度ログアウトしてログインし直します。

-Xオプションをつけてsshログイン後、Xを使うアプリを立ち上げればMac側にウィンドウが表示されます。
```shell
ssh -X pi@XXXX
chromium-browser &
```
![enter image description here](https://lh3.googleusercontent.com/8G0K3lyfZ_DeXSNWN59fHZ17IGmV9zs8oAO1OwRZcD6whKByYo7OEjhV33hfKsFdmEJqv5uwUSsMmQ)

画面更新が遅く反応も鈍いですが、なんとか使えそうです。

あとは、JessieからStretchに切り替えようか悩んでいます。
また映らなくなったりしそうなので・・・。

> Written with [StackEdit](https://stackedit.io/).
