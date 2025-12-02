---
title: "Mastodon on Docker(2)"
description: ""
pubDate: 2018-02-07
category: "Mastodon"
heroImage: '/images/blog/1be8323d89b5.jpg'
---
[前回](/blog/nginx/)、[前々回](/blog/mastodon-on-docker/)の続き。
未完成ですが、一旦これで終わり。

[手順](https://github.com/tootsuite/documentation/blob/master/Running-Mastodon/Docker-Guide.md)を見直すと[Production Guide](https://github.com/tootsuite/documentation/blob/master/Running-Mastodon/Production-guide.md)を見てHTTPSの設定しとけよ、とあった。

nginx用のサンプル設定ファイルの記載があるので、そのまま新しいconfファイルにコピペした後下記部分を変更した。

- ポート80のlisten部分をコメントアウト
  元の設定ファイルにも80ポートで受ける設定があったので、起動に失敗したため。
- example.comの箇所をlocalhostに変更
  他も含めて全部そのままでも動いたと思われるが、example.comは実在するアドレスなので、一応。  
- SECURITY WARNING表記のあたりにSSL設定追加
  前回作成したファイルからSSLの設定を抜き出してコピペ。
```nginx
	#SSL
	ssl_certificate /usr/local/etc/openssl/certs/cert.pem;
	ssl_certificate_key /usr/local/etc/openssl/certs/cert.pem;
	ssl_session_timeout 5m;
	ssl_session_cache shared:SSL:50m;
	ssl_dhparam /usr/local/etc/openssl/certs/dhparam.pem;
	ssl_protocols TLSv1.1 TLSv1.2;
	ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK';
	ssl_prefer_server_ciphers on;
```

nginxを再起動して、docker-compose upを実行
案の定、アセットのプリコンパイルは失敗しているようだが、表示自体は成功。

![enter image description here](https://i.imgur.com/6D1hUWD.png)

ローカルでやってもあまり意味もないので、本件はここまで
