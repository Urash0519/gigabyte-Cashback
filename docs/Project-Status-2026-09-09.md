# 專案狀態盤點（2026-09-09）

## 結論與判定方式

目前處於「Prototype v3 已提供內部流程驗收、正式系統 Foundation 已有實作、業務切片尚未落地」。不能將原型畫面的完整度換算為正式系統完成率；未見正式 UAT 簽核紀錄，也無足夠工時、排程與權重資料可計算可信的整體百分比或上線日期。

本次以本機工作目錄的文件、程式、資料模型與實際測試為依據；未查詢遠端 Git、雲端資源或重新驗證線上部署。未修改既有需求與業務程式。

## 需求與文件基準

| 文件 | 現況 | 尚需處理 |
|---|---|---|
| Cross-Region-Promotion-Source-Review.md | 2026-08-27 來源盤點，記錄 110 份材料及差異 | 本次沿用既有檢閱成果，未重新逐份驗證原始 PDF、DOCX、截圖 |
| Gigabyte-Cashback-SA.md | v0.5／2026-09-02；分期、流程、風險及 D01–D18 決策表已建立 | 多項正式矩陣、營運責任與非功能數值未核定 |
| Phase1-Development-Spec.md | v0.1／2026-09-03；18 項 FE、20 項 BE、狀態、資料模型、API 責任及切片 | 尚非完整 API 契約、實體 ERD、逐項測試案例及已核准排程 |
| Prototype-v3-UAT.md | 模擬前後台流程、驗收路徑及歷史部署證據 | 有驗收說明不等於業務已簽核 |
| Foundation-Milestone.md | 工程底座的明確納入／排除及本機驗證步驟 | 此文件的 Foundation 範圍比 Spec 第 12 節窄，不能視為整個第一切片已完成 |

已確認的主線：Q1 類型、DE／FR／IT／ES／NL、同張發票多品類、P1 免登入填 AORUS Email／個人／銀行資料、送件後建立 Tracker；後台負責 Campaign 建立／複製／發布／比較與預算。P2 才做 AORUS SSO／本人產品；付款 API 分後續階段，但 P1 正式營運仍需要人工付款及對帳閉環。

## 正式實作與 Spec 對照

| 模組／對應範圍 | 現況 | 尚缺的正式交付 |
|---|---|---|
| 工程底座 | ABP 10.6.0／.NET 10 分層方案、PostgreSQL EF 設定、2 次 migration、React 前後台、Compose、GCP 模板均存在 | PostgreSQL／BLOB／Audit 的整合驗收本次未完成；CI/CD 僅有建置準備 |
| 活動前台 FE-01–03、Campaign BE-03–07 | public-web 僅呈現 Foundation 說明；site 有模擬流程 | Campaign／CampaignVersion、產品通路模型、CRUD、發布驗證、公開查詢與版本差異 |
| 申請 FE-04–11 | site 有模擬五步申請；正式後端未見 Claim／ClaimItem／BankAccount | Draft、銀行保護、文件政策、規則複核、SN／名額／預算交易式送件 |
| Tracker FE-12–16 | 原型有模擬查詢／帳號／補件／取消 | 真實啟用、登入、本人案件授權、歷程及安全取消 |
| 審核及客服 BE-02、08–13 | 原型有模擬工作流 | 真實案件佇列、檢核、Hold、決策、客服訊息及稽核 |
| 財務 BE-14–17 | 原型有預算及付款狀態模擬 | BudgetLedger、PaymentInstruction／Attempt／Batch、人工交付、結果及對帳 |
| 身分權限 BE-01 | ABP Identity／OpenIddict 基底及業務權限名稱已存在 | 公司登入、MFA、角色及市場／活動資料授權；權限名稱存在不代表已強制執行 |
| 附件 FE-09 | ABP BLOB 與 StoredFileRecord、1 MiB 樣本上傳下載存在 | 案件歸屬授權、檔案掃描、版本、敏感存取紀錄與正式格式／容量 |
| 通知 FE-17 | NotificationOutboxMessage 持久化及模擬狀態 | 寄送 worker／供應商、模板版本、可靠重試、重寄及送達結果 |
| 報表／稽核／維運 BE-18–20 | ABP Audit、健康檢查、管理端基礎驗證畫面 | 正式報表、受控匯出、業務與敏感讀取稽核、告警、備份還原演練及維運手冊 |
| FE-18／後續整合 | 按分期未實作 | 不列為 P1 缺失；需另追 API 契約及窗口 |

