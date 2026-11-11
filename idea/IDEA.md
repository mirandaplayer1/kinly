# Kinly — 產品想法

**結論：** Kinly 是每位長者的 AI 照護團隊，住在 WhatsApp 裡。吃藥是切入點。它會看老人拍的照片、檢查藥對不對、主動提醒、有狀況就打電話，並通知家人和個管師。

**下一步：** 在輸入框打 `! brew install ngrok`，然後開始做第 1 階段。

---

## 一句話 pitch（英文，給美國評審）

> "Caregiving has nowhere near enough people. Kinly is an AI care companion in WhatsApp. It checks every pill, calls when something's wrong, and keeps the whole family in the loop."

> "Medicare already pays clinics every month to monitor and check in on seniors. Clinics don't have the staff. Kinly does the work."

## 願景：為什麼這不只是吃藥提醒

不要說：「我們提醒老人吃藥。」要說：「我們是每位長者的 AI 照護團隊。」

1. **吃藥**：每天都要做，所以老人天天會用 → 切入點
2. **慢性病監測**：血糖、血壓有異常就找人 → Livongo 的生意
3. **大腦健康**：每天的小遊戲和對話，拿老人跟自己的過去比，發現變化
4. **電子寵物**：讓老人每天想打開，讓家人一直回來看
5. **第一人稱資料**：眼鏡錄到老人的真實生活 → 別人拿不到的資料

## 對到 YC 的哪一項 RFS

1. **AI for the Aging Population**（2026 秋季，Max Kolysh）：主打這一項
   - 原文：「there's nowhere near enough people to take care of everyone… 53 million family members are already doing this work unpaid.」
   - 原文：「Even Alexa and Google Home are frustrating for most seniors to use.」→ 所以用老人本來就會用的 WhatsApp 和電話
   - `https://www.ycombinator.com/rfs#ai-for-the-aging-population`
2. **AI-Native Service Companies**（2026 夏季）：用在商業模式。「我們不是賣工具，是直接把工作做完。」
3. **AI Guidance for Physical Work**（2026 春季）：用在眼鏡階段。「an AI that sees what you see」，原文有點名 nursing（護理）

注意：最新的 2027 冬季 RFS 沒有健康相關的項目。pitch 時要說「呼應 2026 秋季的 RFS」。

## 問題有多大（投影片用的數字）

1. 美國 65 歲以上的人，**43%** 一天要吃 5 種以上的藥（CDC NCHS）
   `https://www.cdc.gov/nchs/hus/topics/rx-drug-use.htm`
2. 65 歲以上因為藥物傷害跑急診：每年每千人 **12.1** 次，65 歲以下是 5.0 次，**高 2.4 倍**（Budnitz，JAMA 2021）
   `https://doi.org/10.1001/jama.2021.13844`
3. 沒照醫囑吃藥的原因裡，**46%** 是忘記
   `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9501565/`
4. 簡訊提醒讓乖乖吃藥的機會變成約 **2 倍**（OR 2.11，16 個隨機對照試驗）
   `https://doi.org/10.1001/jamainternmed.2015.7667`
5. 台灣在 2025 年底成為超高齡社會，65 歲以上佔 **20.06%**。用來講故事：「我們先在最老的市場做出來。」

**上台前要查證：**
1. 打開 JAMA 2021 那篇論文，確認 65 歲以上的數字
2. 台灣 20.06% 這個數字，要改引內政部的新聞稿，不要引新聞報導

**不要用：**
- 「每年 12.5 萬人死亡」：網路上到處都有，但找不到原始來源
- 「吃錯藥的比例」：找不到清楚的數字

## 參考案例：Livongo

- 血糖一超標，幾分鐘內就有真人衛教師主動聯絡病人
- 錢由雇主和保險公司付，病人免費
- 2020 年被 Teladoc 以約 185 億美元收購（這個數字還沒查證）
- **我們的差別：** Livongo 靠真人，我們先由 AI 接手，只有需要時才轉給真人。這樣成本低很多，一個個管師可以顧更多人

## 分階段

### 第 1 階段：黑客松要 demo 的
1. 老人用 WhatsApp 拍照：藥、血糖機、血壓計、餐點
2. Agent 讀出數字，檢查這一餐的藥對不對，然後記錄下來
3. **藥袋拍一張，自動建立吃藥時間表**：老人不用自己輸入任何東西
4. **「手上這把藥」檢查**：把這一餐要吃的藥倒在手上拍一張，agent 比對顆數、顏色、形狀

