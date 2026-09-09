# Cross-Region Promotion：來源檢閱與差異紀錄

| 項目 | 說明 |
|---|---|
| 檢閱日期 | 2026-08-27 |
| 對應文件 | [SA 現行版本](Gigabyte-Cashback-SA.md)；本清冊於 v0.3 盤點時建立 |
| 來源目錄 | C:/Users/yoyo/Downloads/Cross-Region Promotion |
| 數量 | 110 份：1 PDF、1 DOCX、108 PNG |
| 本檔用途 | 追溯需求來源、標記舊站證據與本次建議的差別，不作為新活動已核准的規格 |

## 1. 檢閱方法與限制

- PDF 共 5 頁：逐頁擷取文字並檢視轉圖，第 5 頁空白；前 4 頁為系統需求。
- FAQ DOCX 擷取全部文字。來源文件的頁面渲染因環境缺少 Office／LibreOffice 未完成；本次依完整段落內容分析，不宣稱已驗證其分頁或版面。
- 108 張 PNG 全部建立索引與 OCR 輔助文字；90 張市場 LP 以縮圖總覽檢視共用結構與差異，其餘表單、條款、追蹤、FAQ、入口及後台以分段大圖檢視。影響 Scope 的條款、欄位與流程另交叉核對。
- 縮圖／OCR 不是逐字翻譯或正式產品資料轉檔；阿拉伯文、希伯來文及各國譯文尚須當地業務核稿。未展開的頁籤、未提供的操作頁與動態行為不能從截圖證實。
- 全部來源均保留原檔，未改寫。清冊連結指向本機來源，分享給其他人時須另附來源資料夾或改為受控共用位置。

## 2. 文件來源

| ID | 文件 | 檢閱重點 |
|---|---|---|
| DOC-01 | [Cross-EU Cashback System Reference.pdf](<C:/Users/yoyo/Downloads/Cross-Region Promotion/Cross-EU Cashback System Reference.pdf>) | 前後台流程、跨境購買、SN／RMA／DOA、人工審核與客服、活動設定、預算與報表 |
| DOC-02 | [Frequently Asked Questions.docx](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/Frequently Asked Questions.docx>) | Benamic 預設 FAQ：審核與付款狀態、補件、更正、取消、退換貨、帳號與付款資料；不是每一檔已核定的完整 SOP |

## 3. 與 Scope 有關的證據

