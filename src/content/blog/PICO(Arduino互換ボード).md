---
title: "PICO (Arduino互換ボード)"
description: ""
pubDate: 2018-02-14
category: "Arduino"
heroImage: '/images/blog/6eab76f6d821.jpg'
---
本日(2018/2/13)、KickStarterで出資していたモノが届いたので、早速動かしてみた。
[PICO: The world's smallest Arduino compatible board!](https://www.kickstarter.com/projects/melbel/pico-the-worlds-smallest-arduino-board)

よくあるプチプチ付きの封筒
![enter image description here](https://i.imgur.com/kAyXpwh.png)
小さい！
![enter image description here](https://i.imgur.com/7XZ3Fmz.png)
少々バリが目立つ。
![enter image description here](https://i.imgur.com/aCRfy3V.png)

とりあえず接続してシリアルモニターを有効にしていたら、こんなメッセージが(動画)
[![](https://img.youtube.com/vi/4YGrQIP1-TQ/0.jpg)](https://www.youtube.com/watch?v=4YGrQIP1-TQ)

で、何か動かしてみようとしたときにボード設定に困ったものの、プロジェクトページの記載を見つけたので、Leonardoに合わせる。
![enter image description here](https://i.imgur.com/PmZ4lkw.png)

基本のBlinkスケッチ（プログラム）を動かして見たものの反応なし。
光っているLEDはLED_BUILTINと違うの？

仕方なく適当に配線(PICO側はD3とGNDに配線)、以下のスケッチで動作確認。
```c++
#define LED 3

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);
}

void loop() {
  for(int i=0;i<255;i+=1)
  {
    analogWrite(LED, i);
    delay(10);
  }
  for(int i=255;i>0;i-=1)
  {
    analogWrite(LED, i);
    delay(10);
  }
}
```

動いた！(動画)
[![](https://img.youtube.com/vi/MOfG1G_-Gu8/0.jpg)](https://www.youtube.com/watch?v=MOfG1G_-Gu8)
