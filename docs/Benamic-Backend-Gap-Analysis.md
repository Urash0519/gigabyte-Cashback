# Benamic 報表後台與現行後台功能差異

檢視日期：2026-10-08（Asia/Taipei）。比對基準：本次新增參考樣式頁面前的既有後台，Git `91e02d2b77545735610f1bca29a204feb700244e`。此文件是功能盤點與後續建議；「欠缺」不表示本次已實作，也不擴大本次前端樣式開發範圍。

## 1. 判讀方式與結論

使用者提供的後台是以「活動 → 儀表板 → 摘要／交叉表／詳細資料」為主軸的客戶報表入口。現行後台已具備活動管理、審核、付款、單維度彙總及 CSV，主要欠缺是活動報表的視覺呈現、雙維度交叉分析、客服分類資料與可匯出詳細資料的操作體驗。

- **已有**：現行程式可找到相應資料與使用介面；仍可能有外觀與入口差異。
- **部分**：已有基礎資料／作業能力，但缺特定報表、統計定義、互動或整合。
- **欠缺**：本次檢視的現行頁面、DTO、報表服務未發現對應完整功能。
- **無法確認**：參考截圖只顯示按鈕／選單入口，沒有操作結果；不能據此宣稱外包後台的流程、規則或整合已被驗證。

這是靜態截圖與程式碼比對，未登入 Benamic 實測。截圖中的客戶個資、案件號碼、SN 及帳務值不轉錄到文件或新頁面。

## 2. 參考截圖證據

資料夾：`C:/Users/yoyo/Downloads/Cross-Region Promotion/Benamic_BackendPortal/`。

| 代號 | 檔名 | 畫面可直接確認 | 證據限制 |
|---|---|---|---|
| S1 | `benamic_dashboard.png` | 活動清單，Active／Confirmed／Archived 頁籤；待處理詢問、搜尋客戶、比較活動入口；名稱／類型／期間／國家欄位 | 搜尋、比較、待處理詢問的結果畫面未提供 |
| S2 | `Clients Log In.png` | 與 S1 相同的登入後活動入口，清單版本不同 | 檔名含 Log In，但圖片不是登入表單；無法確認登入方式、SSO 或帳號權限 |
| S3 | `benamic_dashboard1.png` | 交易狀態、登錄狀態、Top 10 店家、反詐節省金額、客戶／消費者詢問類型、Top 10 產品、國家地圖、登錄數對唯一參與者；View Full Report 入口 | 指標名稱可見，但完整公式與反詐判定依據不可由圖片推定 |
| S4 | `benamic_dashboard2.png` | 國別摘要，購買國家／Count／Percentage，Search Filters、Download Report、表格／圖表切換圖示、跳頁／每頁筆數；摘要選單展開 | 篩選彈窗、下載格式、圖表切換後內容未提供 |
| S5 | `benamic_dashboard3.png` | Detailed Promotion Overview，多欄案件明細、橫向捲動、Column visibility、篩選／下載／分頁；Detailed Deliverables Report 選單 | 可選欄位清單與下載結果未提供；右側超出可視範圍的欄位無法完整判讀 |
| S6 | `benamic4.png` | Store／Country 交叉表，每國含 Count／Percentage；Product／Store、Country／Product、Marketing Data 選單；篩選／下載入口 | 另外三種 Pivot 只確認入口，未提供內頁 |

## 3. 功能逐項比較

以下程式路徑皆相對於 repository 根目錄，行號依上述比對基準。當原檔之後改動時，可用功能名稱搜尋定位。

