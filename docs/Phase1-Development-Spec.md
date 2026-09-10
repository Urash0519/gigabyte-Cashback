# GIGABYTE Cashback Phase 1 Development Spec

版本：0.3
日期：2026-09-10
依據：2026-09-09 使用者決策；本 Spec 為開發範圍主文件，SA 依本文件同步。舊站欄位見 [Legacy-Field-Mapping.md](Legacy-Field-Mapping.md)，報表見 [Reporting-Dimensions.md](Reporting-Dimensions.md)。

## 1. 文件目的

2026-09-10 後續 UAT 決策：後台加入獨立英文／繁體中文介面切換；UAT 入口移除密碼，任何訪客可透過既有模擬登入按鈕操作前後台。正式登入需求不變。詳見 [後台繁體中文與公開 UAT](Admin-Language-and-Open-UAT.md)。

2026-09-10 決策追加：未送出 Draft 於開啟與送出前檢查最新發布版本，先提示使用者確認才套用；保留填寫資料與附件，重新同意條款／隱私。已送出與 MoreInfoRequired 等其他階段保留送出時版本。前台新增繁體中文介面與申請語言，送出錯誤須在操作區可見並自動聚焦。完整規則與驗收見 [草稿版本與語系](Draft-Version-and-Language.md)。

本文件將已確認的 Phase 1 Scope 拆成可開發的前台、後台、共用服務與資料規格。M/P1 為第一版必要需求；S/P1 亦先提供基本版本，不以尚未選定銀行或正式矩陣為理由暫停其他功能。未確認值使用明確標示且可配置的 UAT 樣本，正式上線前再核定。Prototype 03 只用於流程與介面驗收，不是正式資料、安全或付款能力。

## 2. 已確認的範圍

- 活動類型：Q1 類型 Cashback；同張發票可包含多個不同品類產品。
- 市場：德國、法國、義大利、西班牙、荷蘭。
- Phase 1 身分：前台與後台提供「模擬登入」按鈕，以 yoyo.chen@gigabyte.com 作為登入者及稽核身份；可登出。本版不實作 Google OAuth，也不建立獨立 Tracker 密碼。
- Phase 1 收款資料：網站直接收銀行資料；實際付款方與串接方式待確認。
- 後台責任：本系統直接建立、複製、編輯、發布與比較 Campaign，並控制預算。
- 後續登入：前台與後台均預計串接 Google 第三方；會員資格／本人已註冊產品是獨立後續介接，不預設 Google 登入等於 AORUS 資格。
- 銀行 API、自動付款與銀行 Webhook 明確排除本版；核放、固定付款指令、批次匯出、人工結果登錄／匯入、異常與對帳全部先做一版。產生付款檔不等於實際付款。

## 3. 優先級定義

| 等級 | 定義 |
|---|---|
| M/P1 | Phase 1 正式營運不可缺少 |
| S/P1 | 建議 Phase 1 納入；可由業務核准的人工作業替代 |
| P2 | 第二階段會員／產品整合 |
| Later | 後續優化或供應商介接 |
| Out | 目前不做 |

## 4. 前台功能

