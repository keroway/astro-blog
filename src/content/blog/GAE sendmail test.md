---
title: "GAE でメール送信"
description: ""
pubDate: 2018-04-25
category: "GAE"
heroImage: '/images/blog/52cb3d07495c.jpg'
---

まずは、課金のお話。
![enter image description here](https://lh3.googleusercontent.com/vMhb6-r32bFH6QB0DHpsI6TKQkBdMrTazuYxMIcCKeEFoEds1KGM-VeiSgZTmr4eaS_uBnTjwKXzjw)

GAE(Google App Engine)のフレキシブル環境が無料でないことは分かってはいたものの、試しに動かしてみただけの割にそれなりの額が課金されていた（初年度の無料クレジット枠なので、実際に払うものではありませんが）ので、何はともあれスタンダード環境に切り替えるところから始めました。

例によってGoogleのサンプルコードを使います。
```bash
git clone https://github.com/GoogleCloudPlatform/python-docs-samples
```

今回はローカル環境で動かしてからデプロイしたいと思いますので、スタンダード環境に合わせて、手元にPython2.7環境を用意します。
```bash
virtualenv -p python2.7 mail
cd mail
source bin/activate
dev_appserver.py app.yaml
```
送信先と送信元を自身のアドレスに変更します。
(今回はGCPを使っているgoogleアカウントのアドレスにしました)
ソースコード上だけでなく、`App Engine > 設定 > メールの送信者 `に送信元メールアドレスの設定が必要です。

とはいえ、ローカル実行の場合、実際にはメール送信されないので、とりあえずそのまま実行しても問題はありません。
（送信する方法については出力メッセージ参照）
```
INFO 2018-04-23 16:58:47,378 mail_stub.py:169] MailService.Send
From: xxxx@gmail.com
To: XXXX XXXXX<xxxx@gmail.com>
Subject: gae mail test
Body:
Content-type: text/plain
Data length: 232
INFO 2018-04-23 16:58:47,378 mail_stub.py:378] You are not currently sending out real email.  If you have sendmail installed you can use it by using the server with --enable_sendmail
```

ローカル実行での確認後、`virtualenv`環境から抜けるには`deactivate`を実行します。

今度はデプロイして実行してみます。
```
gcloud app deploy
gcloud app browse
```
ブラウザにこのような味気ないページが表示されます。
![enter image description here](https://lh3.googleusercontent.com/xv8-m3vUy8tKIpuwoypvMp0A7Xv1n5EqJkJ8IzvDqSnDHBEJc25DFZHIjO5RKSqhMFy1Y39C8G9utg)
Send email. をクリックすると、設定したアドレスにメールが送信されます。

送信先アドレスはくれぐれもお間違いの無いように・・・。
