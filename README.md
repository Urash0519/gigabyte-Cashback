# GIGABYTE Cashback

Phase 1 第一版：React 前台／後台 + ABP 10.6.0、.NET 10、PostgreSQL。需求以 [Development Spec v0.3](docs/Phase1-Development-Spec.md) 為主；[SA v0.7](docs/Gigabyte-Cashback-SA.md) 已同步。`site/` 保留 v3 模擬原型供歷史參考，現在的業務實作位於 `frontend/` 與 `backend/aspnet-core/`。

## 本版功能

- Q1 / P0：完整活動設定 JSON 匯入／匯出（草稿與發布版本）、匯入差異及錯誤預覽、明確新增／更新草稿、伺服器預檢、產品／通路 CSV 批次維護與可重用主檔。新增 EF migration；活動快照、案件與付款核心保持不變。詳見 [架構與操作決策](docs/P0-Campaign-Configuration.md)。
- 提供 [Q1 完整設定範本](frontend/apps/admin-web/public/templates/q1-campaign.json)，含原圖 59 型號、46 通路、五國共用 EUR 表及原圖主視覺；資料庫模擬活動由 `node scripts/seed-q1.mjs` 建立。歷史範本與可測試日期副本分開，資料來源與假設見 [Q1 來源文件](docs/Q1-Template-Sources.md)。不含 Q4 A+B 加碼，也不新增前台版型設定。
- 未送出草稿在開啟與送出前檢查最新發布版本，提示確認後保留資料與附件套用，並重新確認條款／隱私同意；已送出及補件案件保持送出時版本。
- 前台提供 English／繁體中文切換並記住選擇；申請語言可選繁體中文。活動名稱、產品及條款原文仍依後台設定呈現。送出錯誤顯示於操作按鈕旁，自動捲動並聚焦提示。詳見 [草稿版本與語系](docs/Draft-Version-and-Language.md)。
- 後台提供獨立 English／繁體中文切換，涵蓋總覽、活動、申請、付款、報表、通知、稽核與更正歷程；重新整理會保留語系。欄位值、狀態代碼及使用者輸入不因切換而變動。
- Campaign：建立、複製、編輯、發布不可變版本、比較；舊站名稱／類型／期間／國家與狀態分類，產品／系列／金額、通路有效期、內容、限制與預算設定。
- Claims：伺服器 Draft、完整個人／地址／銀行欄位、同發票多產品、產品日期／通路、文件上傳、同意版本、伺服器金額計算、序號與人／戶／活動互斥規則。
- Tracker／客服：本人案件、補件更正、歷史版本、取消請求、案件訊息與受控銀行更改。
- Operations：工作佇列、七項人工檢核、核准／拒絕／補件、Risk Hold、稽核及通知佇列。
- Finance：交易式 Reserved／Approved Unpaid／Paid、核放、固定付款 ID／批次、受控 CSV、人工結果及對帳；Unknown 先查核、Confirmed Failed 才可重試。
- Reports：活動／市場／居住國／購買國／銀行國／語言／狀態／通路／產品／品類／週／月與 Hold，原幣分組，區分 Claim 與 Item，核准率與營運指標。

## GCP UAT

專案 `side-project-platform`，部署帳號 `yoyo.chen@gigabyte.com`，區域 `asia-east1`。目標為 3 人約 30 分鐘測試：Cloud Run 閒置縮到 0、最多 1 實例；Cloud SQL PostgreSQL 17 `db-f1-micro`／10GB SSD／單區；附件與 Cookie 金鑰使用私有 Cloud Storage，密碼使用 Secret Manager。

2026-09-10 已部署並驗證：Cloud Run `cashback-uat`、migration Job `cashback-uat-migrator`、Cloud SQL `cashback-uat-db`、Artifact Registry `cashback-uat`、兩個私有 Storage bucket、四個 Secret Manager 秘密及專用執行身份。使用 Cloud Build 建置與既有 Cloud Logging／Monitoring；沒有新增負載平衡器、NAT、Redis 或 GKE。現有原型與其他專案服務不變。完整資源與映像清單見 [GCP UAT 紀錄](deploy/gcp/uat/README.md)。