| ID | 功能 | 優先級 | 功能規格／完成條件 |
|---|---|---|---|
| FE-01 | 活動首頁 | M/P1 | 依市場與語言顯示進行中、即將開始、已結束活動；顯示可申請／停收狀態；活動停止收件後仍保留查詢與客服入口。 |
| FE-02 | 活動詳情 | M/P1 | 顯示購買期間、申請期間、等待天數、產品／金額、合格通路、FAQ、條款版本及申請入口；內容必須來自已發布 CampaignVersion。 |
| FE-03 | 市場與語言 | M/P1 | 分開保存活動市場、居住國、購買國、銀行國與語言；不可由其中一欄推導其餘欄位。正式語言、幣別矩陣待核定。 |
| FE-04 | 開始申請 | M/P1 | 活動可公開瀏覽；需身份時由模擬登入按鈕建立 yoyo.chen@gigabyte.com 工作階段，再建立伺服器端 Draft；不得只靠前端狀態保存。 |
| FE-05 | 申請人資料 | M/P1 | 保留 Title、First／Last Name、Address、City、Postal Code、Residence Country、Mobile、Email、Confirm Email；見欄位對照。Email 與模擬身份關聯；AORUS 資格另列人工查核，不收集密碼。 |
| FE-06 | 銀行資料 | M/P1 | 依銀行國、幣別與付款流程顯示所需欄位；傳輸及儲存加密；預設遮罩；禁止出現在 URL、一般日誌、一般通知及非敏感報表。 |
| FE-07 | 購買資料 | M/P1 | 填寫購買國、日期、發票編號及實付金額；通路須從 CampaignVersion 的有效清單搜尋選取，自由文字不直接視為合格。 |
| FE-08 | 多產品明細 | M/P1 | 同一 Claim 可新增多項產品；輸入型號與 SN；檢查產品資格、每品類數量、重複 SN、每人／每戶及互斥活動規則；金額由規則計算，不信任前端傳入金額。 |
| FE-09 | 文件上傳 | M/P1 | 上傳購買證明與每項產品 SN 照片；限制副檔名、大小與數量；私有儲存、惡意檔案檢查、授權下載及存取紀錄。格式與 8 MB／TIF 相容性待核定。 |
| FE-10 | 申請檢核與送出 | M/P1 | 顯示申請人、遮罩銀行資料、購買與產品摘要；條款／隱私同意為必要，行銷同意獨立且選填；送出時在同一交易中完成規則複核、SN／名額占用、預算暫占與 Claim 建立。 |
| FE-11 | 收件結果 | M/P1 | 回傳不可猜測的 Claim Reference，關聯目前模擬身份並提供我的案件入口；不得顯示完整銀行資料。 |
| FE-12 | 有限公開查詢 | S/P1 | 只以 Claim Reference 查詢時最多顯示一般進度，不顯示姓名、Email、附件、銀行資料、補件內容或可用於冒用的資訊。可選擇完全不提供公開查詢。 |
| FE-13 | Tracker 模擬登入 | M/P1 | 一鍵登入／登出，以固定測試 Email 關聯本人案件；清楚標示模擬模式。Google OAuth、密碼、忘記／重設、MFA 本版不實作。 |
| FE-14 | 我的案件 | M/P1 | 登入後僅能存取本人 Claim；顯示 Claim Review、Risk Hold、Payment 狀態與時間軸，三種狀態不得混成單一狀態。 |
| FE-15 | 補件與更正 | M/P1 | 依後台要求補文件或更正允許欄位；保留原值、新值、附件版本、時間與理由；重新執行受影響規則，不直接覆蓋歷史。銀行資料變更另走受控流程。 |
| FE-16 | 取消請求 | M/P1 | 使用者提出原因；若尚無付款風險，可取消並釋放預算；已送出、處理中、Unknown 或已支付則轉人工處理。 |
| FE-17 | 通知與客服 | M/P1 | 收件、補件、決策、付款進度／異常通知；顯示客服入口；保留通知模板版本、發送結果與重寄紀錄。 |
| FE-18 | 後續 Google 登入／本人產品 | P2 | Google 第三方取代模擬登入；本人會員與註冊產品另依授權介接；需支援既有 Claim 安全綁定。 |

### 4.1 前台建議頁面

| Route | 頁面 |
|---|---|
| `/` | 市場／語言與活動首頁 |
| `/campaigns/{slug}` | 活動詳情、產品、通路、FAQ、條款 |
| `/campaigns/{id}/claim` | 多步驟申請表單 |
| `/claims/submitted` | 收件結果與我的案件入口 |
| `/track` | 有限 Claim Reference 查詢與 Tracker 登入 |
| `/account/claims` | 本人案件清單 |
| `/account/claims/{id}` | 案件詳情、補件、更正、取消與客服紀錄 |
| `/account/security/*` | 模擬登入與登出 |

## 5. 後台功能