### 第 2 階段：主動照護
1. 主動提醒：傳藥的照片（「吃這顆」）、語音訊息、打電話
2. 用紅黃綠燈決定要不要通知人：
   - 綠燈：agent 自己處理
   - 黃燈（例如漏吃一次）：通知兒女
   - 紅燈（例如血糖過低）：打電話給老人，同時通知照護單位
3. 每天晚上傳一句話給家人：「媽今天藥都吃了，血壓 128/82，午餐吃得少一點。」
4. 家人和個管師共用一個 dashboard（儀表板）

### 第 2.5 階段：大腦健康小遊戲

**為什麼 Kinly 適合做：** 醫院一年測一次。Kinly 每天都在，可以拿老人跟自己的過去比。

1. **畫時鐘**（黑客松只做這個）：在紙上畫時鐘、指針指 11 點 10 分，拍照傳來，Claude 評分
2. **記藥遊戲**：「早上那顆白色的藥，你吃了嗎？」
3. **語音**：分析語音訊息裡的停頓和詞彙變化

**證據：**
1. 美國約 **92%** 的輕度認知障礙（MCI）沒被診斷出來，約 740 萬人（USC 2023，部分由 Genentech 出資）
   `https://dornsife.usc.edu/news/stories/hidden-crisis-of-mild-cognitive-impairment/`
2. Medicare 規定每年的健康檢查（Annual Wellness Visit）一定要檢查認知。Kinly 可以提供給醫生參考的資料
   `https://www.cms.gov/cognitive`
3. 數位版畫時鐘測驗的準確度（AUC，越接近 1 越準）是 **0.87**，紙本是 0.74（2021 統合分析）
   `https://pmc.ncbi.nlm.nih.gov/articles/PMC9381608/table/Tab1`

**一定要守的界線：**
- 不能說「偵測失智」或「MCI」。說了就是醫療器材，要 FDA 核准
- 要說：「brain-health check-ins」「跟你平常比有變化」「建議分享給醫生」

**做同樣事情的公司：** Linus Health（數位畫時鐘，募資 5500 萬美元）、Cognivue（FDA 核准）、Canary Speech（語音）

### 電子寵物（貫穿所有階段）

1. 吃藥、量血壓、玩遊戲 → 寵物長大、變開心、解鎖新造型
2. **寵物就是 Kinly 本人**：提醒吃藥、邀請畫時鐘的都是牠
3. 家人也看得到寵物，可以送小禮物 → 家人會一直回來看
4. **寵物不能生病，也不能死。** 忘記吃藥時，牠只說「我想你了」
5. 造型自己設計，不要像 Tamagotchi

**寵物是貓咪。**

**黑客松只做：** 3 種狀態的貓咪圖片（開心、普通、想你）

**證據偏弱：** 遊戲化能不能提升吃藥率，還沒有統合研究的結論（2022 scoping review）。Perx Health 65 歲以上的用戶，吃藥率中位數是 95%，但只是觀察資料，沒有對照組。pitch 時講「養成習慣」，不要配數字。

> "Medication adherence is a habit problem, not a memory problem. Kinly turns care into a daily ritual."

### 第 3 階段：願景
1. 老人戴 Meta 眼鏡，或用手機錄第一人稱影片
2. Agent 即時對話：「你手上這顆是對的嗎？」
3. 收集老人第一人稱視角的照護資料

## 技術選擇

| 功能 | 用什麼 | 備註 |
|---|---|---|
| 傳訊息 | Twilio WhatsApp sandbox | 5 分鐘就能開始用。打電話也用 Twilio |
| 打電話 | Twilio Voice | 試用帳號只能打給驗證過的號碼 |
| 看照片、做判斷 | Claude（vision） | 把老人拍的照片和標準的藥品照片一起給 Claude 比對 |
| 藥品照片 | 台灣食藥署「藥品外觀」資料集 | 見下一節 |
| 把 webhook 開到外網 | ngrok | 讓 Twilio 能把訊息傳到你的電腦 |

**WhatsApp 的 24 小時規則：** 使用者最後一次傳訊息後的 24 小時內，agent 才能自由傳訊息給他。超過 24 小時，只能用事先審核過的模板。
- demo 時：阿嬤當天先傳一則訊息就好
- pitch 時：「上線後提醒會用審核過的模板，超過 24 小時就改打電話」

## 藥品照片資料庫

**demo 用：台灣食藥署「藥品外觀」資料集**
- 約 6,374 顆藥，每顆都有形狀、顏色、刻痕、尺寸、刻字和照片網址
- 免費，採政府資料開放授權條款
- 裡面有 NORVASC、GLUCOPHAGE 這些全球通用的藥。demo 就挑這幾種，美國評審也看得懂

