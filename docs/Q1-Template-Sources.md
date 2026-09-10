# Q1 活動資料範本：來源、範圍與模擬假設

`frontend/apps/admin-web/public/templates/q1-campaign.json` 是可匯入的完整 Q1 活動設定；格式為 `gigabyte-cashback-campaign`、`schemaVersion: 1`。它根據 User 提供的圖片逐段檢視與人工轉錄，保留原始 2026 年 3–4 月日期，並以 `Draft` 狀態提供。這份檔案不含案件、個資、付款紀錄或正式核准條款。

五國範圍固定為 DE、FR、IT、ES、NL，幣別共用 EUR；僅有單品 Cashback 相加，沒有 Q4 Zone A/B 或 A+B 加碼。前台沿用既有版型。完整匯入會帶入活動文字、規則、產品、通路及來源註記，不會建立新前台版型。

## 圖片來源與核對方式

圖片原檔位於 User 提供的 `Cross-Region Promotion` 資料夾，以下路徑均以該資料夾為根目錄。圖片未加入 Git；範本只保留可攜帶的相對來源路徑。

| 來源 | 實際核對內容 |
| --- | --- |
| `26Q1_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_terms-and-conditions-promotion__country_promotion=12.png` | 3272 × 13554 原始長圖，分段查看完整產品表、各金額合併儲存格、通路表、參加限制、購買及申請時間、審核與付款時間、個資及一般條款。圖片標記更新時間為 13-Mar-2026 11:47。 |
| `26Q1_Landing Page Screenshots/DACH (AT, CH, DE)/DACH (AT, CH, DE)_LP Screenshot_2.png` | EUR/CHF GPU 金額、三類產品、14 天等待、同一發票、DACH 通路 Logo。僅採 EUR 與五國範圍內資料。 |
| `26Q1_Landing Page Screenshots/FR/FR_LP Screenshot_2.png` | EUR GPU 金額、購買/申請日期、重要限制與 8 個通路 Logo。 |
| `26Q1_Landing Page Screenshots/IT/IT_LP Screenshot_2.png` | 同上，4 個通路 Logo。 |
| `26Q1_Landing Page Screenshots/ES/ES_LP Screenshot_2.png` | 同上，11 個通路 Logo。 |
| `26Q1_Landing Page Screenshots/NL/NL_LP Screenshot_2.png` | 同上，8 個通路 Logo。 |
| `26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_faq__country_promotion=12.png` | 審核/付款狀態、發票、銀行資料、序號、補件、換貨/退貨等可見 FAQ 題目。圖片內答案未展開，因此沒有把推測答案當成原文。 |

LP 截圖顯示 GPU 分頁；全部 Motherboard/Monitor 型號與金額採用 T&C 的完整 Table 1。FAQ 文字是對應本系統的英文測試說明，原圖可見的題目與 T&C 操作要求只是編寫依據。

原始 T&C 圖片 SHA-256：`84BBC7F7B25D2C9E48791504B312054101DA7B2A9BD664CE74C43851339AB945`。

## 已轉錄的產品與金額

共 59 個型號，所有金額以 EUR cent 儲存。以原始合併金額欄覆蓋的完整列數計算：

| 類別 | 型號數 | 各 Cashback 金額的型號數 |
| --- | ---: | --- |
| Graphics Card | 11 | EUR 30 × 1、25 × 3、20 × 2、15 × 5 |
| Motherboard | 36 | EUR 90 × 1、50 × 1、40 × 1、30 × 7、20 × 10、10 × 16 |
| Monitor | 12 | EUR 60 × 8、50 × 1、30 × 2、20 × 1 |

同發票各類別一件，最高為 EUR 30 + 90 + 60 = EUR 180，與五國 LP 的最高回饋一致。

產品 ID 使用型號正規化後的識別字串，並非官方 SKU。來源未提供 EAN，因此保留空值；Series 由可見型號字首歸類。型號維持圖片拼法，包括 `B850M EAGLE WF7`、`B650 A ELITE AX ICE`。實際正式上線應由 Product Owner 對照商品主檔，不能把範本衍生 ID/EAN 空值視為完成正式主檔驗證。