| 編號 | 觀察／明示需求 | 出處 | SA 處理 |
|---|---|---|---|
| E01 | Agency 原本包含建站與代付款，內製目的是活動可重複使用；原 Agency 無法只承接本次設想的付款方式 | 本次使用者說明 | 加入營運承接與付款上線門檻，不把 CSV 視為付款人 |
| E02 | 會員以 AORUS Email 核對；另有 Agency 的追蹤帳密與忘記密碼 | DOC-01 p2；IMG-001、059、065；DOC-02 | 不能認定舊站已有 SSO；新需求 SSO 分期，會員資格仍必要 |
| E03 | 兩季均可新增產品；Q4 截圖顯示三組產品及新增／移除，不代表上限就是三件 | IMG-003、061 | Claim 主檔＋多明細；最大數量來自活動規則 |
| E04 | LP 說明同件申請內的產品須在同一張發票；T&C 限每人／戶一件、每品類一項 | IMG-058、107；IMG-005、069 | 取消舊 SA「單品拆 Claim」基準；保留戶別判斷與例外 |
| E05 | Q4 A 區為顯卡／主機板／螢幕，B 區為 CPU／電源／散熱／機殼；A＋B 同次購買才有加碼 | IMG-005；Q4 LP；IMG-058 | 組合為 Q4 活動條件式 Must，不採歷史持有資格推論 |
| E06 | Q1 僅有顯卡／主機板／螢幕；表單仍有 CPU／整機序號提示 | IMG-069、107、061 | 將殘留提示列為待清理文案，不擴增 Q1 產品範圍 |
| E07 | PDF 明確要求跨境購買，不因銀行國家限制通路；表單搜尋 amazon 可見多國通路，任意輸入會報錯 | DOC-01 p2；IMG-060、062、063 | 分開市場／居住／購買／銀行國；受控清單搜尋 |
| E08 | 顯示購買後 14 天才可送件；購買期間與申請期間不同 | IMG-003、061、005、069；兩季 LP | 修正為申請日期限制，非僅延後撥款；日期邊界待確認 |
| E09 | Q4 條款第 11 點與第 24 點申請期間不同 | IMG-005、006 | 列衝突，不直接選一個上線 |
| E10 | Q4 付款 30 天、Q1 90 天；兩季均有 10 工作天審核通知說明 | IMG-005、069；LP 流程 | SLA 活動化；需營運人力與工作日曆 |
| E11 | PDF 明列批次 SN 後查 RMA／DOA 結果未及時回到流程的問題 | DOC-01 p3 | P1 人工結果回填＋Hold；API 不是第一版唯一可行實作 |
| E12 | FAQ 分開審核、交易、預計付款日與實際付款日；已安排交易不等於銀行已入帳 | DOC-02 | Claim／Payment／Provider 狀態分離 |
| E13 | 補件後需再次人工複核；可更新購買資料／SN、上傳文件、更正聯絡及付款資料、取消 | DOC-02；IMG-064～066 | 本人案件與客服流程納入；修改不覆蓋歷史 |
| E14 | 同型號瑕疵換貨的 FAQ 與一般退貨／換型號處理不同；條款有退貨失格 | DOC-02；IMG-005、069 | 不將所有 RMA 自動拒絕，需核定例外與追償 SOP |
| E15 | 文件須有通路、日期、產品、購買金額；FAQ 列 JPG／TIF／PDF、8 MB | DOC-01 p2；DOC-02 | 人工可檢核；新格式不得默認完全相容 |
| E16 | PDF 明列預留每件金額、預算 Buffer、件數／金額告警、自動停收、授權調整 | DOC-01 p4 | P1 Must；活動預算與供應商儲值餘額分開 |
| E17 | PDF 要求單件／批次附件下載、審核與備註、聯絡紀錄、申請／SN／付款報表 | DOC-01 p3 | 保留需求；批次附件如延後須核准替代，不能默刪 |
| E18 | 後台實為活動總覽，有搜尋客戶、比較活動、報表與待處理查詢入口；三檔活動列出期間／國家 | IMG-108 | 不因檔名 Clients Log In 誤判只有登入；也不虛構內頁或完整 SOP |
| E19 | Q4／Q1 不同國家組合；DACH 涵蓋多國及 EUR／CHF；BE 有荷／法兩語；EG／IL 有 RTL | 全部 LP；IMG-004、067 | 市場、語系、幣別不是一對一；首波支援清單須核定 |
| E20 | Portal 有當期、過去活動與 Laptop 活動；Q1 LP 有其他遊戲促銷橫幅 | IMG-068、108；Q1 LP | 保留活動導覽與外連；未取得 Laptop 細則，不新增筆電／遊戲兌換系統 |
| E21 | 行銷同意為選填；表單另有條款／隱私告知 | IMG-003、061、005、069 | 不以行銷同意作申請必要條件；保留版本 |
| E22 | 舊 FAQ 與 T&C 使用 Benamic、舊客服與安全認證說明；資料處理段落另有通用模板痕跡 | DOC-02；IMG-005、006、069 | 新供應商與責任須重核，不複製舊認證或客服承諾 |

## 4. 後台能證實與不能證實的範圍

IMG-108 可見 Active／Confirmed／Archived Promotions、View All Pending Queries、Search Customer、Compare Campaigns，以及點活動查看報表的說明。可見的 Cashback 活動為 Q1 2026、Laptop 2025 與 Q4 2025。

尚缺：案件詳情、審核工作清單、補件編輯、活動設定、預算操作、權限設定、實際報表欄位、付款批次、對帳與客服內頁。這些能力在 PDF 中有部分需求描述，但不能認定 Agency 的操作方式、欄位或自動化程度已被截圖證實。

未重製後台畫面上的個人姓名等非必要資訊。

## 5. 其餘前台與後台截圖：18 張