```
curl -L -o tfda_pill.zip "https://data.fda.gov.tw/data/opendata/export/42/json"
```

1. 解壓縮，會得到 `42_5.json`
2. 照片網址在 `外觀圖檔連結` 這個欄位

**全球版的講法：** 「每個國家接一個藥品資料庫。美國用 DailyMed（`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}/media.json`）。」

**不要用：** 美國的 RxImage 和 Pillbox 都已經關站了。

**不要自己訓練模型：** 直接把照片和藥品外觀欄位一起給 Claude 比對，一天內做得完。

## 一定要講清楚的安全界線

Agent 只負責**提醒和比對**，不負責**醫療判斷**。拿不準的時候就轉給真人。評審一定會問這題。

## 商業模式

不讓老人付錢。跟 Livongo 一樣，找以下這些單位付：
1. **診所**：Medicare 本來就付錢讓診所做遠距監測（RPM）和慢性病照護管理（CCM）。診所沒人手，Kinly 幫他們做
2. 居家照護公司、長照機構
3. 保險公司 / Medicare Advantage 計畫（美國給 65 歲以上長者的私人保險方案）

**Medicare 2026 年每人每月付多少（全國標準）：**

| 代碼 | 做什麼 | 金額 |
|---|---|---|
| 99454 | 遠距監測的裝置和資料（每月） | $47.43 |
| 99457 | 每月前 20 分鐘的互動照護 | $51.77 |
| 99458 | 每多 20 分鐘 | $41.42 |
| 99490 | 慢性病照護管理（CCM） | $66.13 ⚠️ 來源是廠商部落格 |

→ 一位長者每月大約 **$100–200**。來源：`https://www.auanet.org/advocacy/get-involved/comment-letters-and-resources/physician-payment-and-coverage-issues/final-rule-cy-2026-medicare-physician-fee-schedule-summary`

⚠️ RPM 通常要求用醫療裝置自動傳資料。「拍照傳血糖機」算不算，還沒查證。pitch 時說「我們幫診所把這些工作做完」，不要說「拍照就能請款」。

## 競爭對手

| 公司 | 做什麼 | 我們的差別 |
|---|---|---|
| **Hippocratic AI** | AI 護士打電話給病人。估值 35 億美元（2025/11） | 他們是醫院打給病人。Kinly 住在老人每天用的 WhatsApp 裡，而且看得到照片 |
| Sensi.ai | 用聲音監測居家照護。C 輪募資 4500 萬美元 | 他們要裝設備，Kinly 用老人自己的手機 |
| Hero Health | 自動分藥機，每月 $29.99 起 | 要買硬體 |
| Medisafe | 吃藥提醒 app | 只提醒，不看照片，也不找人 |
| ElliQ | 桌上型陪伴機器人 | 要買硬體 |

**pitch 時可以這樣講：** Hippocratic AI 值 35 億美元，證明投資人相信「AI 照護員」這個方向。

## 影片（1 分 55 秒以內）

用 Screen Studio 錄手機畫面，用 CapCut 剪接。兩個都已經裝好了。

| 時間 | 畫面 |
|---|---|
| 0:00–0:16 | 數字卡：43% 的長者一天吃 5 種以上的藥 / 急診率高 2.4 倍 |
| 0:16–0:33 | 阿嬤拿著藥盒問「這顆是早上吃的嗎？」，女兒在辦公室。接著出現 logo |
| 0:33–1:00 | WhatsApp 實機錄影：拍藥 → 「對了 ✅」；拍血糖機 → 245，偏高 |
| 1:00–1:22 | 電話響了，agent 關心阿嬤。女兒和個管師同時收到通知 |
| 1:22–1:40 | Dashboard，加上漏吃藥時傳藥的照片 |
| 1:40–1:55 | Meta 眼鏡的願景，最後放 logo 和 GitHub 網址 |

**做的時候就要順便錄：**
1. 4 段 WhatsApp 流程：藥對了、血糖偏高、漏吃藥、通知家人
2. 用第二支手機錄真的來電（畫面和聲音都要）
3. Dashboard 先塞 7 天的假資料，圖表才有東西
4. 空景：阿嬤的手、藥盒、顯示 245 的血糖機
5. 一句阿嬤講的中文（加英文字幕）

## 還沒決定的事

1. ~~產品名稱~~：已定案 **Kinly**
2. ~~寵物~~：已定案 **貓咪**
