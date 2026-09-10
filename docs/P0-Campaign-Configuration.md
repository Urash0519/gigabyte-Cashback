# Q1 / P0 活動設定與架構決策

本次範圍：Q1，一般多產品回饋相加；不做 Q4 A+B 加碼，不新增國家，不開放前台 Banner + Claim + Tabs 版型配置。圖片來源、逐項資料及不能確認之處見 [Q1 資料依據](Q1-Template-Sources.md)。

## 架構評估

保留 ABP / EF Core / PostgreSQL 與 React 雙前端。`Campaign.DraftJson` 是營運草稿，發布時產生不可變的 `CampaignVersion.SnapshotJson`，已送出申請依附發布版本。這能承接 Q1 的五國共用 EUR 產品回饋表；不必為了此次範圍重寫申請、付款或預算交易。

必要的局部重構如下：

| 既有落差 | P0 處理 | 避免的衝突 |
|---|---|---|
| 表單、匯入與發布各自檢查資料 | 共用後端活動驗證，提供帶欄位路徑的預檢結果 | 匯入繞過發布規則、錯誤資料延後才被發現 |
| 產品／通路每個活動重填，長表單難批次維護 | 持久化主檔、分組選取、緊湊表格及 CSV 工作流 | 主檔不含活動回饋／有效期，不會反向修改舊活動 |
| 沒有完整設定搬移契約 | 有格式與版本的 JSON 設定封套 | 不把案件、銀行資料、付款狀態與已承諾預算當設定還原 |
| 戶數／互斥群組同時存在 legacy 與正式欄位 | 將原有效的 legacy 覆寫值移至正式欄位，移除重複設定 | 編輯器顯示與 Claim 驗證不一致 |
| 前後台開發登入共用 Cookie | 保留既有 admin session；admin 回到視窗時同步 session | 登入前台後後台畫面仍顯示登入，操作卻回 403 |

這不是無成本支援所有未來活動：多幣別／各國不同金額、各國本地條款與活動內容，需要下一階段拆出 market configuration 並讓發布快照完整保存；A+B 加碼需要顯式組合規則與伺服器計算；工作日 SLA 需要日曆與假日來源。這些不以 legacy 文字假裝成已實作功能。

國家維持 DE、FR、IT、ES、NL。日後增加國家，除擴充允許清單與顯示名稱外，仍需檢查通路、銀行、幣別、法務與測試；本次不改動既有五國語意。

## 設定檔與操作安全

完整活動設定格式：`{ "format": "gigabyte-cashback-campaign", "schemaVersion": 1, "data": { ...CampaignInput } }`。包含所有活動期間、限制、預算設定、內容、產品與通路。JSON 為完整設定交換格式；CSV 僅為產品／通路表格交換格式，不能取代完整 JSON。Banner 匯出的是 URL 而非圖檔本體；跨環境搬移仍須確保圖片網址可用。

- 設定匯出不含 Campaign ID、ConcurrencyStamp、發布歷史、案件、附件、主檔資料庫識別碼、付款或 Reserved/Approved/Paid。這不是資料庫備份工具。
- 匯入前查看資料、差異與預檢問題，再明確選擇新增草稿或更新目前草稿。未知格式／版本／欄位、重複 ID、無效數值及不支援國家應拒絕。
- 更新草稿需版本戳記防止覆寫其他操作者更改。匯入不自動發布；既有已發布快照、申請、付款及即時預算承諾保持不變。
- 發布前保存及預檢；已有承諾的預算不能縮至不足，已發布幣別不能變更。
- 產品／通路主檔只複製 metadata 到活動。修改主檔不會重新定價歷史 Claim，也不會自動同步任一草稿。
- 匯入及發布理由會留下稽核。報表匯出另需 `Cashback.Reports.Export` 權限；不藉修復 UAT 403 放寬後端權限。
- CSV 金額為整數 EUR cent（100 = EUR 1）。試算表公式開頭與原有單引號使用可逆的單引號保護；系統再次讀取會還原，不執行公式。JSON 是完整設定的標準交換格式。
- 預覽為目前草稿摘要／差異與明確標註的已發布前台連結；本次沒有實作未發布版型的即時視覺預覽，也沒有調整前台結構。

## Q1 範本與模擬資料

下載範本：後台的 Q1 範本功能，或 `/admin/templates/q1-campaign.json`（GCP）。原始檔為 `frontend/apps/admin-web/public/templates/q1-campaign.json`。保留歷史 Q1 日期；不要將歷史範本直接當作可受理的現行正式活動。

```powershell
# 預設 localhost:44305；要操作 UAT 必須明確指定其 URL。
$env:CASHBACK_API_URL = 'https://cashback-uat-219894818230.asia-east1.run.app'
node scripts/seed-q1.mjs
node scripts/verify-campaign-configuration.mjs
```

Seed 建立 `q1-build-beyond-uat-v1`，只在 Development 環境執行；產品／通路源自範本，但購買期間為初次執行日 -45 至 +60 天、申請期間 -31 至 +90 天，均採 UTC 日界，仍須等待 14 天。原始日期保存在來源欄位，不更改下載範本。名稱與內容明示模擬用途，無真實付款／郵件。預算、buffer、名額等假設另見來源文件。

可重跑：相同 slug 且用途相符時保留既有活動，僅恢復尚未完成的首次發布；不重置使用者改過的日期、內容或發布版本。主檔只加入缺少的 ID，不覆寫既有 metadata。

驗證腳本只新增明確標記的 synthetic integration-test 活動，不出現在公開活動探索清單；測試記錄保留供後台檢查。必須在可寫測試環境執行，勿指向正式資料庫。
