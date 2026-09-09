# Prototype v3：內部驗收說明

更新日期：2026-09-02

## 驗收範圍

Prototype v3 沿用 v1 的橘／深灰視覺，依 SA v0.5 提供以下可互動流程：

- Q1 類型活動，市場為德國、法國、義大利、西班牙、荷蘭，幣別 EUR。
- 前台不預先登入；申請人填寫樣本個資、AORUS Email、銀行資料、購買與產品資料。
- 同張發票可申請多個不同品類產品，並使用樣本附件完成送件。
- 送件後產生 Claim Reference 與模擬追蹤帳號；公開編號查詢只顯示一般狀態，登入追蹤器後才能補件或取消。
- 後台可直接建立或複製 Campaign、編輯條件、控制預算，並比較各活動期間、預算與件數。
- 後台包含人工審核、RMA／DOA Hold、付款狀態模擬、報表、CSV 與稽核軌跡。

## 建議驗收路徑

1. 選擇活動市場並進入申請，確認不要求 AORUS 登入。
2. 使用預填的合成個資與銀行資料；選擇合格通路、輸入樣本序號並附加樣本文件。
3. 在最後一步勾選必要條款後送出，記下 Claim Reference 與追蹤帳號。
4. 進入 **Track claim**，先以 Claim Reference 查看有限狀態，再用追蹤帳號與測試密碼 `UAT-DEMO` 登入。
5. 切到 **Admin preview**，檢查案件、遮罩後的 IBAN、人工審核、補件／Hold 與預算占用。
6. 在 **Campaigns** 使用 **Create campaign**，編輯草稿並比較各活動的 Budget、Committed、Available 與 Claims。
7. 在 **Payouts** 執行付款狀態模擬並確認未知結果不會被直接重送。

## 安全與限制

- 僅可輸入合成資料，請勿輸入真實姓名、Email、電話、地址、銀行帳號或文件。
- 原型狀態只存在目前瀏覽器分頁；重新整理會恢復種子資料。
- 沒有正式資料庫、帳號系統、AORUS SSO、會員／產品／SN API、檔案上傳、Email 或付款介接。
- 銀行資料欄位只用於流程確認；正式版仍須完成加密、遮罩、欄位權限、存取稽核、保存期限及刪除政策。
- AORUS SSO 與本人已註冊產品清單屬 Phase 2。

## 部署與驗證

| 項目 | 結果 |
|---|---|
| Cloud Run 專案／服務 | `side-project-platform`／`gigabyte-cashback` |
| 區域 | `asia-east1` |
| Revision | `gigabyte-cashback-00005-6sq`，100% 流量 |
| 公開網址 | <https://gigabyte-cashback-219894818230.asia-east1.run.app> |
| 健康檢查 | `/health` 回傳 `version: 3.0.0` |
| 自動測試 | 型別檢查通過；23 項測試全部通過 |
| 線上核對 | 首頁與健康檢查 HTTP 200；JS／CSS SHA-256 與本地 production build 相同 |

詳細部署結果見 [Prototype-v3-deployment-verification.json](Prototype-v3-deployment-verification.json)。
