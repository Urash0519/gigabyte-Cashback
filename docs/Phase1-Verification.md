# Phase 1 第一版驗證紀錄

日期：2026-09-09。範圍依 Spec v0.2／SA v0.6。這是開發環境驗證，尚非正式營運簽核。

## 已執行

| 檢查 | 結果與涵蓋範圍 |
| --- | --- |
| 前後台 TypeScript | 兩個 app 的 `tsc --noEmit` 通過 |
| Docker 建置 | public、admin、ABP API、DbMigrator 成功建置及啟動 |
| PostgreSQL migration | Compose 的 DbMigrator 成功執行後 API 啟動；保留資料 volume |
| 後端測試 | `dotnet test backend/aspnet-core/Gigabyte.Cashback.slnx --verbosity minimal`：Domain 5／5、EntityFrameworkCore 20／20；Application.Tests 與 TestBase 為測試基底，沒有獨立可執行案例 |
| HTTP 整合 | `node scripts/verify-operations.mjs`：22 項通過，使用真實 Cookie、API、PostgreSQL 及文件儲存 |
| 瀏覽器 | 開發登入、Dashboard、Campaign 編輯／儲存成功；修正登入後匿名 XSRF token 未更新造成的 400，重登後再次儲存成功 |

## 22 項整合檢查

涵蓋開發身份、活動不可變發布／複製、銀行遮罩、多產品與跨國金額、重複提交防護、預算保留、Hold 阻擋核准、七項審核、敏感匯出、Unknown 禁止重送、金額差異阻擋、成功付款僅入帳一次、Claim／Item 分組、操作者稽核、通知模擬、補件版本及重新計算預算、ZIP manifest、對帳差異保存、Failed 重試沿用付款 ID、報表匯出稽核及第二筆付款帳務。

脚本會建立時間戳命名的合成活動與案件並保留供查驗，不會呼叫銀行或寄出通知。不以測試件數換算需求完成百分比。瀏覽器檢查僅覆蓋上表操作，其他主要業務路徑由 HTTP 整合驗證，尚未全面逐頁人工 UAT。

## 交付界線

Google OAuth 與銀行 API 依決策延後。Email 目前為 outbox／模擬處理；會員、RMA、OCR 及病毒掃描外部服務未整合，現版提供人工檢核。正式五國營運矩陣、語言文案、銀行檔案格式、容量／備援與保存政策仍需核定。來源已提供 CI workflow；本地通過不等於 GitHub CI 或正式部署已通過。