| 功能 | 參考後台證據 | 現行狀態與程式證據 | 差異與實務影響 |
|---|---|---|---|
| 活動清單與狀態 | S1／S2：Active、Confirmed、Archived；名稱、類型、期間、國家 | **已有**。`frontend/apps/admin-web/src/Campaigns.tsx:126` 清單篩選、`:216` 狀態、`:430` 狀態選單、`:445` 清單欄位 | 現行是管理列表，參考是點活動進報表；需要不同的頁面入口與排列，不需重建狀態功能 |
| 客戶搜尋 | S1／S2：Search Customer 按鈕 | **已有基礎；參考流程無法確認**。`frontend/apps/admin-web/src/Claims.tsx:60` 可跨已載入案件搜尋客戶、Email、案件編號、發票及 SN | 沒有獨立客戶檔案頁；截圖也不足以證明 Benamic 是否有客戶聚合檔案或進階搜尋 |
| 兩活動比較 | S1／S2：Compare Campaigns 按鈕 | **已有設定比較；參考範圍無法確認**。`frontend/apps/admin-web/src/Campaigns.tsx:536` 比較市場、期間、預算、產品、通路、條款等 | 現行不是件數、核准率、支付結果的並排成效比較。是否需要補成效比較要另定義；不能假設參考按鈕已涵蓋這些指標 |
| 活動專屬儀表板 | S3：活動名稱與期間、九類圖卡 | **部分**。`frontend/apps/admin-web/src/App.tsx:239` 起有收件、待審、補件、Hold、付款異常 KPI；`:278` 預算表；`:323` 活動紀錄 | 現行以跨活動營運作業為主，缺參考的活動範圍與圖卡配置。大部分基本圖表可由既有報表資料呈現 |
| 登錄／審核狀態摘要 | S3 登錄狀態圖；S4 摘要選單 | **已有資料；部分呈現**。`backend/aspnet-core/src/Gigabyte.Cashback.Application/Operations/OperationsReportsAppService.cs:25` 有 `reviewStatus` 分組；`frontend/apps/admin-web/src/Reports.tsx:205` 維度選單及表格 | 缺狀態環形圖、各狀態占比與獨立報表入口。需使用自己的狀態語意，不直接改名為參考 Valid／Invalid |
| 交易／付款狀態摘要 | S3 Transactions by Status；S4 Status of Deliverables 選單 | **已有資料；部分呈現**。報表服務 `OperationsReportsAppService.cs:25` 有 `paymentStatus`；`Payments.tsx:164` 起付款明細 | 可以呈現自己的 Authorized／Submitted／Processing／Succeeded／Failed／Unknown。截圖不能證明 Ready for Processing 等同我方 Authorized，也不能證明 Deliverables 僅限銀行付款 |
| 國家摘要 | S4：Country of Purchase、Count、Percentage | **已有分組；部分呈現**。報表服務 `OperationsReportsAppService.cs:30` 區分活動市場、購買國、居住國、銀行國；`Reports.tsx:260` 分組表格 | 現行沒有獨立購買國報表的占比／地圖，但資料有基礎。不得把居住國或銀行國數量套成購買國 |
| 產品摘要與 Top 10 | S3 產品排行；S4 產品摘要選單 | **已有分組；部分呈現**。報表服務 `OperationsReportsAppService.cs:35` 產品、品類；`Reports.tsx:98` 產品名稱顯示 | 缺排行圖與獨立報表占比。須定義以申請案件數還是產品項目數排名；多產品案件不可混計 |
| 店家摘要與 Top 10 | S3 店家排行；S4 店家摘要選單 | **已有分組；部分呈現**。報表服務 `OperationsReportsAppService.cs:34` 項目層通路優先、案件通路 fallback；`Reports.tsx:105` 店名 | 缺排行圖、占比及獨立報表；必須保留每產品購買通路的來源 |
| 期間登錄報表 | S4：Registrations per period 選單 | **部分；參考細節無法確認**。報表服務 `OperationsReportsAppService.cs:36`／`:37` 已做月／ISO 週；`Reports.tsx:181` 送件日期區間 | 尚無日／季趨勢、圖表或可選日期基準。現行只用 SubmittedAt／UTC；不應假稱已支援購買日、核准日、付款日或活動時區 |
| Pivot：店家 × 國家 | S6 展開實際交叉表 | **欠缺**。現行報表服務 `OperationsReportsAppService.cs:25` 逐一做單維度 `GroupBy`，沒有雙維度輸出；報表 controller `OperationsController.cs:51` 無 Pivot 參數 | 單維度報表無法還原交叉分布，須新增查詢／回傳格式或明確受限的前端計算。並需定義百分比為列內、欄內或總體占比 |
| Pivot：產品 × 店家／國家 × 產品 | S6 的另外兩個選單 | **欠缺對應完整功能；參考內頁無法確認**。同上；既有案件 `Items` 與購買國可作未來資料來源 | 資料基礎已有，不能說完全沒收集產品／通路／國家；但目前沒有交叉報表 UI／API |
| Pivot：Marketing Data | S6 選單入口 | **部分資料；欠缺報表；參考內容無法確認**。`backend/aspnet-core/src/Gigabyte.Cashback.Application.Contracts/Operations/OperationsDtos.cs:176` 只明確有 MarketingAccepted；`Claims.tsx:246` 顯示同意值 | 可做行銷同意統計，不等同來源渠道／UTM／曝光轉換報表。需確認參考 Marketing Data 實際欄位後決定資料模型 |
| 活動完整明細表 | S5：案件編號、客戶識別／姓名、公司、登錄／購買日期、登錄狀態、產品／SN、購買國、購買金額、店家、經銷商、交易狀態／類型／金額、支付日期等可見欄位 | **部分**。`Claims.tsx:129` 隊列表有基本欄位；`:214` 申請人／購買資訊、`:257` 產品／SN 在單件詳情。`OperationsDtos.cs:227` ClaimDto 有案件 ID、狀態、金額與事件；`OperationsDtos.cs:132` 有購買資料 | 現行需逐件開啟，缺活動範圍的一列式完整明細報表；公司／經銷商／交易類型沒有明確專用欄位。現行沒有獨立 Customer ID DTO 欄位，不能把 Claim ID 當 Customer ID。支付成功時間可查事件，但不是明確的案件 PaidAt 欄位 |
| 明細欄位顯示、分頁、跳頁 | S5：Column visibility、橫向捲動、每頁筆數／跳頁 | **欠缺可選欄位及分頁；已有捲動容器**。`Claims.tsx:129` 固定欄位；`Reports.tsx:242` 固定報表表格；`OperationsAppService.cs:218` 案件 API 回全清單 | 大量案件使用者查閱較困難；前端分頁只能改善顯示，後續應考慮服務端分頁／篩選。單純樣式頁不代表已完成這個資料層改造 |
| 報表篩選與下載 | S4／S5／S6 Search Filters、Download Report | **已有基本條件與彙總 CSV；部分**。`Reports.tsx:21` 活動／市場／日期；`:114` 匯出；報表服務 `OperationsReportsAppService.cs:77` 匯出已選維度並留稽核 | 缺按產品／店家／購買國／狀態等多條件組合的報表篩選。既有 CSV 是彙總報表，付款 CSV 是付款指令，皆非 S5 的案件／產品明細 CSV。Benamic 下載格式未由圖片確認 |
| 產品組合摘要 | S4：Registrations by Product Combinations Overview 選單 | **部分資料；欠缺報表**。`OperationsDtos.cs:166` 有多產品 Items；現行報表只輸出單產品分組 | 需定義組合粒度、排序、重複產品及 quantity 語意後新增統計；不能相加單產品排行推得組合 |
| 唯一參與者與每人登錄數 | S3：Number of Registrations per Participant，Total registrations／Unique participants；S4 同名選單 | **部分規則；欠缺統計**。`OperationsAppService.cs:337` 有 OwnerId／Email 申請次數限制；報表只去重 ClaimId，`OperationsReportsAppService.cs:43` | 未回傳唯一申請者或每人申請數分布。需明確以帳號、標準化 Email 或其他客戶識別計數，避免把同人不同 Email／共用 Email 當成正確唯一人數 |
| 客服 Query Tracker／待處理詢問 | S1：View All Pending Queries；S3：Query Tracker 提示與客服選單 | **部分訊息與補件；欠缺工單流程**。`Claims.tsx:361` 案件訊息、`:362` 內部備註；`OperationsAppService.cs:465`／`:474` 記事件並排通知；`:437` 補件 | 缺獨立詢問 ID、分類、對話／回覆狀態、負責人、到期、跨活動待處理詢問佇列。`Notifications.tsx:85` 的通知 outbox 是發送佇列，不能視為客服待回覆清單 |
| Client Query／Customer Enquiry 類型統計 | S3 兩個獨立排行；S4 Customer Queries／Enquiry Types 選單 | **欠缺**。現行自由文字 action reason／message 沒有詢問類型 DTO 或兩種來源分類；報表維度不含 enquiry | 不具備分類資料就無法做可信排行；不能憑自由文字留言假造狀態詢問、銀行資料、發票、條款等分類數量 |
| 詐欺案件與風險防護 | S3 Fraud Protection in Effect 節省金額；S3～S6 Fraud Claims 選單 | **部分預防；欠缺正式 Fraud 報表**。`OperationsAppService.cs:337` 個人限制、`:339` 家戶限制、`:343` 互斥活動、`:352` SN 查重；`:441` Hold；報表有 `riskHold` | Hold 不等同確定詐欺、Rejected 不等同詐欺；沒有 FraudConfirmed、證據／分類／避免支付額等專用模型。現行「風險暫停件數」可呈現，不能宣稱是「反詐節省金額」 |
| 狀態說明 | S3～S6：Status Key 選單 | **部分；參考內頁無法確認**。`Reports.tsx:298` 有核准率、件數、幣別與周期指標說明；頁面有狀態 badge | 缺一個統一狀態字典／說明入口。若新樣式使用參考布局，仍應列我方狀態、轉移規則與指標公式 |
| 國家與幣別涵蓋 | S4 可見多國，總列數顯示 29；S6 多國交叉欄 | **部分且有範圍差異**。`frontend/packages/api-client/src/operations.ts:363` 目前 5 個市場；`CampaignConfigurationValidation.cs:11` 同樣只允許 DE／FR／IT／ES／NL，`:36` 要求 EUR | 若要接替參考活動的全部國家，此限制是業務範圍差距，不能只改下拉或樣式就完成；需確認所需市場、貨幣、銀行與規則後規劃 |

