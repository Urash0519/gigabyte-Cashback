# 後台繁體中文與公開 UAT

2026-09-10 使用者決策：移除 UAT 入口密碼，所有人均可操作；後台新增繁體中文。

- Gateway 不再使用 HTTP Basic authentication，不再掛載入口密碼秘密。Cloud Run 保留已批准的 `allUsers`／Run Invoker。
- 前後台可直接開啟；應用程式仍保留開發登入按鈕，建立 `yoyo.chen@gigabyte.com` 模擬身份。任何訪客可透過按鈕使用 UAT 後台，所有測試者共用資料。
- 後台頁首可選 English／繁體中文。`cashback.admin.locale` 保存後台偏好，與前台偏好分開；HTML lang 同步更新。
- 翻譯涵蓋登入、總覽、活動編輯／發布／比較、案件與更正歷程、付款與對帳、報表、通知、稽核。動態活動文案、姓名、備註、API enum／資料值與匯出內容維持原文。
- 語系切換不提交表單、不清除目前編輯內容、不改動篩選所用的 enum。狀態 Badge 保留原始樣式判斷，僅翻譯顯示標籤。
- 本次不修改後端業務邏輯或 schema，沒有新增 migration；API、資料庫與附件儲存沿用既有 UAT。
- 前端 TypeScript／建置檢查與實際瀏覽器語系切換驗證；雲端執行 `verify-uat-access.mjs` 確認無 Cookie／Authorization 可開頁，並以 `verify-operations.mjs` 驗證完整業務流程。

驗證結果：新版 Cloud Run `cashback-uat-00002-w6n` 已承接 100% 流量；免密碼入口與 24 項業務測試通過。瀏覽器確認中文欄位、活動編輯輸入在語系切換後保留、報表／付款／通知顯示及重新整理保留語系。入口密碼的兩個舊 Secret 版本已停用，保留復原可能但不再提供給 runtime 使用。
