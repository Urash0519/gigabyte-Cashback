# Prototype v2：內部驗收說明

## 1. 已確認範圍

> **2026-09-02 Scope 更新：** SA v0.5 已確認 Phase 1 應採免登入申請、填寫 AORUS Email／個人／銀行資料、送件後建立追蹤帳號，且 Campaign 建立、預算控制與比較由後台負責。現行 Prototype v2 尚未實作這批新決策，以下仍是 2026-08-27 版本的驗收說明，不應作為 Phase 1 最終畫面基準。

- Q1 類型：顯卡、主機板、螢幕；同張發票、多產品、每品類最多一項；不含 Q4 A／B 加碼。
- 德國、法國、義大利、西班牙、荷蘭；EUR 樣本金額。介面保留 v1 英文，正式本地翻譯尚待確認。
- 先供內部驗收。AORUS、本人註冊產品、SN／RMA、附件、通知及付款均為模擬。
- 保留第一版的橘色／深灰 Hero、CSS 產品視覺、白色表單及側欄後台設計。
- 原 v1 元件保留於 site/app/prototype.tsx；v2 元件及規則分別位於 prototype-v2.tsx、prototype-model.ts。

## 2. 環境與資料

| 項目 | 內容 |
|---|---|
| 測試時鐘 | 固定為 2026-08-27，不隨實際日期變動 |
| 樣本購買期間 | 2026-08-01～08-31 |
| 樣本申請期間 | 2026-08-15～09-30 |
| 預設可用購買日 | 2026-08-10，滿 14 天；08-14 起可測過早申請 |
| 樣本金額 | 顯卡 €30、主機板 €20、螢幕 €60；不是正式產品金額矩陣 |
| 模擬身分 | member.demo@example.test；只呈現本人的產品 |
| 案件保存 | 僅目前分頁記憶體；重新整理／Reset demo 恢復樣本，不寫入伺服器或瀏覽器儲存 |
| 附件 | 按鈕加入 sample metadata，不開啟真實檔案選取或上傳 |
| 金流 | 無銀行資料、Tremendous key 或真實付款 API |
| 權限 | 四種角色操作限制為示意；不是正式 RBAC／MFA |

## 3. 建議驗收路徑

1. **送件**：選擇活動國家 → Explore cashback → Start your claim → Use demo member。可將購買國改為法國，搜尋並選取 Amazon.fr，驗證跨境流程。
2. **多產品**：在 Products 使用註冊產品 SN 或手動輸入，新增其他品類。重複品類或其他案件已占用的 SN 應無法送出。
3. **文件與同意**：附加 sample invoice 及每項 sample serial photo；不勾行銷也可送件，必要同意未勾則不能送件。
4. **審核**：切到 Admin preview → Claims，找到自己建立的案件。逐項勾選人工檢核，填寫原因，再要求補件／核准／拒絕。
5. **補件**：要求補件後回 consumer site → My claims，更正日期或 SN、填寫說明並送出；回到待複核，歷史保留舊值。
6. **RMA**：使用 Add RMA / DOA hold 測試異常；未解除時不得核准，也不得送出已核放的付款指令。
7. **付款**：Payouts → Prepare demo batch → 選取付款指令 → Authorize → Simulate submit。Email delivered 不改成 Paid。
8. **對帳**：Simulate timeout 後禁止重送；輸入 UAT 證據，確認失敗才能用原指令 ID 重試，或確認 simulated paid。
9. **預算／報表**：檢查 Reserved → Approved unpaid → Paid 的移轉，付款失敗／未知不釋放額度；匯出案件／SN／付款／稽核 CSV。
10. **活動重用**：Copy active campaign，修改日期／市場／產品金額／預算／文案並寫原因保存；既有案件仍保留原版本。

## 4. 可以驗收與尚未實作

