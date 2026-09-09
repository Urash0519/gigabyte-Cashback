# GIGABYTE Cashback 活動平台系統分析文件（SA）

版本：0.6 Spec Aligned／2026-09-09。

## 1. 文件定位與範圍權威

本 SA 以 [Phase 1 Development Spec v0.2](Phase1-Development-Spec.md) 為主，整理業務背景、資料責任與設計理由；功能 ID、驗收及開發範圍以 Spec 為準。不再將 Spec 的必要項目降為「尚待核准的分析建議」。2026-09-09 使用者決策優先於舊稿、原型或參考站行為。

已確認先做 Q1 類型、德國／法國／義大利／西班牙／荷蘭的第一版；同張發票支援多產品。Campaign、Claims、人工審核／補件、預算、付款人工作業及常用報表均直接開發。銀行 API 與真實 Google 登入本版排除，其他需求不因尚未選銀行而等待。

前台與後台預計串 Google 第三方登入；目前提供一個「模擬登入」按鈕及登出，身份為 `yoyo.chen@gigabyte.com`。本版不建立獨立 Tracker 帳密、不寄初始密碼、不做忘記密碼，也不把 AORUS SSO 當成已選定的登入方案。Google 身份與 AORUS 會員資格是不同概念；本版會員、SN、RMA 等採可追蹤人工查核。

正式矩陣尚未核定的項目使用可配置且明示的 UAT 樣本，不阻擋本版功能開發。內部驗收與正式營運分開；模擬身份、樣本銀行資料及人工輸出不能宣稱已驗證真實收款或身份。

## 2. 業務背景與承接責任

既有 Agency 除活動網站，也承接審核、客服及 Cashback 代付款等作業。內部平台目的是重複利用活動設定與工作流程，減少每檔重建；平台建成不等於 IT 自動承接全部營運職責。

業務負責活動、產品／通路、金額、內容及條款；營運負責審核、补件及客服；財務負責核放、資金、付款人與對帳；IT 負責平台、權限、migration、維運與稽核。第一版可用同一測試身份驗收各功能，正式上線前再指派實際角色與資料範圍。

## 3. 參考資料與證據範圍

完整來源索引見 [來源檢閱](Cross-Region-Promotion-Source-Review.md)；本次圖片逐欄對照見 [Legacy Field Mapping](Legacy-Field-Mapping.md)。舊資料合計 110 份（1 PDF、1 DOCX、108 PNG）。本次重新實際檢視後台總覽、兩季六張 Claim 表單、兩張 reseller 行為與 Tracker／Customer Login 圖片。

| 來源 | 可確認 | 不可推論 |
|---|---|---|
| Benamic `Clients Log In.png` | Promotion Name、Type、Period、Countries；Active／Confirmed／Archived；Search Customer、Compare Campaigns、Pending Queries、活動報表入口 | 沒有 Campaign 建立／編輯、Claims 後台詳情或報表內頁，不能虛構舊內頁欄位 |
| Q1／Q4 Claim Form | 個人、銀行、產品、購買、附件、同意、多產品新增／移除 | 未展開下拉選項，不代表取得全部國家銀行欄位 |
| Reseller 圖 | 可搜尋跨國合格通路，任意文字被阻擋 | 不代表本版正式矩陣已核定 |
| Tracker／Customer Login | Reference 查詢、登入補件、舊 Username／Password | 舊帳密設計已由本次模擬登入／未來 Google 決策取代 |

舊資料對活動規則的參考：Q1／Q4 購買後等待 14 天、同發票多產品、每品類／每人／每戶限制；Q4 有 A／B 加碼但 Q1 沒有。Q4 條款截止日期存在矛盾，Q1 橫跨夏令時間但文字標示 CET，審核與付款 SLA 也有不同；不得直接把舊值當新活動固定程式規則。Q1 表單仍有 CPU／整機序號提示，不據此擴張本版產品 Scope。

## 4. 分期與交付邊界

| 階段 | 交付 |
|---|---|
| 本版 | 前後台模擬登入；Campaign 建立／複製／編輯／驗證／發布／比較；Claims 全欄位、多產品、附件與同意；追蹤、補件、審核、Hold、客服、預算 Ledger；人工付款核放、批次、結果、對帳；報表與稽核 |
| 後續身份／資料介接 | Google 第三方登入、安全綁定既有身份；會員資格、本人產品、SN／RMA API 另依可用契約導入 |
| 選銀行後 | 銀行／付款供應商 API、Webhook、自動付款及銀行格式映射；不是把本版人工對帳延後 |

