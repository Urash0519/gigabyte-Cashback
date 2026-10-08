# 使用者樣式版端到端驗證 — 2026-10-08

已在 GCP UAT 實際操作使用者樣式後台與前台，完成「新增／發布活動 → Cashback 申請 → 附件上傳 → 補件 → 七項審核 → 核准 → 人工付款指示 → 模擬成功對帳 → 前台查詢」。途中發現三個 P1 前端問題，已修正並部署後再驗。這次通過的是指定合成案件的完整主流程，不能據此宣稱所有例外流程或外部整合均已通過。

## 測試範圍與資料

- 前台 `/reference/`、後台 `/admin/reference/`，共用現有業務 API。原版 `/`、`/admin/` 保留。
- 專用活動：`Reference E2E 20261008 1791448944947`，ID `3a242cdb-3163-e95d-d957-e8c3c0387fae`，發布版本 1。
- 案件：`GB-364499BB4A324BCB9DAF2FA88E27D610`，ID `3a242ce1-78b8-57b9-e300-f12e01884186`。
- DE 居住／銀行國、FR 購買國；兩項合成商品回饋 €50 + €20 = €70；活動預算 €1,000。
- 使用假姓名、地址、電話、無效測試 IBAN、合成發票及序號圖片；條款／隱私為本次建立的不具約束力測試說明，行銷訂閱未勾選。沒有真實購買、付款資格或匯款。
- 測試記錄保留於 UAT 供檢閱；沒有修改其他活動／案件。API helper 僅讀取並核對此案件，所有業務操作都經 UI 完成。

## 實際操作結果

| 階段 | 操作與證據 | 結果 |
|---|---|---|
| 活動設定 | 後台新增、保存、預檢、發布；兩商品、FR retailer、DE/FR 市場及日期限制 | 通過；預檢 0 errors，未設 banner 的建議 warning 保留 |
| 發布到前台 | 實際檢查發布連結，開啟連結目的地 | 修正後指向參考版及相同活動／市場 |
| 申請建立與保存 | 填寫五步驟表單，購買日期 2026-09-20、多商品、銀行資料 | 通過；保存、重新載入後資料一致 |
| 登入續填 | 登出狀態開啟既有申請深連結，再用 development login 登入 | 修正後恢復原案件 ID／參考號 |
| 附件 | 上傳一張 invoice、兩張產品 serial 圖片，後台開啟 invoice 預覽 | 三份附件保存，兩張 serial 正確對應各商品 item ID；圖片可預覽 |
| 送出 | 前台 submit，後台／API 讀取狀態與金額 | Submitted、€70，預算 reserved €70 |
| 審核阻擋 | 未勾完七項時嘗試核准 | 正確阻擋：Complete all seven required checks after the latest submission |
| 補件 | 後台要求補件，前台修改理由並重新送出；含最終 GCP 版本的再次驗證 | 同一案件共三次提交，沒有新增付款或重複回饋；附件／商品綁定保持一致 |
| 送出成功定位 | 最終 GCP 前台 submit 後讀取 heading/focus 並截圖 | 成功標題距可視區上方 23.89px，焦點為 claim-success-title |
| 審核核准 | 最新一輪七項檢查保存為 7/7，核准 | Approved；reserved €0、approved unpaid €70 |
| 人工付款 | 建立一筆 €70 指示，記錄 submitted，再以 €70/EUR/synthetic reference 記錄 succeeded | Authorized → Submitted → Succeeded；receipt Matched |
| 前台回查 | Refresh、參考號搜尋、View claim | Approved／Succeeded／€70；案件 timeline 有付款事件 |
| 報表核對 | Dashboard、Summaries | 一申請、兩商品、France／EUR／€70、approved 1、paid 1；Dashboard Succeeded 1 |
| 預算核對 | 讀取此活動 API，離線 assert 保存的階段證據 | reserved €0、approved unpaid €0、paid €70、available €930，總額保持 €1,000 |