| 層次 | v2 能驗收 | 不可據此宣稱完成 |
|---|---|---|
| 前台 | 導覽、五國、產品選取、多產品表單、必填、等待日、跨境通路、案件補件／取消 | 真實 SSO、會員資格、原生多語翻譯、附件保存 |
| 後台 | 共用案件、篩選、檢核、決策、Hold、客服訊息、規則版本、預算試算 | 真正人員授權、MFA、檔案稽核、不可竄改日誌 |
| 付款 | 批次與固定指令 ID、核放、配送／支付分離、Unknown 與失敗重試 | 供應商資格、資金、真實支付／銀行入帳／自動對帳 |
| 資料 | 單一分頁一致更新，CSV 樣本 | 多人共用資料庫、並發交易鎖、持久化、備份 |
| 設定 | 五國、日期、金額、預算、狀態、文案、複製與版本 | 正式矩陣匯入、任意頁面設計器、範本附件管理 |

部分產品失格的政策仍待確認；本原型不做部分核准或分次付款。批次附件下載、正式逾期排程／告警及所有外部介接均未作為已完成項目。

## 5. 驗證紀錄

- TypeScript 編譯檢查通過。
- 21 項測試通過：16 項業務狀態／表單步驟測試、4 項伺服器端元件渲染／文件測試、1 項 HTTP 靜態伺服器測試。
- 檢查包含：會員資格模擬閘門、14 天邊界、跨境通路、SN／戶別限制、原子化拒絕、補件歷史、Hold、版本快照、預算移轉、重複指令、Unknown、重試與 CSV 公式防護。
- Cloud Run 靜態 build 成功；只有編譯資產及靜態伺服器上傳，來源資料夾、會員資料、GCP 憑證與 SA 不上傳。
- 未執行瀏覽器點擊、截圖或視覺 QA；尚需使用者實際驗收互動、響應式版面及文案。

### 2026-08-28：v2.0.1 表單 Continue 修正

- 原因：第一步以錯誤訊息中的 `market` 篩選驗證，誤中條款提示的 `marketing`，使使用者在尚未顯示同意欄位時被阻擋。
- 改用明確的步驟標記：第一步會員／購買資料、第二步產品／SN、第三步樣本附件、第四步必要同意及所有規則複核。發票編號與附件也分別在可修改的步驟驗證。
- 新增五國逐步填寫的回歸測試；前三步不要求後續步驟資料，必要條款未勾仍禁止送件，行銷同意維持選填。
- 保留 v1 視覺樣式及既有 UAT 範圍；沒有增加真實會員或付款介接。

## 6. GCP 部署

| 項目 | 值 |
|---|---|
| 登入帳號 | yoyo.chen@gigabyte.com |
| Project ID | side-project-platform |
| Region | asia-east1，沿用該專案既有服務區域 |
| Cloud Run service ID | gigabyte-cashback（Cloud Run 名稱須小寫） |
| Runtime service account | gigabyte-cashback-uat@side-project-platform.iam.gserviceaccount.com，未額外授予資料 API 角色 |
| 資源 | 1 CPU、256 MiB、最小 0／最大 2 instances |
| 部署狀態 | 2026-08-28 已部署並驗證 v2.0.1，100% 流量使用 gigabyte-cashback-00004-4t7 |
| URL | [Cloud Run 服務](https://gigabyte-cashback-219894818230.asia-east1.run.app) |
| 存取方式 | 公開連結；使用者自行開放，本次更新保留 invoker-iam-disabled=true |
| 遠端驗證 | 匿名首頁／health 為 200，health 回報 2.0.1；JS／CSS SHA256 與本機已驗證 build 一致 |
| 詳細驗證紀錄 | [部署驗證 JSON](Prototype-v2-deployment-verification.json)，不含 token |

部署到 GCP 不等於正式收件。不可在此原型輸入真實個資、附件或收款帳號。

### 存取注意

使用者已將服務改成公開連結；一般瀏覽器可直接開啟，不需 Google 登入。這仍是純模擬 UAT 站，公開存取不代表正式會員或後台授權已完成。

更新後請重新整理頁面再測試 Continue；重新整理會清除該分頁的模擬案件並恢復初始樣本。

健康檢查使用 /health，避開 Cloud Run 的保留路徑。[官方保留路徑說明](https://docs.cloud.google.com/run/docs/known-issues#reserved-url-paths)