## 4. 我方已有、參考圖片不足以評斷的能力

不能因參考後台只展示報表，就忽略現行的作業與稽核功能：

| 現行能力 | 程式證據 | 說明 |
|---|---|---|
| 活動草稿／發布版本、複製、設定匯入／匯出、產品與通路 CSV、預檢 | `Campaigns.tsx:357`、`CampaignTransfer.tsx:35`、`CampaignRows.tsx:64` | 有持續管理活動的基礎；Benamic 圖片沒有管理表單，無法判定它有無同等功能 |
| 案件附件預覽、七項查核、補件修訂、規則快照 | `Claims.tsx:20`、`:382`、`:409`、`:410`、`:424`；`OperationsAppService.cs:424` | 審核與留痕已存在；對應的是我方作業流程，不需要為外觀重做一次 |
| 預算的 Buffer／Reserved／Approved unpaid／Paid／Available | `App.tsx:278` | 更細的資金承諾拆分已有；是否符合實際財務規則仍以本案驗收為準 |
| 付款授權、固定指令、批次 CSV＋manifest、人工提交與對帳、差額／未匹配／重複結果記錄、支付嘗試歷史 | `Payments.tsx:70`、`:289`、`:329`；`FinanceDetails.tsx:70`、`:123`；`OperationsFinanceAppService.cs:46`、`:64`、`:107` | 已有人工財務流程；不表示已呼叫銀行。Benamic 截圖的狀態與金額不能证明它支援銀行 API、自動對帳或相同控制 |
| 權限、敏感銀行值遮罩、報表匯出稽核、事件履歷 | `OperationsAppService.cs:61`、`:195`、`:218`；`OperationsReportsAppService.cs:79`、`:91`；`App.tsx:343` | 報表／作業仍需尊重現有權限與敏感資料限制 |
| SLA 逾期、首次審核逾期、歷史補件率、平均／中位審核與付款天數 | `OperationsReportsAppService.cs:47` 起；`Reports.tsx:254` 起 | 是既有營運指標；參考截圖未展示，不應移除以配合圖卡數量 |