程式證據：

- `frontend/apps/public-web/src/App.tsx`：正式前台 Foundation 說明頁。
- `frontend/apps/admin-web/src/App.tsx`：只串接 foundationApi，提供底座驗證。
- `backend/aspnet-core/src/Gigabyte.Cashback.EntityFrameworkCore/EntityFrameworkCore/CashbackDbContext.cs`：自訂 DbSet 為 FoundationVerification、NotificationOutboxMessage、StoredFileRecord；另有 ABP 框架資料。
- `backend/aspnet-core/src/Gigabyte.Cashback.Application/Foundation/FoundationAppService.cs`：資料庫／樣本 BLOB／通知佇列驗證服務。
- `backend/aspnet-core/src/Gigabyte.Cashback.HttpApi/Controllers/FoundationController.cs`：AllowAnonymous，驗證與檔案操作以組態旗標控制。
- `deploy/gcp/README.md`：文件明示尚未套用；Cloud Build 只建置及推送映像。

## 本次驗證結果

| 檢查 | 結果 | 適用限制 |
|---|---|---|
| 正式 public-web、admin-web TypeScript | 直接執行現有 TypeScript `--noEmit -p`，兩者通過 | `pnpm typecheck` 原入口觸發依賴目錄重建，因無 TTY 中止；未重裝依賴；未執行 production build |
| 原型三個測試檔 | 19 項通過、1 個測試檔失敗 | 18 項 model 與 1 項 server 通過；rendered-html 寫入 `.uat-test/prototype-v3.mjs` 時 EPERM，四項渲染案例未完成 |
| `dotnet test Gigabyte.Cashback.slnx --no-restore --verbosity quiet` | 結束碼 0；Domain 2 項、EF 3 項通過 | EF 使用記憶體 SQLite，並停用交易，不能據此確認 PostgreSQL migration 或預算並發安全；其餘測試基底／抽象樣板不增加業務測試覆蓋 |
| Docker Compose 狀態 | 未能取得 | Docker daemon pipe 不存在，另有 Docker config 讀取權限訊息；無法確認服務健康，未啟動或部署服務 |
| 歷史原型部署 | 文件記錄 v3、23 項通過與 Cloud Run revision | 為既有紀錄，未代表本次重跑全數通過或目前線上仍健康 |

## 需優先收斂的缺口

1. **需求核准口徑**：SA 明寫未明確確認的 Must-have 仍為分析建議；Spec 將未標待確認的 M/P1 視為必要。應建立逐項「已確認／建議／待決」與負責人、核准日期，避免把分析建議當成合約範圍。
2. **Foundation 的完成定義**：Spec 包含身分／權限及 CI/CD；現行 Milestone 排除正式 authentication／UI authorization，雲端也只備妥模板。應分開追蹤工程骨架與完整切片驗收。
3. **開發契約**：补齊 API request／response、錯誤碼、冪等鍵、版本衝突、資料約束／索引、授權矩陣，以及可執行的 Given／When／Then 驗收案例。
4. **業務決策**：產品／通路／跨境矩陣、各國語言幣別、日期算法／SLA、會員資格核對、每戶／每人／SN 限制、部分不合格品項處理及預算池。
5. **正式營運決策**：銀行欄位、實際付款人、付款檔、核放／對帳分工、RMA／退貨 SOP、資料保存／刪除、RPO／RTO、舊 Agency 未結案件交接。
6. **底座限制須轉成待辦**：Foundation Controller 匿名且以旗標判斷，並非直接檢查 Development；GET Audit 全面停用，不足以涵蓋未來敏感下載／讀取。需在正式業務端點加入授權與必要存取稽核。
7. **版本管理**：本機 Git 僅追蹤 README.md 與 .gitignore，最後提交為 2026-08-05；backend、frontend、site、docs、deploy 等均未追蹤。不能據此推論其他遠端／工作目錄不存在成果，但此 checkout 尚無主要實作的提交基線。

## 下一里程碑

先建立可重現的 Foundation 驗收與 Git 基線，再完成第一條 Campaign 業務流程：後台建立草稿 → 設定產品／通路／規則／預算 → 授權發布不可變版本 → 正式前台從 API 讀取。同步核定該切片所需矩陣及權限；不需等所有付款細節才開始。

接續依 Spec 順序開發 Claim → Tracker → Operations → Finance → Reporting／Hardening。每一切片都需連同 API、UI、權限、稽核、資料一致性及錯誤路徑驗收；待範圍與人力核定後再估時排程。
