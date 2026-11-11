# 手機錄影腳本

先做「開拍前」的 4 步，再照第 1 到 8 幕錄。每一幕要打的字都可以直接複製。

人物：媽媽 **Margaret**、女兒 **Anna**。Kinly 每次回覆要等 7 到 10 秒，等的時間剪掉就好。

---

## 開拍前

1. 電腦打開 `http://localhost:3000/start`，選 **Someone I love**，填 `Margaret`、`Anna`、關係選 **Mom**
2. 第 3 步上傳 `demo/sample-label.png`，把舊的藥都按 Remove，只留 NORVASC 和 GLUCOPHAGE。血糖勾 **Morning**。存到最後一步
3. 手機打開這兩個聊天室，各按一次 **Start**：
   - 女兒：`https://t.me/kinly_familybot`
   - 照護員：`https://t.me/Kinly_careteam_bot`
4. 手機開「勿擾模式」，電量充滿，然後開始螢幕錄影

**為什麼只留 2 種藥：** 10 種藥時，Kinly 的回覆會很長，影片裡看不清楚。2 種藥的故事比較好懂。

---

## 第 1 幕：Kinly 先打招呼

聊天室：**媽媽**（`@kinly_care_bot`）

1. 電腦打開 `http://localhost:3000/nudge/hello`
2. 手機會收到 Kinly 的揮手貼圖和早安
3. 手機回：

```
Good morning Kinly! I slept well.
```

想拍到：Kinly 是自己先來找她的。

## 第 2 幕：吃藥

聊天室：**媽媽**

1. 電腦打開 `http://localhost:3000/nudge/meds_morning`，Kinly 會來提醒吃藥
2. 電腦把 `demo/sample-label.png` 開到全螢幕
3. 用手機在 Telegram 裡**拍一張電腦螢幕上的標籤**，傳給 Kinly，附上這句：

```
Are these the right ones for this morning?
```

想拍到：Kinly 讀出藥名，說是不是早上該吃的，然後慶祝任務完成。

沒有真的藥也可以拍，所以這一幕用標籤。有真的藥瓶就更好。

## 第 3 幕：吃飯

聊天室：**媽媽**

1. 拍一張真的食物，什麼都可以，傳給 Kinly，附上：

```
Breakfast! Just a little today.
```

想拍到：Kinly 對食物有反應，而且記下「吃得少」。

## 第 4 幕：幫我記得

聊天室：**媽媽**

```
Remind me to call Dr. Lee tomorrow at 10.
```

想拍到：Kinly 複述一次，說牠會提醒。

## 第 5 幕：女兒傳話

1. 切到**女兒**的聊天室，打：

```
How's Mom doing today? Tell her I'll come over on Saturday.
```

2. 等 Kinly 回女兒。牠應該會講出今天的藥和早餐
3. 切回**媽媽**的聊天室。應該有 Kinly 轉達的話，附愛心眼貼圖
4. 在媽媽的聊天室回：

```
Tell Anna I can't wait. I'll make scallion pancakes.
```

5. 切回**女兒**的聊天室，應該收到 Kinly 帶回來的話

想拍到：話是雙向的。這是整支影片最暖的一段。

## 第 6 幕：散步影片

聊天室：**媽媽**

1. 在 Telegram 裡錄一段 10 秒的影片：邊走邊拍你的腳和前面的路，室內走廊也可以
2. 傳給 Kinly，附上：

```
Out for my walk!
```

想拍到：Kinly 真的看了影片，講得出畫面裡的東西。

## 第 7 幕：紅燈

1. 在**媽媽**的聊天室打：

```
I feel dizzy and shaky. My blood sugar says 58.
```

2. 等 Kinly 回媽媽。牠應該很冷靜，並且說會通知家人和照護團隊
3. 切到**女兒**的聊天室，應該有 🔴 開頭的通知
4. 切到**照護員**的聊天室，應該有 🔴 開頭的簡短紀錄

想拍到：幾秒內，對的人都知道了。

## 第 8 幕：照護員回覆

1. 在**照護員**的聊天室打：

```
Thanks Kinly. Ask her to drink half a glass of juice and recheck in 15 minutes. I'm calling her now.
```

2. 切回**媽媽**的聊天室，應該收到 Kinly 轉達的指示

最後，電腦錄一段 `http://localhost:3000/family`，停 5 秒，拍到今天的任務和時間軸。

---

## 錄的時候要注意

1. **第一次先當彩排。** 3 個聊天室一起用還沒有實測過，第一次很可能會遇到問題
2. Kinly 說的話每次都不一樣。這是正常的，不用重拍到一模一樣
3. 哪一幕的反應不對，記下是第幾幕、Kinly 說了什麼，拍完再一起告訴我
4. 每一幕之間停 2 秒不要動，之後比較好剪
5. 血糖 58 那一幕，Kinly 可能會在同一個聊天室收到好幾則訊息，等牠全部傳完再切畫面
