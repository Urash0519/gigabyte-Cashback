# Phase 1 第一版開發計畫

日期：2026-09-09。依據：使用者本次指示及 Phase1-Development-Spec；衝突以本次指示優先，Spec 為需求主文件，SA 同步修訂。

## 執行順序

1. 圖片欄位盤點：Campaign、Claim Form、Tracker，建立來源欄位與追加維度對照；搜尋同類產品官方報表文件。
2. 更新 Spec／SA：銀行 API 不納入；Google 第三方登入延後；本版按鈕以 yoyo.chen@gigabyte.com 模擬登入。正式資料矩陣尚待確認部分先提供可配置樣本。
3. 後端：依 ABP 分層開發 Domain、Contracts、Application、EF、HTTP API，資料變更產生 migration；活動版本、案件、附件、預算帳、審核、付款與報表採持久化。
4. 前端：前後台串 API，提供登入、Campaign 管理、申請／追蹤、案件審核、付款與報表操作。
5. 整合驗證：型別、build、後端測試與 migration；依環境可用性完成端到端驗證並記錄限制。
6. 交付：README、欄位對照、規格、驗證紀錄；排除套件／產物／secrets，納入 Markdown 及來源；檢查提交內容，commit 並 push origin。

## 協作分工

- requirements agent：圖片證據、報表來源與維度、Spec／SA。
- backend agent：ABP 業務模組、契約、migration、後端測試。
- 主 agent：前端、API 整合、版控、驗證、README 與交付。

## 驗收重點

- Campaign 草稿／複製／設定／發布／比較，發布版本不可變。
- 同張發票多產品、圖片欄位完整、伺服器規則及金額、附件與同意紀錄。
- 本人查詢、補件／更正／取消；審核與 Hold／付款状态分開。
- 預算 Reserved／ApprovedUnpaid／Paid 交易一致；不重複占額或付款。
- 人工核放、批次交付、付款結果／對帳，Unknown 禁止盲目重送。
- 常用維度報表、CSV、操作身分與歷程。
- 開發模擬登入與未來 Google 登入分開配置，銀行 API 尚不啟用。

## 狀態

2026-09-09：欄位盤點、Spec／SA 同步、ABP 持久化與 migrations、前後台整合、人工付款及報表第一版已完成。後端 25 項測試與真實 HTTP 整合 22 項檢查通過，瀏覽器已驗證登入及活動編輯儲存。詳見 [驗證紀錄](Phase1-Verification.md) 與 README；正式外部服務與營運核定事項仍列為交付限制。