現行對外連線的實際限制也要保留：`App.tsx:86` 的 UAT 提示明載銀行 API、Google sign-in 未連接；`Notifications.tsx:42`／`:88` 是開發通知模擬。這些不是從 Benamic 截圖推斷的差距，但會影響接替外包後台時的上線驗收。

## 5. 優先順序建議

### 本次範圍：參考樣式與現行功能並行比較

1. 保留原後台，另開參考樣式頁面與切換連結；讓使用者以同一組我方資料比較外觀和操作。
2. 採用使用者已驗證的顏色、階層、頁籤、活動入口、兩欄圖卡與表格布局；既有活動管理、審核、付款、報表及稽核仍接我方功能。
3. 已有數據的圖卡可由現行狀態／單維度資料轉成圖表；沒有分類／識別／事件模型的項目明確顯示尚無資料，不填入參考截圖的數量。
4. 本文件列出欠缺功能，作為後續範圍與驗收清單；本次不自動重建客服、反詐、Pivot 或擴增所有國家。

### 下一階段高優先：使用者日常最常查詢的報表

- **活動詳細報表**：活動與日期篩選、按案件／產品的粒度、可選欄位、分頁、受控 CSV。補足「找資料 → 查看 → 匯出」工作路徑。
- **基本摘要與鑽取**：審核狀態、付款狀態、購買國、產品、店家、期間。定義占比與去重方式，點圖表時保留活動與條件。
- **三種業務 Pivot**：先以 S6 的店家 × 購買國驗收，再擴產品 × 店家、購買國 × 產品；標明每格的計數粒度與占比分母。
- **市場範圍確認**：若營運需要原後台的國家涵蓋，先處理資料與規則支援；單改 UI 不足以解決。

