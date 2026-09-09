# 舊站欄位對照

版本：1.0／2026-09-09。依使用者指示，Campaigns 與 Claims 保留參考圖片可確認的欄位。下列是需求映射，並非宣稱實作已完成。登入欄位依最新指示改為模擬登入，將來串接 Google。

## 1. 圖片證據與限制

來源根目錄：`C:/Users/yoyo/Downloads/Cross-Region Promotion/`。本次以圖片檢視工具逐張檢視；超大圖片另產生暫存縮圖檢視，未修改原始資料。

| 證據 ID | 根目錄下相對路徑 | 可確認範圍 |
|---|---|---|
| B01 | `Benamic_BackendPortal/Clients Log In.png` | 登入後 Campaign 清單與操作入口；不是建立／編輯表單 |
| Q1-1～3 | `26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (1).png` 至 `(3).png` | Personal、Bank、Product Details 三步表單 |
| Q4-1～3 | `25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (1).png` 至 `(3).png` | 同上；第三張已新增三項產品並顯示移除按鈕 |
| R01 | `26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/Reseller Dropdown List.png` | 搜尋通路及跨國通路建議清單 |
| R02 | 同目錄 `Reseller Dropdown List_Pop-up Window after Incorrect Input.png` | 必須從合格清單選取，不能只輸入任意名稱 |
| T01 | `26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_claim-tracker__country_promotion=12.png` | Reference number、Search、FAQ、登入補件入口 |
| T02 | 同目錄 `promotion.aorus.com_customers.png` | 舊 Username、Password、Forgot password、Log in |

沒有提供後台 Campaign 編輯、Claims 詳情或報表內頁圖片；不能推論舊站內頁所有欄位。已知前台欄位全部納入 Claims 詳情；其餘依 Spec 設計並清楚標示追加。下拉選單未展開時，不能宣稱知道全部合法值。Q1 圖顯示芬蘭居住國而銀行選英國，銀行國不可由市場推導。

## 2. Campaign：圖片直接確認

| 舊欄位／操作 | 新模型／功能 | 證據與保留方式 |
|---|---|---|
| Promotion Name | Name | B01；活動清單、建立與編輯必備 |
| Promotion Type | PromotionType | B01；顯示 Cashback，可配置類型但第一版規則為 Q1 |
| Promotion Period | PurchaseStart／PurchaseEnd | B01；保留活動期間，另追加獨立申請期間避免混淆 |
| Promotion Countries | Markets | B01；多國與完整展開清單，不能只保存前兩國 |
| Active Promotions | Active 清單檢視 | B01；依發布狀態及期間推導 |
| Confirmed Promotions | Confirmed 清單檢視 | B01；新系統定義為已確認／發布但尚未開始，這個語意是設計決策 |
| Archived Promotions | Archived 狀態／檢視 | B01；已封存仍可追溯 |
| Cashback (3) | 類型及筆數 | B01；隨篩選結果更新，不寫死 3 |
| Search Customer | 跨活動案件／客戶搜尋 | B01；以 Email、姓名、Reference 查找，受後台權限約束 |
| Compare Campaigns | 活動／版本與績效比較 | B01；具體比較欄位依 Spec 追加 |
| View All Pending Queries | 待處理客服清單 | B01；跨活動待回覆案件入口 |
| Click campaign to view reports | 活動報表連結 | B01；保持活動篩選條件 |
| Welcome、GIGABYTE | 登入者／品牌資訊 | B01；本版登入身份為 yoyo.chen@gigabyte.com，不沿用截圖個人姓名 |

## 3. Claim：圖片直接確認

星號依圖片；本版保留欄位及驗證，正式各國矩陣可配置。確認 Email 是輸入一致性檢查，不另建第二個永久 Email 欄位。