| ID | 功能 | 優先級 | 功能規格／完成條件 |
|---|---|---|---|
| BE-01 | 後台登入與權限 | M/P1 | 本版一鍵模擬登入 yoyo.chen@gigabyte.com；正式 Google 第三方後續串接。後端仍以 ABP permission 定義至少區分 Campaign、Reviewer、Support、Finance、System Admin、Auditor；功能權限與可看市場／活動資料範圍分開。 |
| BE-02 | 營運總覽 | M/P1 | 顯示收件、待審、補件、Hold、核准未付、付款異常、預算及 SLA 待辦；每項數字可下鑽至對應清單。 |
| BE-03 | Campaign 建立／複製 | M/P1 | 從後台直接建立空白活動或複製既有活動；草稿不影響線上活動、不占預算；特殊版型不包含於通用 Campaign 設定。 |
| BE-04 | Campaign 編輯 | M/P1 | 保留舊 Promotion Name／Type／Period／Countries、Active／Confirmed／Archived 清單；設定名稱、類型、Owner、年度／季度、市場、語言、幣別、時區、購買／申請期間、等待天數、限制、產品、金額、通路、預算、名額、Buffer、條款、FAQ、通知內容與素材。 |
| BE-05 | Campaign 驗證／發布 | M/P1 | 發布前檢查必填、日期、重複規則、預算、產品／通路與內容完整性；發布需授權及理由；產生不可變 CampaignVersion；既有 Claim 永遠引用送件當時版本。是否兩級簽核待確認。 |
| BE-06 | Campaign 比較 | M/P1 | 比較兩個活動或版本的市場、期間、規則、產品／金額、通路、預算、名額、內容及條款差異；另提供件數、金額及成效比較。 |
| BE-07 | 產品／通路維護 | M/P1 | 逐筆維護合格產品、品類、金額與通路有效期；批次匯入、格式檢查、差異預覽為 S/P1，資料量大時升為 Must。 |
| BE-08 | 案件清單 | M/P1 | 依活動、市場、狀態、Hold、產品、通路、日期、SLA 搜尋／篩選／排序；明確區分 Claim 數與 ClaimItem 數；匯出依角色遮罩。 |
| BE-09 | 案件詳情 | M/P1 | 顯示規則快照、申請資料、遮罩銀行資料、產品、SN、附件、檢核、金額、狀態與完整時間軸；未遮罩銀行資料與附件檢視留稽核。 |
| BE-10 | 人工檢核 | M/P1 | 記錄會員資格、發票／金額、SN 照片、日期／通路、重複、RMA／DOA 等檢核的來源、結果、時間、操作者與備註。P1 不依賴 OCR 或產品 API。 |
| BE-11 | 審核決策 | M/P1 | 支援核准、拒絕、要求補件；理由必填；補件後回待複核；未完成必要檢核或存在 Hold 不得核准。第一版以整單核准／拒絕或要求補件為基本流程；可配置逐項結果但調額須重新計算預算並保留理由。 |
| BE-12 | Risk Hold | M/P1 | Hold 與 Claim Review 狀態分離；可在核准後、付款前加 Hold；新增／解除均需權限與理由，解除不自動付款。 |
| BE-13 | 客服與案件訊息 | M/P1 | 對外訊息與內部備註分開；查看 Tracker／通知紀錄；本版查看模擬身份與案件關聯，不建立密碼重設功能。 |
| BE-14 | 預算控制 | M/P1 | 以最小貨幣單位記帳；分開 Budget、Buffer、Reserved、Approved Unpaid、Paid、Available；交易式占額；達限停收；調額、重開及釋放均留 Ledger 與 Audit。 |
| BE-15 | 付款核放 | M/P1 | 財務角色從已核准且無 Hold 的案件建立不可變 PaymentInstruction；包含固定 ID／冪等鍵、對象版本、金額、幣別及授權紀錄。建立檔案不等於已付款。 |
| BE-16 | 批次與人工交付 | M/P1 | 產生批次 ID、逐筆付款 ID、版本、總額、檔案雜湊、操作者與交付紀錄；第一版提供通用人工 CSV 交換格式並標示非銀行專用格式，後續選定銀行再映射；重複下載不可建立第二筆付款。 |
| BE-17 | 付款結果與對帳 | M/P1 | 分開 Ready、Authorized、Submitted、Processing、Unknown、Succeeded、Failed；支援逐筆結果登錄／匯入、憑證、未匹配與金額／幣別差異；Unknown 禁止重送。 |
| BE-18 | 報表 | M/P1 | 案件／審核、產品／通路／市場、預算、付款／對帳、客服／SLA；依活動、市場、狀態、產品、通路、日期篩選；標示統計時間基準、時區與更新時間。 |
| BE-19 | 稽核 | M/P1 | 不可由一般管理介面刪改；涵蓋 Campaign 發布、預算、案件更正、審核、Hold、付款、匯出、權限及敏感資料檢視；保存 actor、time、target、before／after 或摘要、reason、request correlation。 |
| BE-20 | 系統維運 | M/P1 | 通知失敗、付款 Unknown、額度／資金不足、SLA、背景工作失敗告警；健康檢查、集中監控、備份還原與營運手冊。容量、RPO／RTO 待核定。 |