### 再下一階段：需新增資料模型的能力

- **客服工單**：詢問來源／類型、回覆狀態、負責人、到期，再做待回覆佇列與 Top 10；應先確認 Client Query 與 Customer Enquiry 是否為不同角色的詢問。
- **參與者／產品組合分析**：採用明確的參與者識別，定義重送件、取消、補件與多產品如何計數。
- **反詐成效**：先定義何謂已確認詐欺、誰可確認、核定的避免支付金額、撤回／解除的處理方式，再做 Fraud Claims 和節省金額圖卡。
- **行銷資料交叉分析**：先取得 Marketing Data 的實際欄位與來源，不能用 MarketingAccepted 單一布林值代替完整行銷成效。

## 6. 實作與驗收時的口徑

- **狀態**：我方 Approved／Rejected／MoreInfoRequired／UnderReview／Cancelled 與參考 Valid／Invalid／Missing Info 有相近含義但未經流程確認；不要直接假設一對一。付款 Ready for Processing／Processed 同理。
- **分母與資料粒度**：現行報表 `Claims` 是去重案件數，`Items` 是產品項目數；同案可出現在多個產品／店家分組，不能將群組件數相加成唯一總案件數。僅以 SubmittedAt 有值的案件進報表，草稿排除。
- **幣別**：現行按 Currency 分組。不得把多幣別加總成一個金額；參考的 EUR 節省總額沒有可見匯率規則。
- **時間**：現行日期區間為 `[from, to)`、UTC、送件時間；百分比／趨勢／付款天數應標明口徑，勿改成模糊「截止日」而改變包含範圍。
- **可追溯性**：既有匯出會重新查詢最新符合條件的資料、產生 GeneratedAt、留下 ReportExported 事件；不是下載舊畫面快照。
- **欠缺不偽裝成零**：客服分類、反詐節省額、唯一參與者、行銷來源等未建模時標示未提供。沒有資料不等於實際 0 件／0 元。
- **規格與實作分開**：`docs/Reporting-Dimensions.md` 是需求設計，不能當作功能已完成證據。例如前端 labels 有 `series`，但現行報表服務維度清單沒有 `series`；本報告不將 Series 分組計為已實作。

需另外取得的參考內容：Search Filters 展開畫面、下載檔案範例、Compare Campaigns 結果、Query Tracker／Customer Service／Fraud Claims／Status Key 內頁、其他 Pivot 與 Detailed Deliverables Report。這些可在後續功能對齊時補充；不影響本次按現有參考完成另版前端樣式。