付款指示 ID：`3a242d10-b34a-925f-4f13-6d213b28452e`。對帳參考為 `SYNTHETIC-PAID-1791448944947`。此系統未串接銀行 API，以上是人工狀態紀錄與預算驗證，沒有向銀行送出任何轉帳。

## 發現及修正

| 嚴重程度 | 修正前 | 修正後 | 修改檔案 |
|---|---|---|---|
| P1 | 參考後台發布活動後，Open public site 連回原版首頁且沒有指定活動 | 參考後台傳入發布連結生成函式，帶 campaign／market 開啟 `/reference/` | `Campaigns.tsx`、`ReferenceAdminApp.tsx` |
| P1 | 登入續填既有 claim 深連結時，前台一律建立新草稿 | 登入後讀取本人 claims，依 claim ID 恢復原申請及適用畫面 | `ReferenceApp.tsx` |
| P1 | 共用表單成功畫面捲回頁首，參考版大圖使成功訊息落在畫面外 | 參考版指定成功內容定位、鍵盤焦點及 reduced-motion 行為 | `ClaimForm.tsx`、`ReferenceApp.tsx` |

共用元件的新 props 保留原版預設行為。沒有改動 CSS、API、資料庫 schema、身份權限或業務規則。原版 CSS hash 維持 `index-8JaS8b_Q.css`／`index-CNIXRhKk.css`。

## 測試與視覺證據

- 兩前端 TypeScript／Vite production build 通過，Cloud Build 成功；`git diff --check` 通過。
- 最終 GCP 版本 `scripts/verify-uat-access.mjs` 通過八個匿名入口／API／built asset 檢查及後台需登入限制。
- 合成案件的讀取快照 assertion 通過：同一案件、商品／附件綁定、最新一輪七項檢查、唯一 €70 付款指示、付款狀態順序及預算守恆。
- 線上前台追蹤及後台付款頁實際截圖檢視 1440／768／375px；各尺寸整頁 scrollWidth 等於 clientWidth。寬表格在自身區域水平捲動；手機 View claim 可開啟已付款詳情，標題、狀態與鍵盤焦點可見。
- 成功自動定位在實際 1280×720 viewport 量測並截圖；三尺寸矩陣驗證追蹤與付款頁版面，沒有把重設尺寸前的截圖冒充指定尺寸。
- 截圖、三份合成圖片、API 快照、assert helper 位於被忽略的本機 `.uat-test/reference-e2e/`，未上 Git／Cloud Build。主要證據：`09-gcp-success-position.png`、`10-admin-evidence-preview.png`、`admin-payment-{1440,768,375}.png`、`public-paid-{1440,768,375}.png`、`public-case-paid-375.png`、`state-Succeeded.json`。

## 發布及限制

Cloud Build `6d226f4b-d872-4f7f-a34e-d1dafa272854`，gateway tag `uat-20261008-reference-e2e`，digest `sha256:910621bd1c4eced099e85992ef223093aab1c6559ad9c88fc01a11f47c236077`。Cloud Run `cashback-uat-00013-l54` Ready，100% 流量；API 保持 `uat-20261002-review-ux`。

- 真實銀行入帳、Google／AORUS 身份驗證、真實 email、病毒掃描整合沒有串接，本次未驗證。附件目前仍標示 PendingManualReview，通過的是人工 evidence checklist，不等於自動病毒掃描。
- 未驗證 Safari／iOS 真機、所有申請例外／付款失敗／退款／壓力測試或完整 WCAG 合規。
- 這次主流程新增的測試活動是日期有效的合成活動；既有歷史 26Q1 活動內容未改動。
- 檔案選擇工具曾異常等待並重置測試分頁；重新登入與選擇後三份檔案都經 API 和 UI 核實保存。Cloud Run request log 核對三次實際 POST /evidence 均為 200，latency 分別 1.055／0.945／0.315 秒；沒有把數分鐘的工具呼叫等待歸因為 API 上傳耗時。瀏覽器工具等待原因尚未隔離，正常使用者的完整選檔操作耗時未量測。
- IAB 的新視窗未穩定列入分頁清單，因此發布連結驗證採實際 href 加開啟該目的地；新視窗自動顯示行為未確認。
