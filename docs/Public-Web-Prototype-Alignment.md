# Public-web 與 Prototype 03 對齊

日期：2026-09-09。依使用者確認，實作比對清單 1–8、10–12、14；9（申請表通路選取卡片）及 13（My claims 卡片版型）暫不實作。

## 計畫與實作

1. 主 agent：public 專用首頁／活動詳情元件與 CSS，白色導覽、可點 Logo、常駐市場選單、Hero、五國列、活動視覺卡片、完整期間、特色與流程介紹。
2. Claim agent：保留既有五步驟與欄位，增加側欄提示、已儲存標示、持續金額摘要、真實附件卡片、完整確認明細／Edit、伺服器回應的成功頁。
3. Data agent：ABP 公開活動查詢區隔整合測試資料，加入可重複執行的展示資料初始化腳本、測試公開與管理查詢。
4. 整合：型別／建置、桌面與手機瀏覽器、真實案件確認與送出、後端及 HTTP 回歸；更新文件並 commit／push。

活動詳情四區為產品、通路、How it works、Terms & FAQs。產品搜尋含型號／ID／系列／品類；通路搜尋含店名及國碼／國名。產品列 Claim 進入活動申請，產品仍於購買步驟選擇。

## 保留決策

- 按鈕式開發登入身份 `yoyo.chen@gigabyte.com`；Google 與銀行 API 延後，不恢復原型 Tracker 帳密。
- 舊站補齊欄位、ABP 持久化、草稿、真實上傳、銀行遮罩及既有 My claims 流程保留。
- 不補 Phase 2 preview、UAT guide、Reset demo；How it works 使用現行登入流程。
- Hero／活動卡為「單產品最高回饋」；申請摘要依選取產品估算，送出成功額採伺服器回傳，不能把所有產品簡單加總宣稱最高申請額。
- `dataPurpose=integration-test` 活動不出現在公開活動清單，後台／既有案件仍保留。歷史 Smoke 資料需同時符合既有 slug、描述、條款簽章才排除，並非依名稱模糊刪除。
- 展示腳本使用既有 Campaign JSON 欄位，無 schema 異動，因此不新增 migration。後端查詢遵循既有 ABP Application Service／Repository／Permission 邊界。

## 展示資料

`node scripts/seed-showcase.mjs` 建立 AORUS Upgrade Cashback，包含五國、三類產品與 12 家示範通路，清楚標示為內部展示。首次建立時依當日產生樣本日期；重跑沿用現有 ID 與內容，不覆寫後台修改，也不重設案件。API 預設 localhost:44305，可由 `CASHBACK_API_URL` 指定；登入端點限 Development。

所有樣本金額與通路均不代表已核定促銷活動。正式上線前須完成營運內容核定與全面 UAT。

## 驗證結果

- Public-web TypeScript 與 Docker production build 通過。
- 後端既有及新增測試通過：Domain 5、EF 22，共 27；新增公開活動隔離與案件綁定歷史版本檢查。HTTP 整合 24 項通過，含未登入存取案件活動設定回傳 401。
- 展示 seed 連跑兩次仍為相同活動 ID／version，未覆寫內容或新增重複活動；公開列表僅顯示展示活動，My claims 仍保留原有測試案件。
- 桌面瀏覽器：產品搜尋 `FO27`、通路國家搜尋 `France`、How it works、登入與申請入口、確認頁逐產品明細、Evidence Edit、送出成功／My claims 返回均通過。
- 真實 API 準備的合成案件 `GB-59A65696FA25483E9CB10FB7F4B53277`：三產品、四份附件，瀏覽器送出後顯示伺服器回傳 €110，My claims 為 Submitted。
- 390px 手機 viewport 已修正步驟列的 grid 最小寬度問題，頁面內容寬度 375px，無水平溢出；步驟列可橫向捲動。前後台共用元件未改版。
- 隱藏活動造成舊案件名稱／補件設定取不到的問題已修正：owner-only `GET /api/operations/claims/{id}/campaign` 回傳案件綁定版本，前台分開保存，不混入活動探索列表。

上述為本版功能驗證，不代表全面營運 UAT。既有外部服務排除範圍維持 README 記載。