維持 Spec 原定排除：OCR／AI 自動拒絕、Q4 組合加碼、任意頁面設計器、完整歷史資料遷移、進階 BI／匯率分析與自動追回。S/P1 項目提供基本版本；有限公開查詢可只顯示一般進度，個資與補件仍需登入。

正式營運仍須核定活動矩陣與條款、實際營運角色、會員資格方法、付款承接與格式、安全／備援／資料保存。這些是上線配置與作業條件，不是停止第一版開發的前置許可。

## 5. Campaign 管理

Campaign 舊清單四欄必須保留：名稱、類型、期間、多國；保留 Active／Confirmed／Archived 檢視、客戶搜尋、活動比較、待處理查詢及活動報表入口。Confirmed 在新系統定義為已確認／發布尚未開始的檢視，屬本案設計，不宣稱已知道旧站完整狀態機。

本版追加 Code／Slug、Owner、年度季度、語言、幣別、時區、購買／申請期間、等待天數、SLA、預算與 Buffer、名額、每人／戶／品類限制、互斥活動、產品系列／品類／型號／金額、通路與跨境矩陣、素材、FAQ、條款／隱私版本及客服設定。

建立草稿不影響已發布活動。複製建立新活動，不复制既有案件、Ledger 或付款；發布先驗證規則並生成不可變 CampaignVersion；已送件 Claim 持續引用原版本。活動比較同時包括設定差異及相同時間／幣別口徑的成效。

## 6. Claim／Tracker／審核

### 6.1 欄位完整性

| 分組 | 本版必要欄位 |
|---|---|
| 個人 | Title（選填）、First Name、Last Name、Address、City、Postal Code、Residence Country、Mobile Number、Email、Confirm Email input |
| 銀行舊欄位 | Bank Country、Account Holder Profile Type、Full Bank Account Number、Sort Code（按銀行國要求） |
| 銀行追加 | Account Holder Name、IBAN、BIC／SWIFT 按配置提供；不能誤稱圖片已顯示 |
| 購買 | Purchase Country、Date、Retailer、Invoice Number、Purchase Amount／Currency；發票及通路需連回各產品 |
| 產品 | Series、Product／SKU、Category、Serial Number；原始／核定 Cashback；多明細新增／移除 |
| 文件 | 購買證明及每項 SN 照片；共用發票仍保留明細關聯、用途、版本與存取紀錄 |
| 同意 | 條款／隱私必要、行銷選填；版本、時間及證據 |
| 作業 | Reference、CampaignVersion、Market、Language、Review、Hold、Payment 各自狀態、負責人、理由、期限與時間軸 |

Confirm Email 只驗證兩次輸入一致，不存第二份永久信箱。資料模型的 Email 與模擬登入者關聯；即使未串 Google，後端也不能只信任客戶端宣稱的身份。Title 與 Account Holder Profile Type 下拉未展開，選項應標示為本版配置樣本。

### 6.2 流程與檢核

活動公開瀏覽 → 模擬登入 → 伺服器 Draft → 填寫與附件 → 檢核與送出 → Reference／我的案件。通路必須選有效識別碼；伺服器依版本計算金額、日期／等待天數、限制、SN 去重與預算占用。不能相信前端自行計算的 Cashback。

`Submitted → UnderReview → MoreInfoRequired → UnderReview → Approved／Rejected`，安全條件下可 `Cancelled`。核准、拒絕、要求補件均記理由；補件保留舊值、附件版本並重新查核。第一版採整單決策，必要時要求補件更正；不假稱已核定部分付款策略。

Risk Hold 與審核狀態分開。核准後仍可 Hold，阻擋新付款；解除必須留理由，不自動付錢。人工查核會員資格、SN、發票、通路、日期及 RMA／DOA 的來源、結果、時間與操作者；不能將所有退換貨自動拒絕。

我的案件僅可讀取當前身份的資料；Reference 公開查詢不顯示個資、銀行、文件或補件内容。取消不得釋放處理中／Unknown／已付承諾。對外訊息與內部備註分開，客服／補件／通知歷史可追溯。

## 7. 預算與人工付款

`Available = Budget − Buffer − Reserved − ApprovedUnpaid − Paid`。以原幣最小貨幣單位記帳；不同幣別不相加。送件 R、核准 R→A、確認支付 A→P、合法拒絕／取消釋放；Failed／Unknown 不釋放承諾。每次 Reserve／Approve／Pay／Release／Adjust 留不可變 Ledger，並使用 ABP Unit of Work／資料庫一致性控制處理併發。

人工付款閉環：已核准且無 Hold → 財務核放 → 固定 PaymentInstruction／對象與金額快照 → 批次輸出 → 人工交付 → 結果登錄／匯入 → 逐筆對帳 → 通知。

