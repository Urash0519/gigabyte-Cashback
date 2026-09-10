# Q1 P0 驗證紀錄 — 2026-09-10

驗收故事：管理員載入 Q1 範本或完整 JSON，預覽差異、驗證、保存草稿，批次維護產品／通路並發布；已發布內容從 PostgreSQL 快照供前台顯示，歷史 Claim／付款不受設定搬移影響。

| 邊界 | 結果 | 證據 |
|---|---|---|
| 解析／表格 | 通過 | 13 項 Node 測試：BOM、引號、逗號、多行、文字 ID/EAN、公式保護、UTC offset、無效欄位、重複 ID、整數金額、merge/replace、JSON 完整欄位及 legacy 規則顯示 |
| 共用驗證／資料庫 | 通過 | 42 項 .NET 測試，包含新增 13 項設定與主檔驗證；EF migration 無 pending model change |
| 前端建置 | 通過 | 前後台 TypeScript、Linux Docker production build、GCP Cloud Build；不依賴本機 node_modules 的既有連結狀態 |
| Browser → API → DB | 通過 | 本機瀏覽器選擇真實 Q1 JSON 檔，顯示差異及理由欄，確認匯入後新草稿 `3a239cba-9cb8-1ada-351e-4996d74d06bd`；API 讀回 publishedVersion=0、59 products、46 retailers、Draft |
| 後台批次互動 | 通過 | Q1 產品表顯示 59 列，搜尋後選取 1 列，批次從 3000 改為 3100 cents；畫面提示未儲存且發布 disabled；還原為 3000，沒有保存測試變更 |
| Preflight | 通過 | Q1 回傳 0 errors / 0 warnings；缺名稱也回欄位 errors 而非 MVC 400；未保存不得發布 |
| 設定 HTTP／PostgreSQL | 通過 | 本機與 GCP 均 12 項：完整 JSON 往返、無 runtime state、僅草稿、快照及餘額不變、stale stamp 拒絕、非法輸入零寫入、主檔批次原子性、consumer 禁止後台操作 |
| 既有業務流程 | 通過 | 本機與 GCP 均 24 項，含跨國／多產品、文件儲存、補件、風險檢核、核放、對帳、unknown/failed 重試規則、預算交易及報表匯出 |
| 雲端前台／素材 | 通過 | Q1 `3a239cbc-1de2-f379-be37-11852cfc5d0c` 公開可見；59 型號，原圖 banner 實際載入，單品最高 EUR 90 與三類合計 EUR 180 區分；國家仍五國 |
| 雲端範本入口 | 通過 | `/admin/templates/q1-campaign.json` 載入差異預覽；沒有落到 public SPA 的 `/templates` 路徑 |
| 舊活動相容 | 通過 | 最終 GCP 畫面檢查 `Smoke 1789013339970 (copy)`：舊資料 top-level=1 / legacy=3，畫面正確顯示有效每戶上限 3；未更改或儲存該活動 |
| 瀏覽器錯誤 | 通過 | 本機後台及最終雲端前／後台 console error 清單為空；雲端 HTTP 正常 |

修正的整合問題：共用 dev Cookie 的 admin 降級、報表匯出缺獨立權限、登出後測試腳本 XSRF 更新、MVC 提前 Required 400、admin base URL、CSV 公式保護、匯入日期 UTC 顯示，以及過長的模擬摘要。前台結構不變。

未完成／不在本次範圍：工作日 SLA 引擎、五國正式本地化法務、真實會員與付款 API、未發布內容即時視覺預覽、版型配置、Q4 A+B、業務人員的計時 UAT。這次功能驗證不等同正式營運核准。原圖 banner 套入既有 cover 容器時仍會裁切，本次不調整前台版型，不宣稱畫面像素級復刻。

重跑命令見 README。自動驗證資料使用 integration-test 標記，僅後台及有權的既有案件可見；本機 UI 匯入的 Q1 原始範本是未發布草稿。沒有清空既有資料，也沒有實際寄信或付款。