### 5.1 後台建議頁面

| Route | 頁面 |
|---|---|
| `/admin` | 營運總覽與待辦 |
| `/admin/campaigns` | Campaign 清單、建立、複製與比較 |
| `/admin/campaigns/{id}` | 草稿／版本設定、驗證、發布與異動紀錄 |
| `/admin/claims` | 案件工作佇列 |
| `/admin/claims/{id}` | 案件、附件、檢核、Hold、決策與客服時間軸 |
| `/admin/payments` | 應付清單、付款指令、批次與核放 |
| `/admin/reconciliation` | 結果匯入、Unknown／Failed 與差異處理 |
| `/admin/reports` | 基本報表及受控匯出 |
| `/admin/audit` | 稽核與敏感存取紀錄 |
| `/admin/access` | 角色、資料範圍與權限管理 |

## 6. 共用業務規格

### 6.1 Claim 狀態

`Submitted → UnderReview → MoreInfoRequired → UnderReview → Approved／Rejected`

- 使用者可在安全條件下轉為 `Cancelled`。
- 補件不直接核准；必須回到待複核。
- Claim Review、Risk Hold、PaymentInstruction 與通知狀態分開保存。

### 6.2 Payment 狀態

`Ready → Authorized → Submitted → Processing → Succeeded／Failed`

- 任一步驟可因無法確認結果進入 `Unknown`；查核前不得重送。
- `Failed` 經確認後可用相同 PaymentInstruction ID 新增 Attempt。
- Email 已寄送、供應商已受理與銀行已入帳是不同事件。

### 6.3 預算公式

`Available = Budget − Buffer − Reserved − ApprovedUnpaid − Paid`

- Claim 原子化送出後進入 Reserved。
- 核准由 Reserved 移至 ApprovedUnpaid。
- 已確認付款由 ApprovedUnpaid 移至 Paid。
- 付款 Failed／Unknown 不釋放承諾。
- 合法取消／拒絕依原 Ledger 反向異動，不直接覆寫餘額。

### 6.4 關鍵驗證

- Campaign 已發布、活動市場可用、申請期間有效且尚有名額／預算。
- 購買日期、等待天數、購買國與合格通路符合 CampaignVersion。
- 每品類上限、同張發票、每人／每戶、SN 正規化後的重複與跨活動互斥。
- 所有金額由伺服器依 CampaignVersion 計算。
- 條款／隱私版本與同意時間必須保存；行銷同意不得阻擋送件。
- 並發送件時，SN、名額與預算必須使用資料庫交易或等效一致性控制。

## 7. 最小資料模型

