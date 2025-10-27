---
title: "Mastodon on Docker"
description: ""
pubDate: 2018-02-06
category: "Mastodon"
heroImage: ''
---
本日時点の結論から

- プリコンパイル中にDockerが落ちる（再起動）
```shell
$ docker-compose run --rm web rake assets:precompile
Starting mastodon_db_1 ... doneone

Creating mastodon user (UID : 991 and GID : 991)...
Updating permissions...
Executing process...
Webpacker is installed 🎉 🍰
Using /mastodon/config/webpacker.yml file for setting up webpack paths
Compiling…
ERROR: Couldn't connect to Docker daemon. You might need to start Docker for Mac.
```

- 参考文献
https://github.com/tootsuite/mastodon
https://github.com/tootsuite/documentation/blob/master/Running-Mastodon/Docker-Guide.md
https://www.docker.com/community-edition


困るようなら、素直に他のブログなどを参考にしてみます。