| 分組 | 舊欄位／操作 | 新欄位建議 | 必填／行為 | 證據 |
|---|---|---|---|---|
| 個人 | Title | Title | 選填，下拉選項未展開 | Q1-1、Q4-1 |
| 個人 | First Name | FirstName | 必填 | 同上 |
| 個人 | Last Name | LastName | 必填 | 同上 |
| 個人 | Address | Address | 必填 | 同上 |
| 個人 | City | City | 必填 | 同上 |
| 個人 | Postal Code | PostalCode | 必填 | 同上 |
| 個人 | Country | ResidenceCountry | 必填，與市場分離 | 同上 |
| 個人 | Mobile Number | MobileNumber | 必填 | 同上 |
| 個人 | E-mail Address (Registered With AORUS Membership) | Email | 必填；本版由模擬身份關聯，AORUS 資格是獨立人工查核 | 同上 |
| 個人 | Confirm E-mail Address | ConfirmEmail input | 必填且一致；不是資格驗證 | 同上 |
| 銀行 | Bank country | BankCountry | 必填，獨立選擇 | Q1-2、Q4-2 |
| 銀行 | Account holder's profile type | AccountHolderProfileType | 必填；選單未展開，Individual／Business 是本版樣本 | 同上 |
| 銀行 | Full Bank Account number | BankAccountNumber | 必填、加密、預設遮罩 | 同上 |
| 銀行 | Sort Code | SortCode | 圖片 UK 必填；非 UK 由配置決定，不全球強制 | 同上 |
| 產品 | Series | Series | 必填；保留系列欄位，不與產品名稱合併 | Q1-3、Q4-3 |
| 產品 | Product | ProductId／ProductName | 必填，依活動合格產品選取 | 同上 |
| 產品 | Serial No／Serial Number | SerialNumber | 必填，每項獨立，伺服器正規化去重 | 同上 |
| 購買 | Date of Purchase | PurchaseDate | 必填；Q4 每項重複顯示，本版同發票可共用但需保留關聯 | 同上 |
| 購買 | Store name | RetailerId／RetailerName | 必填，從合格清單選取，保存識別碼與快照 | 同上、R01、R02 |
| 文件 | Please submit your proof of purchase | PurchaseEvidence attachment | 必填；同發票可共用檔案並關聯各項 | 同上 |
| 文件 | Serial number image upload | SerialEvidence attachment | 每項必填 | 同上 |
| 明細 | Add another product／Remove last product | ClaimItems 新增／移除 | Q4 證明可新增多項及移除；重新計算資格與金額 | Q1-3、Q4-3 |
| 同意 | Terms and Conditions／Privacy policy | TermsAccepted／PrivacyAccepted、版本與時間 | 必填；可分開控制，但均需通過 | 同上 |
| 同意 | Receive information on further promotions | MarketingConsent | 選填，不勾不可阻擋送出 | 同上 |
| 追蹤 | Reference number | ClaimReference | 保留查詢；公開只顯示一般狀態 | T01 |
| 登入 | Username／Password／Forgot password | 模擬登入按鈕、登出 | 依 2026-09-09 指示取代，不另實作帳密或重設流程 | T02＋使用者最新指示 |

## 4. Spec／本次設計追加欄位

下列不是 B01 內頁的已知舊欄位，也不以圖片中的示例值當作正式商業規則。

| 主體 | 追加欄位／維度 | 用途 |
|---|---|---|
| Campaign | Code、Slug、OwnerEmail、年度／季度、Status、Version、Created／Updated／Published time、發布理由 | 維護、排序、稽核與版本追蹤 |
| Campaign | Languages、Currency、TimeZone、ClaimStart／End、WaitingDays、Review／Payment／Supplement SLA | 跨區期間與作業期限 |
| Campaign | Budget、Buffer、ClaimLimit、PerPerson／Household／CategoryLimit、ExclusiveGroup | 預算及資格控制 |
| Campaign | Products (SKU、Series、Category、CashbackAmount)、Retailers (Country、有效期)、允許跨境矩陣 | 不改程式即可更新合格範圍 |
| Campaign | Description、HeroImageUrl、TermsVersion／Text、PrivacyVersion、FAQ、SupportEmail、通知模板 | 發布內容與客服 |
| Claim | CampaignVersion、Market、Language、PurchaseCountry、InvoiceNumber、PurchaseAmount、Currency | 發票核對、跨國及版本追溯 |
| Claim | AccountHolderName、IBAN、BIC／SWIFT | 常用銀行資料維度；依銀行國配置，非宣稱 UK 圖片已含這些欄位 |
| Claim | ReviewStatus、RiskHold、HoldReason、PaymentStatus、AssignedTo、ReasonCode、Submitted／Reviewed／Due time | 審核、風險、付款各自查詢 |
| Claim | 原始／核定 Cashback、核對結果、補件紀錄、內部／對外訊息、同意證據 | 決策及更正可追蹤 |
| Payment | InstructionId、Attempt、BatchId、Reference、Amount、Currency、Result、ResultDate、Evidence、ReconciliationDifference | 人工付款核放、輸出、回填與逐筆對帳；銀行 API 排除 |

## 5. 欄位驗收

1. Campaign 清單四個舊欄位與頁籤／搜尋／比較／客服入口可用，點選活動能開相應報表。
2. Claims 保留表中個人、銀行、產品、附件、同意與 Reference；後台詳情可對照前台送入值，銀行值按權限遮罩。
3. 同發票多產品保留 Series、SN 及每項序號照片；共用購買資料不能丟失明細關聯。
4. 非名單通路不可送出；銀行國與居住國不同不被前端自動覆蓋。
5. 標示模擬登入身份及樣本配置；不存在真實 Google 或銀行 API 成功的誤導文案。