| Aggregate／Entity | 主要內容 |
|---|---|
| Campaign, CampaignVersion | 狀態、Scope、規則、內容、條款、期間、預算設定與發布快照 |
| ProductEligibility, RetailerEligibility | CampaignVersion 對應產品／品類／金額與通路／國家／有效期間 |
| Applicant, IdentityLink | 內部識別、Email、模擬登入 provider 與資格查核證據；後續 Google subject 綁定 |
| TrackerIdentity | Claim 所有人、Email、provider、工作階段；本版固定模擬身份，不保存 Tracker 密碼 |
| Claim, ClaimItem | 版本快照、申請人、購買、產品、SN、原始／核定額與 Review 狀態 |
| BankAccount／PaymentProfile | 加密欄位、遮罩值、欄位版本、驗證狀態與存取政策 |
| Attachment | 私有物件 ID、用途、版本、雜湊、掃描狀態與存取紀錄 |
| ValidationResult, RiskHold | 查核來源、結果、操作者、時間及解除歷程 |
| CaseMessage, Notification, Consent | 對外／內部訊息、發送、重寄與同意版本 |
| BudgetLedger | Reserve、Approve、Pay、Release、Adjust 等不可變異動 |
| PaymentInstruction, PaymentAttempt, PaymentBatch | 邏輯付款、核放、冪等鍵、嘗試、批次與交付紀錄 |
| Reconciliation, ProviderEvent | 原始結果、驗證、去重、配對、憑證及差異處理 |
| AuditEvent | 權限與重要操作的不可改寫稽核事件 |

## 8. 建議 API 邊界

實際 URI 可依使用框架調整；以下定義責任而非固定技術契約。

| Domain | Commands／Queries |
|---|---|
| Public Campaign | 查詢市場活動、已發布版本、產品、通路、FAQ 與條款 |
| Claim Intake | 建立 Draft、上傳附件、驗證 Draft、送出 Claim |
| Tracker Identity | 模擬登入、登出、取得目前身份及本人 Claims；Google OAuth 後續 |
| Customer Case | 查詢本人案件、補件、更正、取消請求與客服訊息 |
| Campaign Admin | 建立、複製、編輯、驗證、發布、暫停、比較及版本查詢 |
| Review | 工作佇列、檢核、要求補件、Hold、核准與拒絕 |
| Budget | Ledger 查詢、調整、門檻與可用額；不提供任意直接改餘額 API |
| Payment | 建立核放、批次、結果登錄／匯入、Unknown 查核與安全重試 |
| Reporting | 具資料範圍的查詢與非同步匯出 |
| Audit／Operations | 稽核查詢、通知重送、異常待辦與健康狀態 |

所有 mutation 應使用權限檢查、樂觀並行版本或等效衝突控制、冪等鍵、稽核與一致的錯誤碼。附件採短效簽名 URL 或經應用授權的串流下載；不可設為公開物件。

## 9. 非功能需求

| 領域 | Phase 1 最低要求 |
|---|---|
| Security | TLS、開發環境限定的模擬登入、ABP 最小權限、Secrets 管理、輸入驗證、CSRF／XSS／注入防護、依賴與映像掃描 |
| Sensitive data | 欄位級加密或等效保護、預設遮罩、未遮罩權限、敏感存取稽核、日誌脫敏、非正式環境禁用真實資料 |
| Reliability | 交易一致性、Outbox／可靠事件、背景工作冪等、付款 Unknown 安全處理、備份還原演練 |
| Observability | Correlation ID、結構化非敏感日誌、Metrics、Tracing、健康檢查與可操作告警 |
| Accessibility | 鍵盤操作、焦點、標籤、錯誤摘要、色彩對比及行動版基本驗收 |
| Privacy | 告知／同意版本、保存／刪除政策、個資權利請求與受控匯出；實際規範由公司法務／資安核定 |
| Performance | 目標流量、尖峰送件、附件量、報表規模及 SLO 待 D17 核定後量化 |

## 10. Phase 1 不包含

- 真實 Google 第三方登入、獨立 Tracker 帳密／重設、AORUS SSO、本人已註冊產品自動帶入、會員／SN／RMA API 自動查核。
- Tremendous 或其他付款供應商正式 API、自動付款及 Webhook。
- OCR、自動文件辨識、AI 自動拒絕。
- Q4 A／B 組合加碼、任意頁面設計器、完整舊歷史資料遷移。
- 進階 BI、跨幣別匯率分析、自動追回已支付款項。

## 11. 第一版可配置樣本與正式營運待定值