| ID | 原檔 | 檢閱重點 |
|---|---|---|
| IMG-001 | [25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (1).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (1).png>) | Q4 申請個人／AORUS Email 資料 |
| IMG-002 | [25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (2).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (2).png>) | Q4 收款資料；依銀行國家呈現欄位 |
| IMG-003 | [25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (3).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_en_gb_customer-apply-for-promotion__country_promotion=2 (3).png>) | Q4 多產品申請、Add another／移除、文件與同意 |
| IMG-004 | [25Q4_Landing Page Screenshots/00 Other Pages/Flag Page/promotion.aorus.com_land-flags.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/Flag Page/promotion.aorus.com_land-flags.png>) | Q4 旗幟入口，29 國 |
| IMG-005 | [25Q4_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_en_gb_terms-and-conditions-promotion__country_promotion=2 (1).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_en_gb_terms-and-conditions-promotion__country_promotion=2 (1).png>) | Q4 T&C 主頁，產品／組合／期間／限制與金額 |
| IMG-006 | [25Q4_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_en_gb_terms-and-conditions-promotion__country_promotion=2 (2).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_en_gb_terms-and-conditions-promotion__country_promotion=2 (2).png>) | Q4 T&C 續頁，含申請日期衝突與資料處理文字 |
| IMG-059 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (1).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (1).png>) | Q1 申請個人／AORUS Email 資料 |
| IMG-060 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (2).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (2).png>) | Q1 收款資料；畫面銀行國家不等同站台國家 |
| IMG-061 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (3).png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/promotion.aorus.com_customer-apply-for-promotion__country_promotion=12 (3).png>) | Q1 產品申請、Add another、文件與同意 |
| IMG-062 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/Reseller Dropdown List.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/Reseller Dropdown List.png>) | Q1 可搜尋通路，多國 amazon 建議項目 |
| IMG-063 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/Reseller Dropdown List_Pop-up Window after Incorrect Input.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Form/Reseller Dropdown List_Pop-up Window after Incorrect Input.png>) | Q1 未選合格通路項目時的錯誤提示 |
| IMG-064 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_claim-tracker__country_promotion=12.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_claim-tracker__country_promotion=12.png>) | Claim Reference 追蹤入口與登入連結 |
| IMG-065 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_customers.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_customers.png>) | Agency 客戶追蹤登入／忘記密碼 |
| IMG-066 | [26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_faq__country_promotion=12.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Claim Tracker & FAQ Page/promotion.aorus.com_faq__country_promotion=12.png>) | FAQ 摺疊清單；完整內容另見 DOC-02 |
| IMG-067 | [26Q1_Landing Page Screenshots/00 Other Pages/Flag Page/promotion.aorus.com_land-flags.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Flag Page/promotion.aorus.com_land-flags.png>) | Q1 旗幟入口，22 國 |
| IMG-068 | [26Q1_Landing Page Screenshots/00 Other Pages/Portal Page/promotion.aorus.com_.png.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/Portal Page/promotion.aorus.com_.png.png>) | 活動 Portal，進行中／過去與 Laptop 活動 |
| IMG-069 | [26Q1_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_terms-and-conditions-promotion__country_promotion=12.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/00 Other Pages/T&C/promotion.aorus.com_terms-and-conditions-promotion__country_promotion=12.png>) | Q1 T&C，三品類、申請限制、90 天付款 |
| IMG-108 | [Benamic_BackendPortal/Clients Log In.png](<C:/Users/yoyo/Downloads/Cross-Region Promotion/Benamic_BackendPortal/Clients Log In.png>) | Benamic 登入後客戶活動總覽，非登入表單 |

## 6. 全部市場 Landing Page：90 張

每組資料夾有 _1、_2 兩張；下列連結逐一覆蓋全部 LP，並非只抽樣英語版。每組檢視項目包括活動標題／期間、頁面語言與方向、產品區塊、顯示幣別、通路列表、流程、細則及頁尾。產品頁籤未全部展開，不據此重建所有 SKU／回饋金額。

Q4 為 26 組市場／語言資料夾、52 張；Q1 為 19 組、38 張。DACH／Baltics 是多國群組，Belgium 兩語是同一國，故旗幟頁國家數為 29／22，不能直接用資料夾數代替。兩季市場差異包含 BG、HR、GR、IL、RO、RS、SK 在 Q1 未見相應 LP。

### 6.1 25Q4：26 組／52 張