- [UAT 前台](https://cashback-uat-219894818230.asia-east1.run.app/)／[UAT 後台](https://cashback-uat-219894818230.asia-east1.run.app/admin/)
- 依使用者最新決策，UAT 移除入口密碼，任何人可直接開啟前後台，再按「開發環境登入」使用模擬身份 `yoyo.chen@gigabyte.com`。不需要 Google 帳號或 UAT 密碼。
- 所有人共用模擬身份與案件，任何訪客都能透過按鈕取得測試後台操作權限。此為明確選擇的公開 UAT 行為，僅使用測試資料；正式登入與銀行 API 仍未串接。Cloud SQL、Storage 與加密秘密仍透過原有服務身份存取。
- 已完成 ABP migration、24 項 GCP HTTP 業務流程與 12 項設定／權限驗證。Q1 模擬活動已在雲端資料庫發布（59 型號／46 通路），可直接在後台搜尋 `Q1 Build Beyond`。Cloud SQL 目前開機；測試後執行 `./deploy/gcp/uat/power.ps1 -Action stop`，下次使用前執行 `-Action start`。停止 SQL 保留資料，但網站資料操作會暫停；儲存空間仍計費。

## 本機啟動

Public-web 已依 Prototype 03 補齊首頁／活動主視覺、詳情搜尋與頁籤、申請摘要／附件卡片／成功頁；通路選取仍為下拉選單，My claims 維持原版。詳見 [前台對齊範圍](docs/Public-Web-Prototype-Alignment.md)。

啟動後可用 Node 24 執行 `node scripts/seed-showcase.mjs` 建立展示活動。腳本可重跑且不覆寫既有內容。整合測試活動只保留於後台與既有案件，前台活動列表不再顯示 Smoke 測試資料。

需求：Docker Desktop（Linux containers）。本機程式測試另需 .NET 10 SDK、Node 24、pnpm 10.26.1。

```powershell
Copy-Item .env.example .env
# 修改 .env 中的本機 DB 密碼與 STRING_ENCRYPTION_PASSPHRASE。
docker compose up --build -d
.\scripts\verify-local.ps1
node scripts/verify-operations.mjs
```

| 入口 | URL |
|---|---|
| 消費者前台 | http://localhost:5173 |
| 管理後台 | http://localhost:5174 |
| Swagger | http://localhost:44305/swagger |
| API health | http://localhost:44305/health |

先開後台按 **Sign in for development**。按鈕透過伺服器 Cookie 建立固定身份 `yoyo.chen@gigabyte.com`，期限 8 小時。同一瀏覽器共用 Cookie：已有 admin 身份時登入前台不再降級；任一端登出會共用登出，後台視窗重新取得焦點時同步登入狀態。單獨登入前台仍無後台權限。Google OAuth 尚未串接，不建立另一套密碼帳號。DevelopmentAuth 必須明確啟用且 ASPNETCORE_ENVIRONMENT 必須為 Development；Production 不提供此登入。

容器持久化 PostgreSQL、BLOB 與 Data Protection key。`docker compose down` 保留資料 volume；不要任意刪除 volume。只輸入合成測試資料。

### 開發與 migration

```powershell
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm dev:public
# 另一終端執行 corepack pnpm dev:admin
```

Vite `/api` proxy 指向 localhost:44305；Docker 前端使用建置時 API URL。修改 VITE_* 後需重新建置前端映像。

```powershell
cd backend/aspnet-core
dotnet restore Gigabyte.Cashback.slnx
dotnet test Gigabyte.Cashback.slnx
```

所有 schema 異動附 EF migration／ModelSnapshot，Compose 的 DbMigrator 先完成再啟 API。禁止以 EnsureCreated 代替升級。ABP 分層保留 Domain aggregates、Contracts、Application services、Repository、Unit of Work、Permission 與 Audit；Controller 僅處理 HTTP 邊界。

銀行資料透過 ABP StringEncryption 加密，API 一般回覆遮罩。非 Development 啟動必須提供至少 32 字元的 `StringEncryption__DefaultPassPhrase` secret；更換此 key 前需規劃既有資料解密／輪替，不能直接換掉。付款匯出需要 sensitive-data permission 並留下業務存取事件。

## 驗收路徑

1. 後台建立 Campaign，設定產品／通路／期間／規則／預算與條款，儲存後填理由發布。
2. 前台選市場與活動，按開發登入，填合成個資／銀行／購買資料與多產品，附發票及各產品序號圖後送出。
3. 後台 Claims 完成 membership、invoice、serial、eligibility、duplicates、rma、evidence 七項檢核；測試 Hold、補件、解除及核准。
4. Payments 選已核准且無 Hold 的案件核放；匯出只代表資料交付，尚未付款。
5. 手動記錄 Submitted／Processing／Unknown；輸入憑證、正確金額及幣別後確認 Succeeded 或 Failed。Unknown 禁止重試。
6. Reports 核对幣別、Claim／Item 計數與預算，Audit 確認操作者與理由，Notifications 查看模擬通知。

`scripts/verify-operations.mjs` 會新增有唯一名稱的合成 Campaign／Claim／Payment，驗證真實 HTTP／PostgreSQL／BLOB 路徑；不會呼叫銀行，也不會發送 Email。測試資料保留供檢視。GitHub Actions 執行後端測試、Compose 建置及同一腳本。

`node scripts/verify-campaign-configuration.mjs` 另驗證 Q1 預檢、完整 JSON 往返、發布版本不變、過期版本戳記拒絕、無效匯入零寫入、主檔原子性與前後台共用 Cookie 權限。`node scripts/seed-q1.mjs` 僅建立／首次發布具明確模擬標記的 Q1 活動，重跑不覆寫營運修改。兩者預設 localhost:44305，雲端需明確設定 `CASHBACK_API_URL`。

## 尚未串接與正式使用界線

本次 P0 驗證：後端 42 項（5 Domain + 37 EF）、CSV／JSON／舊規則 13 項測試通過；前後台型別檢查、Docker 與 Cloud Build 建置通過；GCP 24 項業務流程、12 項設定／權限及匿名入口檢查通過。瀏覽器確認 Q1 JSON 真實檔案匯入→儲存草稿→資料庫、產品搜尋／批次套用、未儲存發布阻擋、雲端範本與 Q1 前台素材。細節見 [P0 驗證紀錄](docs/P0-Verification.md)，最新雲端結果見 [GCP UAT 紀錄](deploy/gcp/uat/README.md)。

- 依本次範圍排除 Google OAuth、銀行／付款供應商 API、Webhook、真實自動付款。
- 通知目前保存佇列、模板／處理紀錄並提供 **Simulate**，不代表已寄出；實際 SMTP／郵件供應商尚未配置。
- 文件檢查格式、magic bytes、8 MiB、最多 20 份及案件歸屬；安全檢查由人工 evidence check 承接，未接外部掃毒引擎。
- 產品、會員、RMA API 與 OCR 未串接；本版使用受控設定與人工檢核。
- 五國正式矩陣、翻譯、時區／SLA、付款人／交付檔格式、保存政策、Google 正式授權、容量及備援演練仍需正式環境核定。可配置樣本不代表已核准營運政策。
- P0 以五國共用 EUR 回饋表實作；工作日 SLA、各國內容／金額變體、A+B 加碼與前台版型配置尚未加入。預覽為草稿摘要＋已發布網站連結，不是未發布內容即時視覺預覽。仍需由 Campaign Owner 實測建置時間，不宣稱已達成 30–60 分鐘業務驗收目標。
- `deploy/gcp/uat/` 為本次 UAT 設定；原 `deploy/gcp/cloud-run/` 保留正式部署參考模板。GitHub push 不代表 UAT 驗證已完成或正式環境上線。

## 文件與原型

- [開發計畫](docs/Implementation-Plan.md)
- [舊站欄位對照與圖片依據](docs/Legacy-Field-Mapping.md)
- [報表維度、公式及參考來源](docs/Reporting-Dimensions.md)
- [Phase 1 Spec](docs/Phase1-Development-Spec.md)／[SA](docs/Gigabyte-Cashback-SA.md)
- [開發前盤點快照](docs/Project-Status-2026-09-09.md)（僅表示實作開始前狀態）
- [v3 原型驗收與歷史部署](docs/Prototype-v3-UAT.md)
- [舊資料來源檢閱](docs/Cross-Region-Promotion-Source-Review.md)

Markdown、來源程式、migration 與 lockfiles 納入 Git；node_modules、bin／obj、測試產物、秘密與本機資料排除。原型線上歷史記錄不等於此版正式 API 部署。
