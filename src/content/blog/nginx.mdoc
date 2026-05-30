---
title: "nginx"
description: ""
pubDate: 2018-02-07
readingTime: 3
category: "nginx"
heroImage: '/images/blog/a60de377f29d.jpg'
---
一応[前回](/blog/mastodon-on-docker/)の続き

とりあえず、プリコンパイルができてなくても最低限の動作はするんじゃないか、と試しにrunを実行すると動いたっぽい。

が、証明書設定をしていないのでブラウザからアクセスしてもみることができない。
（LOCAL_HTTPSをfalseにすればいいという情報もあったが、現在のバージョンではサポートしていない）

.env.production
```docker
# Changing LOCAL_HTTPS in production is no longer supported. (Mastodon will always serve https:// links)
```

このようなログが出ているので、アクセス自体はできているはず。
```
web_1        | [24353369-454d-4e02-8487-91c1e39f3200] method=GET path=/ format=html controller=HomeController action=index status=301 duration=1.43 view=0.00 location=https://localhost/
```


というわけで、とりあえずHTTPSの設定のやり方をみてみることに。
https://qiita.com/ww24/items/423108ac3659e0f06bc7
上記などを参考にnginx(web server)を設定。
(example.com -> localhostに、include conf.d/*.conf;の追記はせず、もともと記載のあったinclude servers/*;を利用。/usr/local/etc/nginx/servers ディレクトリを作成して、localhost.confをその中に作成した)

ホーム下にwwwディレクトリを作成、次のファイルを作成。
```bash
$ cat index.html 
It Works! nginx
```

httpsで見れました。
![enter image description here](https://i.imgur.com/nLyRv4l.png)


本編はあまり進んでないけど、ここまで。
