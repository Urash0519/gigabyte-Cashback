# 報表維度與指標

版本：1.0／2026-09-09。適用 Spec BE-02、BE-06、BE-18。以下是本案需求設計，不是既有後台內頁的復刻，也不是已完成清單。

## 1. 類似站台參考

2026-09-09 查閱官方資料：

- [Talon.One Campaign analytics](https://docs.talon.one/docs/product/campaigns/analytics/overview)：活動與整體總覽、活動篩選及匯出，支持本案「總覽→活動→明細」結構。
- [Talon.One Campaign insights](https://docs.talon.one/docs/product/campaigns/analytics/campaign-insights)：活動兌換、折扣成本、購物金額、時間粒度及撤銷資料；借用時間趨勢與成本拆分概念，不直接把 coupon redemption 當成本案已付款。
- [Talon.One Campaign budgets](https://docs.talon.one/docs/product/campaigns/settings/manage-campaign-budgets)：活動、客戶、店家等層級限制；支持本案預算／通路／申請者维度。
- [Voucherify Performance analytics](https://docs.voucherify.io/analyze/performance-analytics)：成功／失敗兌換趨勢；借用結果及時間維度。
- [Voucherify Voucher tracking](https://docs.voucherify.io/analyze/voucher-tracking)：依 customer、campaign、result、date range 篩選及 CSV 匯出；對應本案活動、結果、日期篩選與受控匯出。

以上產品屬 promotion／incentive 管理，並非銀行 Cashback 對帳系統；下面的審核／付款／SLA 公式是本案自行定義。

## 2. 共用維度

| 維度 | 欄位／選项 | 適用 |
|---|---|---|
| 活動 | ID、名稱、類型、年度、季度、狀態、發布版本、Owner | 全部報表與兩活動比較 |
| 地區 | 活動市場、居住國、購買國、銀行國（分開） | 案件、跨境、付款 |
| 語言／幣別 | UI 語言、原幣 Currency | 全部；金額強制按幣別分組 |
| 時間 | SubmittedAt／ApprovedAt／PaidAt 擇一；日、週、月、季；時區 | 趨勢；預設提交日 cohort |
| 審核 | Submitted、UnderReview、MoreInfoRequired、Approved、Rejected、Cancelled | 件數與工作佇列 |
| 風險 | Hold 有無、原因、查核類型、解除結果 | 異常待辦，不併入審核狀態 |
| 產品 | 品類、Series、SKU／型號、活動產品版本 | 產品件數／Cashback 金額 |
| 通路 | 通路 ID、名称、所屬國、跨境與否 | 成效／資格異常 |
| 作業 | Reviewer／Owner、ReasonCode、SLA 到期／逾期、案件年齡区間 | 工作量及服務品質 |
| 付款 | 狀態、批次、付款指令、人工結果日期、對帳差異類型 | 核放／付款／對帳 |
| 通知 | 類型、Queued／Sent／Failed、重寄次數 | 通知異常 |

申請者姓名、地址、電話、Email、SN、完整銀行帳號屬案件明細／受控搜尋，預設不作为公用圖表分組，不匯出完整銀行資料。Owner／Reviewer 可用模擬身份 yoyo.chen@gigabyte.com。

## 3. 指標公式與分母

所有日期區間為 `[from, to)`，以選定時區顯示；資料保存 UTC。分母為零時回 `null` 並顯示「—」，不可假報 0%。多產品 join 前先以 ClaimId 去重，金額按 Currency 分開。

| 指標 | 定義／公式 | 粒度與限制 |
|---|---|---|
| Submitted claims | COUNT DISTINCT 已送出 ClaimId，排除 Draft | Claim |
| Claimed products | COUNT ClaimItemId | 產品，不能等同案件數 |
| 狀態件數 | COUNT DISTINCT ClaimId WHERE ReviewStatus = X | 目前狀態；不是歷史曾進過此狀態次數 |
| 核准率 | Approved / (Approved + Rejected) × 100% | 已決策案件；補件／待審／取消不進分母 |
| 補件率 | 曾要求補件的 DISTINCT ClaimId / Submitted claims × 100% | 需補件事件歷史，不只目前 MoreInfoRequired |
| Hold 件數／率 | 目前 Hold 案件／Submitted claims | 明確為目前風險狀態 |
| 申請／核定回饋額 | SUM(Claim 原始額／核定額) | 同案件只加一次；按幣別 |
| 已核准未付額 A | 核准承諾尚未確認成功支付的 Ledger 餘額 | Failed／Unknown 仍保留承諾 |
| 已付額 P | 已確認 Succeeded 指令的淨支付額 | 不計批次匯出、重寄或技術重試 |
| 可用預算 | B − F − R − A − P | Budget、Buffer、Reserved 各自列示 |
| 預算承諾使用率 | (R + A + P) / (B − F) × 100% | 分母正值才計算；不只看已付 |
| 支付完成率 | Succeeded 指令數 / 已建立指令數 × 100% | 以固定 InstructionId 去重，不計 Attempt 次數 |
| 付款異常 | Unknown 件數、Failed 件數、未匹配／金額／幣別差異件數 | 各類分開；同指令重試不重算邏輯款項 |
| 平均回饋 | 核准 Cashback 合計 / Approved claims | 原幣；非投資報酬率 |
| 平均／中位審核時間 | FinalDecisionAt − SubmittedAt | 已最終決策案件；自然經過時間，未做工作日曆不得稱工作日 SLA |
| 付款完成時間 | PaidAt − AuthorizedAt | 已付指令，Unknown 不假設完成 |
| 逾期待辦 | 未結案且 DueAt < ReportAsOf 的案件／指令數 | 區分審核／補件／付款 DueAt |
| 通知失敗率 | Failed 通知數 / 已嘗試通知數 | 區分邏輯通知與重寄次數 |

購買金額僅代表已申請且提供發票的金額，不能聲稱活動全部銷售額。缺乏曝光／合格銷售母體時不計轉換率、redemption rate 或 ROI。各產品分組的 distinct Claim 件數可能重疊，分組件數不可直接相加為總件數。

## 4. 第一版報表組合

1. 營運總覽：收件、待審、補件、Hold、核准未付、Unknown／Failed、可用預算，點擊下鑽保留篩選。
2. 活動比較：兩活動的期間、市場、規則、預算與件數／核准率／回饋額；不同幣別分開，顯示資料窗口避免把活動天數差誤認為成效。
3. 案件／產品／通路：案件與產品件數分開，搭配市場、品類、Series、SKU、通路與時間趨勢。
4. 預算：B／F／R／A／P／Available 及 Ledger 明細，能核對同幣別總數。
5. 人工付款與對帳：固定指令、批次、金額、結果、日期、憑證與差異；不等待銀行 API。
6. 客服／SLA：待回覆、補件到期、審核／付款到期、通知失敗与負責人。

每張報表顯示 `GeneratedAt`、`AsOf`、時間欄位、時區、篩選、幣別與資料來源；CSV 匯出同一查詢結果、UTF-8、正確 escape，防試算表公式注入。匯出留下 actor、scope、timestamp、row count 的稽核。沒有可用事件／欄位時顯示未提供而非捏造數值；交付狀態以 README 驗收記錄為準。
