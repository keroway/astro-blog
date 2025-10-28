---
title: "Getting started with Python Web Scraping"
description: ""
pubDate: 2018-04-06
category: "Solr"
heroImage: 'https://lh3.googleusercontent.com/QpSBAiXQ86N2DsWcvv8fhWferGw-OxTU8ERMHABV5VgagSlmF6cHgW0Fqo_frvjQl8g6Bz3Y4s6WQQ'
---

https://hub.packtpub.com/getting-started-with-python-web-scraping/

以前([1](/blog/nerodia1/), [2](/blog/nerodia2/), [3](/blog/nerodia3/))、[nerodia](https://github.com/watir/watir)を用いてブラウザを操作し、表示内容の取得や投稿を行いました。
次はもうちょっとシンプルに、リクエストを出して帰ってきたHTMLをパースして・・・といったやり方でやってみます。

まず今回は、最初のリンク先にあった内容をそのままやってみます。
![enter image description here](https://lh3.googleusercontent.com/QpSBAiXQ86N2DsWcvv8fhWferGw-OxTU8ERMHABV5VgagSlmF6cHgW0Fqo_frvjQl8g6Bz3Y4s6WQQ)

手順に記載がないですが、リンク先では'lxml'を使用しているので、必要に応じてインストールします。
```bash
pip install lxml
または
pip3 install lxml
```
参照先のHTML内容に変更があったのか、一部そのままでは実行できない箇所がありました。
```python
events = soup.find('ul', {'class': 'list-recent-events'}).findAll('li')
```
* リンク先では'list-recentevents'となっている。

出力はこのようになりました。(2018/4/6現在)
```json
{'name': 'PythonCamp 2018 - Cologne', 'location': 'GFU Cyrus AG, Am Grauen Stein 27, 51105 Köln, Germany', 'time': '07 April – 09 April  2018'}

{'name': 'PyCon IT 9', 'location': 'Hotel Mediterraneo - Lungarno del Tempio, 44, 50121 Firenze FI, Italy', 'time': '19 April – 23 April  2018'}

{'name': 'PyCamp Baradero 2018 (PyAr Community)', 'location': 'Baradero, Buenos Aires Province, Argentina', 'time': '28 April – 02 May  2018'}

{'name': 'PyDays Vienna', 'location': 'FH Technikum Wien, Hoechstaedtplatz 6, Vienna, Austria', 'time': '04 May – 06 May  2018'}

{'name': 'GeoPython 2018', 'location': 'Basel, Switzerland', 'time': '07 May – 10 May  2018'}

{'name': 'PyCon US 2018', 'location': 'Cleveland, Ohio, USA', 'time': '09 May – 18 May  2018'}
```

次はもう少し実用的なものをやりたいと思います。