- 狀態分開保存 `Ready、Authorized、Submitted、Processing、Unknown、Succeeded、Failed`。
- 同邏輯款項固定 ID／冪等鍵；重試只增加 Attempt。Unknown 先查核，不可再次批量送出。
- 批次含 ID、版本、逐筆指令、總額／幣別、檔案雜湊、操作者與交付紀錄；重複下載不是新付款。
- 提供通用人工 CSV，不聲稱符合尚未選定銀行的匯款檔。人工回填 Reference、日期、金額、幣別與憑證，部分成功逐筆處理，未匹配／金額／幣別差異進例外。
- 建立檔案、寄信或受理均不等於 Paid；須確認支付結果才轉 Succeeded。
- 銀行 API、Webhook、真實銀行測試全部排除本版。Tremendous 僅是歷史候選，不是已選銀行，也不是必須先完成的開發依賴。

## 8. Reports

依 [Reporting Dimensions](Reporting-Dimensions.md) 定義六組：營運總覽、活動比較、案件／產品／通路、預算、人工付款／對帳、客服／SLA。參考 Talon.One、Voucherify 官方 promotion analytics 概念，再轉為本案的審核／付款口徑。

共用維度為活動／版本、時間基準與粒度、市場／居住／購買／銀行國、語言、幣別、審核狀態、Hold、品類／Series／SKU、通路、負責人、理由／SLA、付款狀態／批次。件數以 distinct ClaimId；產品件數另列；核准率分母為已核准＋已拒絕；金額按原幣；沒有曝光／完整銷售母體不宣稱 ROI 或活動轉換率。

報表標示篩選、AsOf、GeneratedAt、時區與日期欄位；篩選下鑽一致，匯出受權限與稽核控制。敏感銀行欄位不進一般報表，缺資料顯示「未提供」而非捏造指標。

## 9. 資料與工程要求

主要 aggregate／entity：Campaign／Version／Eligibility、Claim／Item／Applicant identity、Bank profile、Attachment、Validation／Hold、CaseMessage／Consent／Notification、BudgetLedger、PaymentInstruction／Attempt／Batch／Reconciliation、Audit。完整責任依 Spec 第 7、8、13 節。

所有後端遵循 ABP 分層、Domain invariants、Application Service／Contracts、repository、permission、UOW、auditing 與一致例外處理。資料庫 schema 更動必须提交 EF Core migration 及 ModelSnapshot，透過 DbMigrator 套用，不以 EnsureCreated 取代 migration。

敏感資料加密、遮罩與存取稽核，檔案私有且受授權；必要惡意檔案檢查或隔離。模擬登入限定明確開發／UAT 設定，Production 禁止意外啟用。第一版稽核 actor 固定測試身份，不把它當多人權限驗收已完成的證據。

Markdown 文件加入版控；`.gitignore` 排除依賴、bin／obj、建置／測試產物、快取、秘密與本機設定；完成開發更新 README，說明啟動、migration、測試、模擬身份、人工付款流程、實際完成與限制，commit 並推送 GitHub。

## 10. 驗收與待核定值

驗收依 Spec FE-01～18、BE-01～20、舊欄位對照與報表公式。至少測 Campaign 發布快照、Claim 全欄位／多產品／附件、未知通路／重複 SN／不足預算、補件與 Hold、核准→付款→人工結果→對帳、重試／Unknown、報表與 Ledger 核對、migration 升級與測試身份控制。

正式產品／通路／跨境、語言／時區／期限、每戶限制、銀行欄位與格式、營運人員、保留政策及容量等使用可配置樣本繼續實作；上線前核定。銀行選型與 Google OAuth 改列後续介接，不再作為本版開工門檻。實作進度及測試證據由 README／交付紀錄反映，本 SA 不將要求清單等同完成清單。

## 11. 版本紀錄

| 版本 | 日期 | 變更 |
|---|---|---|
| 0.2 | 歷史稿 | 初步假設，見 [原稿](archive/Gigabyte-Cashback-SA-v0.2.md) |
| 0.3 | 2026-08-27 | 依舊站資料及訪談修訂，見 [原稿](archive/Gigabyte-Cashback-SA-v0.3.md) |
| 0.4 | 2026-08-27 | Q1、五國與內部驗收範圍 |
| 0.5 | 2026-09-02 | 曾規劃免登入／AORUS Email／追蹤帳號、P2 AORUS SSO；身份方案已被 v0.6 決策取代 |
| 0.6 | 2026-09-09 | 以 Spec v0.2 為主；舊欄位完整映射；前後台模擬登入、未來 Google；銀行 API 排除，其餘付款及業務先做第一版；報表維度、ABP、migration、文件版控、README／GitHub 交付 |
