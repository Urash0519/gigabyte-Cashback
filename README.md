# GIGABYTE Cashback

Phase 1 第一版：React 前台／後台 + ABP 10.6.0、.NET 10、PostgreSQL。需求以 [Development Spec v0.2](docs/Phase1-Development-Spec.md) 為主；[SA v0.6](docs/Gigabyte-Cashback-SA.md) 已同步。`site/` 保留 v3 模擬原型供歷史參考，現在的業務實作位於 `frontend/` 與 `backend/aspnet-core/`。

## 本版功能

- Campaign：建立、複製、編輯、發布不可變版本、比較；舊站名稱／類型／期間／國家與狀態分類，產品／系列／金額、通路有效期、內容、限制與預算設定。
- Claims：伺服器 Draft、完整個人／地址／銀行欄位、同發票多產品、產品日期／通路、文件上傳、同意版本、伺服器金額計算、序號與人／戶／活動互斥規則。
- Tracker／客服：本人案件、補件更正、歷史版本、取消請求、案件訊息與受控銀行更改。
- Operations：工作佇列、七項人工檢核、核准／拒絕／補件、Risk Hold、稽核及通知佇列。
- Finance：交易式 Reserved／Approved Unpaid／Paid、核放、固定付款 ID／批次、受控 CSV、人工結果及對帳；Unknown 先查核、Confirmed Failed 才可重試。
- Reports：活動／市場／居住國／購買國／銀行國／語言／狀態／通路／產品／品類／週／月與 Hold，原幣分組，區分 Claim 與 Item，核准率與營運指標。

## 本機啟動

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

先開後台按 **Sign in for development**。按鈕透過伺服器 Cookie 建立固定身份 `yoyo.chen@gigabyte.com`，前台與後台均可使用；同一瀏覽器共用 Cookie，切換身份區域後可重新按登入。期限 8 小時。Google OAuth 尚未串接，不建立另一套密碼帳號。DevelopmentAuth 必須明確啟用且 ASPNETCORE_ENVIRONMENT 必須為 Development；Production 不提供此登入。

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

## 尚未串接與正式使用界線

本機驗證：前後台型別檢查及 Docker 建置通過、後端 25 項測試通過、HTTP／PostgreSQL 整合 22 項通過；瀏覽器登入及活動儲存驗證完成。詳見 [Phase 1 驗證紀錄](docs/Phase1-Verification.md)。

- 依本次範圍排除 Google OAuth、銀行／付款供應商 API、Webhook、真實自動付款。
- 通知目前保存佇列、模板／處理紀錄並提供 **Simulate**，不代表已寄出；實際 SMTP／郵件供應商尚未配置。
- 文件檢查格式、magic bytes、8 MiB、最多 20 份及案件歸屬；安全檢查由人工 evidence check 承接，未接外部掃毒引擎。
- 產品、會員、RMA API 與 OCR 未串接；本版使用受控設定與人工檢核。
- 五國正式矩陣、翻譯、時區／SLA、付款人／交付檔格式、保存政策、Google 正式授權、容量及備援演練仍需正式環境核定。可配置樣本不代表已核准營運政策。
- GCP 目錄仍為準備模板，本次不建立或部署雲端資源。GitHub push 不代表正式環境已上線。

## 文件與原型

- [開發計畫](docs/Implementation-Plan.md)
- [舊站欄位對照與圖片依據](docs/Legacy-Field-Mapping.md)
- [報表維度、公式及參考來源](docs/Reporting-Dimensions.md)
- [Phase 1 Spec](docs/Phase1-Development-Spec.md)／[SA](docs/Gigabyte-Cashback-SA.md)
- [開發前盤點快照](docs/Project-Status-2026-09-09.md)（僅表示實作開始前狀態）
- [v3 原型驗收與歷史部署](docs/Prototype-v3-UAT.md)
- [舊資料來源檢閱](docs/Cross-Region-Promotion-Source-Review.md)

Markdown、來源程式、migration 與 lockfiles 納入 Git；node_modules、bin／obj、測試產物、秘密與本機資料排除。原型線上歷史記錄不等於此版正式 API 部署。