下列缺口不阻擋本版開發，採可配置樣本與人工方式完成工作流程；必須標示樣本，不能宣稱已取得正式規則或已完成真實介接：

1. 正式產品、品類、Cashback 金額、通路與跨境矩陣。
2. 五國語言、活動／付款幣別、時區、14 天算法、申請／補件／審核／付款 SLA。
3. 正式 Google OAuth 設定與會員資格核對方法；本版固定模擬身份。
4. 每人、每戶、每品類、SN、跨 Campaign 互斥與例外規則。
5. 部分產品不合格時整單拒絕或移除後重算。
6. 各國銀行欄位、付款檔格式、實際付款人、核放與對帳 SOP。
7. Campaign 發布是否兩級簽核，以及各角色可管理的市場／活動範圍。
8. 正式個資／銀行／附件保存期限、刪除、備份、未遮罩存取與法務／資安要求。
9. 預估活動量、尖峰流量、附件大小／數量、報表規模、RPO／RTO 與維運窗口。
10. 舊 Agency 未結案件、客服信箱、網域與資料交接方式。

## 12. 建議開發切片

1. **Foundation**：專案骨架、環境、身分／權限、資料庫、物件儲存、Audit、通知介面與 CI/CD。
2. **Campaign vertical slice**：Campaign 草稿、產品／通路、預算設定、版本發布與公開活動頁。
3. **Claim vertical slice**：模擬身份 Draft、個人／銀行／購買／產品／附件、交易式送出與收件通知。
4. **Tracker vertical slice**：模擬登入／登出、本人案件、補件、更正、取消與客服訊息。
5. **Operations vertical slice**：案件佇列、人工檢核、補件、Hold、核准／拒絕與完整歷程。
6. **Finance vertical slice**：BudgetLedger、付款核放、批次、人工結果、Unknown／Failed 與對帳。
7. **Reporting and hardening**：報表、受控匯出、告警、效能、安全、備援與端到端驗收。

每個切片都需包含 API、UI、權限、稽核、測試與營運錯誤路徑；不建議先做完所有畫面，再補交易一致性與安全控制。

## 13. 本版工程與交付要求

- 後端所有業務遵循 ABP 分層：Domain aggregate／domain service、Application service、Contracts DTO／validation、EF Core repository／mapping、HTTP 邊界；使用 ABP authorization、Unit of Work、auditing、exception handling，不把核心業務堆入 Controller。
- 所有資料庫 schema 變動必須附 EF Core migration 與 ModelSnapshot，經 DbMigrator 路徑套用；不可只改 entity、不交 migration，或以 EnsureCreated 代替正式升級。
- 模擬登入必須由伺服器核發／建立身份，限定開發／UAT 設定；不得在 Production 意外啟用或任意信任瀏覽器傳入的 Email。UI 明確標示固定測試身份；未接 Google 不宣稱真實身份驗證完成。
- 欄位以 [Legacy-Field-Mapping.md](Legacy-Field-Mapping.md) 為驗收清單；舊站資料欄位全部保留，新維度清楚標示設計來源。
- 報表依 [Reporting-Dimensions.md](Reporting-Dimensions.md) 保持 distinct Claim／ClaimItem、狀態、幣別與時間口徑；欄位存在不代表指標已實作，README 要列明驗證範圍。
- Markdown 文件加入 Git；`.gitignore` 排除 node_modules、bin／obj、建置快取、測試產物、秘密與本機設定，不以 `*.md` 忽略需求／設計文件。
- 開發後更新 README，列環境、啟動、migration、模擬登入、樣本資料、付款人工流程、測試及尚未完成項目，提交版本並推送 GitHub。

## 14. 版本紀錄

| 版本 | 日期 | 變更 |
|---|---|---|
| 0.1 | 2026-09-03 | 第一版開發 Spec |
| 0.2 | 2026-09-09 | Spec 優先；舊 Campaign／Claim 圖片欄位完整映射；Google 登入延後且提供模擬身份；排除銀行 API 但完成其他付款工作流；報表維度、ABP、migration、文件版控與 README／GitHub 交付要求 |