## 通路資料

共 46 筆，以國家區分同名通路：DE 15、FR 8、IT 4、ES 11、NL 8。名稱以 T&C 文字及 LP Logo 核對。URL 並非圖片能證實的資料，因此不猜測連結；`url` 保留空字串，`validFrom`/`validTo` 留空代表沿用活動期間。

T&C 將 Germany、Switzerland、Austria 合併為一列，共 17 家。五國範圍中沒有 CH/AT，本範本排除明顯瑞士通路 Digitec 與 Brack，其餘 15 家歸入 DE 作為測試名單。這是明示的模擬映射，來源本身不能證明每一家在 DE 的獨立資格；正式活動仍需 Owner 提供按國家核准名單。沒有新增國家。

## 時間、規則與測試假設

| 設定 | 來源或決策 |
| --- | --- |
| 購買期間 | 原文 16-Mar-2026 00:01 CET 至 28-Mar-2026 23:59 CET；JSON 轉為 UTC。 |
| 申請期間 | 原文 30-Mar-2026 00:01 CET 至 26-Apr-2026 23:59 CET；JSON 忠實使用字面 CET = UTC+01:00。這段時間跨越夏令時間，原文 CET/實際 CEST 存在一小時歧義，來源註記已保留，不自行修正文義。 |
| 等待期 | 購買後至少 14 天。 |
| 人數及品項限制 | 每人、每戶/地址各一件申請，每類產品最多一件，全部商品同一張發票。 |
| 跨活動排他 | 原文禁止與其他 promoter promotion 併用；模擬採 `q1-2026-build-beyond` 命名群組供同系列活動辨識。 |
| 審核、付款 | 原文為 10 個工作天接受/拒絕、驗證後 90 天付款。來源字串儲存於 `legacyFields`，沒有將「10 工作天」冒充引擎的「10 日曆天」設定。 |
| AORUS 會員 | 來源要求會員及同一 email；範本文字明示此版為人工驗證，不宣稱完成會員 API。 |
| 預算/Buffer/件數 | EUR 100,000 / EUR 5,000 / 1,000 件，為 UAT 假設，圖片沒有提供。 |
| 單型號數量 | `quantityLimit: 1`，與每類一件規則一致；不是截圖中的活動庫存額度。 |
| 語言 | 英文操作型摘要；`languages: ["en"]`。五國原圖有各自語言，但本範本不假稱完整多語翻譯。 |
| 客服 | `support@example.test` 不可寄送，避免把 UAT 通知導向原 Agency。 |
| 條款及隱私 | 明確標記 Reference Simulation，使用假資料；沒有沿用 Agency 的資料處理者承諾、正式法律文字或正式銀行付款承諾。 |
| Banner | `/assets/q1-reference-hero.jpg`，從提供的英文 T&C 原圖抽出頂端既有活動素材，矩形 `(0, 0, 3272, 1464)`，等比例縮至約 `1920 × 859` JPEG；已目視確認沒有下面的日期或條款文字。只做原素材擷取，不生成或重新設計活動視覺。 |

素材實體路徑為 `frontend/apps/public-web/public/assets/q1-reference-hero.jpg`，由 public-web 提供；管理端跨來源預覽應相對於 public-web URL 解析。圖中最高回饋 EUR 180 是三類相加；既有單品最高回饋 EUR 90 是主機板單品金額，兩者意義不同。

資料庫的可操作 UAT 活動可由相同範本建立，並把實際期間移至目前可測試的時間；原始時間及此文件仍應保留在來源欄位。該 UAT 副本的名稱/說明應明示模擬性質，測試時以活動畫面顯示日期為準。

## 匯入前的資料核對基準

範本的 `format`、`schemaVersion`、`data` 結構，以及 59 個唯一產品 ID、46 個唯一通路 ID、五國名單、EUR cent 正整數金額已以 JSON 解析檢查。發布前仍應使用系統匯入預覽/驗證檢查；歷史範本日期不會自動變成正式新檔期。