| 原資料夾 | 截圖 1 | 截圖 2 | 市場結構／範圍觀察 |
|---|---|---|---|
| Baltics (LT, LV, EE) | [IMG-007](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/Baltics (LT, LV, EE)/Baltics (LT, LV, EE)_LP Screenshot_1.png>) | [IMG-008](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/Baltics (LT, LV, EE)/Baltics (LT, LV, EE)_LP Screenshot_2.png>) | EE／LT／LV 共用英語市場組 |
| BE (Dutch) | [IMG-009](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BE (Dutch)/BE (Dutch)_LP Screenshot_1.png>) | [IMG-010](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BE (Dutch)/BE (Dutch)_LP Screenshot_2.png>) | 同一國的荷蘭語／法語版本，非兩個國家 |
| BE (French) | [IMG-011](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BE (French)/BE (French)_LP Screenshot_1.png>) | [IMG-012](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BE (French)/BE (French)_LP Screenshot_2.png>) | 同一國的荷蘭語／法語版本，非兩個國家 |
| BG (Bulgaria) | [IMG-013](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BG (Bulgaria)/BG_LP Screenshot_1.png>) | [IMG-014](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/BG (Bulgaria)/BG_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| CZ | [IMG-015](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/CZ/CZ_LP Screenshot_1.png>) | [IMG-016](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/CZ/CZ_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| DACH | [IMG-017](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/DACH/DACH_LP Screenshot_1.png>) | [IMG-018](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/DACH/DACH_LP Screenshot_2.png>) | AT／CH／DE 市場組；EUR／CHF 不宜合成單一幣別 |
| DK | [IMG-019](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/DK/DK_LP Screenshot_1.png>) | [IMG-020](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/DK/DK_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| EG | [IMG-021](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/EG/EG_LP Screenshot_1.png>) | [IMG-022](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/EG/EG_LP Screenshot_2.png>) | 阿拉伯語／RTL；本地幣別與通路需獨立核定 |
| ES | [IMG-023](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/ES/ES_LP Screenshot_1.png>) | [IMG-024](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/ES/ES_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| FI | [IMG-025](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/FI/FI_LP Screenshot_1.png>) | [IMG-026](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/FI/FI_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| FR | [IMG-027](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/FR/FR_LP Screenshot_1.png>) | [IMG-028](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/FR/FR_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| GR (Greece) | [IMG-029](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/GR (Greece)/GR_LP Screenshot_1.png>) | [IMG-030](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/GR (Greece)/GR_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| HR (Croatia) | [IMG-031](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/HR (Croatia)/HR_LP Screenshot_1.png>) | [IMG-032](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/HR (Croatia)/HR_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| HU (Hungary) | [IMG-033](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/HU (Hungary)/HU_LP Screenshot_1.png>) | [IMG-034](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/HU (Hungary)/HU_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| IL | [IMG-035](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/IL/IL_LP Screenshot_1.png>) | [IMG-036](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/IL/IL_LP Screenshot_2.png>) | 希伯來語／RTL；Q1 未見此市場 |
| IT | [IMG-037](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/IT/IT_LP Screenshot_1.png>) | [IMG-038](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/IT/IT_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| NL | [IMG-039](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/NL/NL_LP Screenshot_1.png>) | [IMG-040](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/NL/NL_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| NO | [IMG-041](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/NO/NO_LP Screenshot_1.png>) | [IMG-042](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/NO/NO_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| PL | [IMG-043](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/PL/PL_LP Screenshot_1.png>) | [IMG-044](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/PL/PL_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| PT | [IMG-045](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/PT/PT_LP Screenshot_1.png>) | [IMG-046](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/PT/PT_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| RO (Romania) | [IMG-047](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/RO (Romania)/RO_LP Screenshot_1.png>) | [IMG-048](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/RO (Romania)/RO_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| RS (Serbia) | [IMG-049](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/RS (Serbia)/RS_LP Screenshot_1.png>) | [IMG-050](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/RS (Serbia)/RS_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| SE (Sweden) | [IMG-051](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/SE (Sweden)/SE_LP Screenshot_1.png>) | [IMG-052](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/SE (Sweden)/SE_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| SK (Slovakia) | [IMG-053](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/SK (Slovakia)/SK_LP Screenshot_1.png>) | [IMG-054](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/SK (Slovakia)/SK_LP Screenshot_2.png>) | Q4 有資料；Q1 未見相應市場 |
| TR (Turkey) | [IMG-055](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/TR (Turkey)/TR_LP Screenshot_1.png>) | [IMG-056](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/TR (Turkey)/TR_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| UK | [IMG-057](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/UK/UK_LP Screenshot_1.png>) | [IMG-058](<C:/Users/yoyo/Downloads/Cross-Region Promotion/25Q4_Landing Page Screenshots/UK/UK_LP Screenshot_2.png>) | GBP 市場；主文 EUR 與當地固定換算額需分開理解 |

### 6.2 26Q1：19 組／38 張

| 原資料夾 | 截圖 1 | 截圖 2 | 市場結構／範圍觀察 |
|---|---|---|---|
| Baltics (EE, LT, LV) | [IMG-070](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/Baltics (EE, LT, LV)/Baltics (LT, LV, EE)_LP Screenshot_1.png>) | [IMG-071](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/Baltics (EE, LT, LV)/Baltics (LT, LV, EE)_LP Screenshot_2.png>) | EE／LT／LV 共用英語市場組 |
| BE (Dutch) | [IMG-072](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/BE (Dutch)/BE (Dutch)_LP Screenshot_1.png>) | [IMG-073](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/BE (Dutch)/BE (Dutch)_LP Screenshot_2.png>) | 同一國的荷蘭語／法語版本，非兩個國家 |
| BE (French) | [IMG-074](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/BE (French)/BE (French)_LP Screenshot_1.png>) | [IMG-075](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/BE (French)/BE (French)_LP Screenshot_2.png>) | 同一國的荷蘭語／法語版本，非兩個國家 |
| CZ | [IMG-076](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/CZ/CZ_LP Screenshot_1.png>) | [IMG-077](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/CZ/CZ_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| DACH (AT, CH, DE) | [IMG-078](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/DACH (AT, CH, DE)/DACH (AT, CH, DE)_LP Screenshot_1.png>) | [IMG-079](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/DACH (AT, CH, DE)/DACH (AT, CH, DE)_LP Screenshot_2.png>) | AT／CH／DE 市場組；EUR／CHF 不宜合成單一幣別 |
| DK | [IMG-080](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/DK/DK_LP Screenshot_1.png>) | [IMG-081](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/DK/DK_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| EG | [IMG-082](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/EG/EG_LP Screenshot_1.png>) | [IMG-083](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/EG/EG_LP Screenshot_2.png>) | 阿拉伯語／RTL；本地幣別與通路需獨立核定 |
| ES | [IMG-084](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/ES/ES_LP Screenshot_1.png>) | [IMG-085](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/ES/ES_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| FI | [IMG-086](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/FI/FI_LP Screenshot_1.png>) | [IMG-087](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/FI/FI_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| FR | [IMG-088](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/FR/FR_LP Screenshot_1.png>) | [IMG-089](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/FR/FR_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| HU | [IMG-090](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/HU/HU_LP Screenshot_1.png>) | [IMG-091](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/HU/HU_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| IT | [IMG-092](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/IT/IT_LP Screenshot_1.png>) | [IMG-093](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/IT/IT_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| NL | [IMG-094](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/NL/NL_LP Screenshot_1.png>) | [IMG-095](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/NL/NL_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| NO | [IMG-096](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/NO/NO_LP Screenshot_1.png>) | [IMG-097](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/NO/NO_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| PL | [IMG-098](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/PL/PL_LP Screenshot_1.png>) | [IMG-099](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/PL/PL_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| PT | [IMG-100](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/PT/PT_LP Screenshot_1.png>) | [IMG-101](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/PT/PT_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| SE | [IMG-102](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/SE/SE_LP Screenshot_1.png>) | [IMG-103](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/SE/SE_LP Screenshot_2.png>) | 英語內容不代表同一市場／幣別；各地通路需獨立設定 |
| TR | [IMG-104](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/TR/TR_LP Screenshot_1.png>) | [IMG-105](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/TR/TR_LP Screenshot_2.png>) | 同季共用模板；文字、金額與通路須按市場核稿 |
| UK | [IMG-106](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/UK/UK_LP Screenshot_1.png>) | [IMG-107](<C:/Users/yoyo/Downloads/Cross-Region Promotion/26Q1_Landing Page Screenshots/UK/UK_LP Screenshot_2.png>) | GBP 市場；主文 EUR 與當地固定換算額需分開理解 |

## 7. 還需要需求單位提供的資料

1. 首波國家／語言／幣別與正式 SKU、金額、通路矩陣，以及是否採 Q4 組合加碼。
2. 完整後台操作示範、審核／補件／異常 SOP、報表樣本與欄位說明。
3. 原付款與對帳流程、失敗／退回／追償案例，及新的付款承接安排。
4. AORUS／產品／RMA API 文件與時程；「註冊清單」的確切對象與授權範圍。
5. 新版條款、翻譯、客服、資料處理與保存責任；舊站未結案件及資料交接方案。

上述缺口不妨礙 Scope 討論，但會影響功能估算、驗收及正式營運。

## 8. 外部資料

Tremendous 官方 API 文件於 2026-08-27 查閱；可確認的功能與限制、逐項連結及尚待供應商回覆的事項整理於 [SA 第 8 節](Gigabyte-Cashback-SA.md#8-tremendous-評估現在查可行性串接可分期)。外部文件不是已簽合約或本帳戶的正式服務保證。
