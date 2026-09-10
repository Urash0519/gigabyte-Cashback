import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "zh-TW";
export const translations: Record<string, string> = {
  Netherlands: "荷蘭",
  "Latest campaign rules applied. Review your details and confirm the terms again before submitting.":
    "已套用最新活動規則。送出前請重新檢查資料，並再次確認活動條款與隱私權聲明。",
  "Total invoice amount ({currency})": "發票總金額（{currency}）",
  PendingReview: "待檢查",
  Clean: "已通過檢查",
  RejectedFile: "檔案未通過",
  Quarantined: "已隔離",
  "Bank account holder and account are required.":
    "請填寫帳戶持有人，以及 IBAN 或銀行帳號。",
  "Invoice and each product serial photo are required.":
    "請上傳發票，以及每項產品的序號照片。",
  "Eligible products and serial numbers are required.":
    "請至少加入一項適用產品，並填寫每項產品的序號。",
  "Category quantity limit exceeded.": "同類別產品數量超過活動上限。",
  "Product quantity limit exceeded.": "此產品數量超過活動上限。",
  "Duplicate serial in claim.": "申請內有重複序號，請檢查各項產品的序號。",
  "Product purchase date is not eligible.":
    "產品購買日期不在活動期間內，或尚未滿等待期。",
  "Product retailer is not eligible.": "此產品的購買通路不符合活動資格。",
  "Claim limit reached.": "活動申請數已達上限。",
  "Applicant claim limit exceeded.": "此申請人的申請次數已達活動上限。",
  "An application already exists in an exclusive campaign group.":
    "你已申請同組互斥活動，無法重複參加。",
  "An exclusive campaign application already reserves this applicant.":
    "你已有同組互斥活動的申請，無法再次送出。",
  "Interface language": "介面語言",
  CASHBACK: "現金回饋",
  "GIGABYTE REWARDS ·": "GIGABYTE 回饋 · ",
  "products ·": "項產品 ·",
  "KB ·": "KB ·",
  "We have received your claim for": "我們已收到你的活動申請：",
  ". Keep your reference handy while we review your application.":
    "。審核期間請保留申請編號，以便查詢。",
  Step: "步驟",
  "of 5 ·": "／5 ·",
  "Terms — version": "活動條款 — 版本",
  eligible: "項適用",
  selected: "已選擇",
  product: "產品",
  "Saved account numbers are masked when retrieved. Leave a masked value unchanged to keep the stored account.":
    "已儲存的銀行帳號會遮罩顯示。若要保留原帳號，請勿修改遮罩內容。",
  "Date of purchase": "購買日期",
  "Country of purchase": "購買國家",
  "Store name / eligible retailer": "店家名稱／適用通路",
  "Select retailer": "選擇通路",
  "Products on the same invoice": "同張發票上的產品",
  Series: "產品系列",
  "Invoice number": "發票號碼",
  "Purchase amount": "購買金額",
  "Reason / reference": "原因／參考資料",
  "Checking campaign updates…": "正在檢查活動更新…",
  "Campaign has a newer published version. Review and apply the latest version before submitting.":
    "活動條件已更新，請確認並套用最新版後再送出。",
  "Terms and privacy consent are required.": "請同意活動條款並確認隱私權聲明。",
  "Complete applicant name and address.":
    "請填寫完整姓名與地址，包括城市及郵遞區號。",
  "Email confirmation must match.": "電子郵件格式須正確，且兩次輸入必須相同。",
  "Select an eligible campaign market.": "請選擇活動適用的市場。",
  "Residence and purchase country must be campaign markets.":
    "居住國家與購買國家必須屬於活動適用市場。",
  "Purchase date or waiting period is not eligible.":
    "購買日期不在活動期間內，或購買後等待期尚未結束。請核對活動購買期間與等待天數。",
  "Invoice number and purchase amount are required.":
    "請填寫發票號碼與大於零的購買金額。",
  "Retailer is not eligible.":
    "此通路不符合申請資格，請確認通路、購買國家及購買日期。",
  "Serial number already claimed.": "此產品序號已被申請。",
  "Campaign is not accepting claims.":
    "本活動目前未開放申請，請確認申請期間或聯絡客服。",
  "A correction reason is required.": "請填寫更正原因。",
  "Claim cannot be submitted from this state.": "此案件目前的狀態無法送出。",
  "Evidence must be PDF, JPEG, PNG or TIFF up to 8 MB.":
    "證明文件須為 PDF、JPEG、PNG 或 TIFF，且不得超過 8 MB。",
  "File signature does not match extension.":
    "檔案內容與副檔名不符，請上傳有效的圖片或文件。",
  "Maximum 20 evidence files per claim.": "每筆申請最多可上傳 20 個證明檔案。",
  "A reason is required.": "請填寫原因。",
  "Bank changes are blocked after payment authorization or closure.":
    "付款已授權或案件已結束，無法變更銀行資料。",
  "Reason and complete bank details are required.":
    "請填寫變更原因、帳戶持有人及銀行帳號。",
  Language: "語言",
  English: "English",
  "Traditional Chinese": "繁體中文",
  Germany: "德國",
  France: "法國",
  Spain: "西班牙",
  Italy: "義大利",
  "United Kingdom": "英國",
  "Internal evaluation · use synthetic personal and bank details":
    "內部測試環境 · 請使用虛構的個人與銀行資料",
  "GIGABYTE Cashback home": "GIGABYTE 現金回饋首頁",
  "Main navigation": "主要導覽",
  "Promotion market": "活動市場",
  "Cashback offers": "現金回饋活動",
  "My claims": "我的申請",
  "Administration ↗": "後台管理 ↗",
  "Sign out": "登出",
  "Sign in": "登入",
  "Development access": "測試登入",
  "Your cashback workspace": "你的現金回饋專區",
  "Continue with the evaluation identity to save and track your claims.":
    "使用測試身分登入，即可儲存及追蹤申請。",
  "Signing in…": "登入中…",
  "Sign in for development": "以測試身分登入",
  "Google sign-in will be connected in a later release.":
    "Google 登入將於後續版本提供。",
  "Track reviews, provide information and follow payment outcomes.":
    "追蹤審核進度、補充資料及查看付款結果。",
  Refresh: "重新整理",
  "Your applications": "你的申請",
  Reference: "申請編號",
  Promotion: "活動",
  Review: "審核",
  Payment: "付款",
  Reward: "回饋金額",
  Action: "操作",
  "Continue draft": "繼續填寫",
  "View case": "查看申請",
  "No claims yet. Choose a promotion to start.":
    "尚無申請，請選擇活動開始填寫。",
  "Back to my claims": "返回我的申請",
  "Application summary": "申請摘要",
  products: "項產品",
  Invoice: "發票",
  "Provide requested information": "補充所需資料",
  "Contact support": "聯絡客服",
  "Add case message": "新增案件留言",
  "Your message was recorded.": "已儲存你的留言。",
  "Cancellation request": "取消申請",
  "Cancellation is only completed if there is no payment risk. Otherwise contact support for investigation.":
    "確認沒有付款風險後才能取消；如有付款疑慮，請聯絡客服協助查詢。",
  "Request cancellation": "申請取消",
  "Cancellation recorded.": "已記錄取消申請。",
  Timeline: "處理歷程",
  "GIGABYTE Cashback · Sample environment": "GIGABYTE 現金回饋 · 示範環境",
  Draft: "草稿",
  Submitted: "已送出",
  UnderReview: "審核中",
  MoreInfoRequired: "待補件",
  Approved: "已核准",
  Rejected: "未通過",
  Cancelled: "已取消",
  OnHold: "暫停處理",
  None: "尚未付款",
  Pending: "待處理",
  Processing: "處理中",
  Paid: "已付款",
  Failed: "失敗",
  Unknown: "結果待確認",
  "UP TO": "最高回饋",
  "PER PRODUCT": "每件產品",
  "Choose your upgrade": "選擇升級產品",
  "Check the products, participating retailers and purchase dates for your selected market.":
    "查看所選市場的適用產品、合作通路及購買期間。",
  "Prepare your claim": "準備申請資料",
  "Sign in, enter your details and add eligible products from one invoice after the waiting period.":
    "登入並填寫資料，在等待期結束後加入同張發票上的適用產品。",
  "Send your evidence": "上傳證明文件",
  "Upload your invoice and a serial-number image for each product. Review your details before submitting.":
    "上傳發票與各項產品的序號照片，確認資料後送出。",
  "Follow every step": "掌握處理進度",
  "Open My claims to follow the review, respond to requests and check your payment status.":
    "前往「我的申請」追蹤審核、回覆補件要求及查看付款狀態。",
  "Build more.": "升級你的裝備。",
  "Get more back.": "享受更多回饋。",
  "Your next upgrade, rewarded. Explore eligible products and bring them together in one cashback claim.":
    "讓每次升級都有回饋。探索適用產品，合併至同一筆現金回饋申請。",
  "Explore cashback ↗": "探索回饋活動 ↗",
  "Track a claim": "追蹤申請",
  "Choose products": "選擇產品",
  "One invoice": "同張發票",
  "Track every step": "追蹤進度",
  "FIVE MARKETS. ONE PROGRAMME.": "五大市場，同享回饋。",
  "CASHBACK OFFERS": "現金回饋活動",
  "Your next upgrade starts here.": "從這裡開始你的下一次升級。",
  "Explore promotions for {market}.": "探索適用於{market}的活動。",
  "Eligibility and rewards depend on each offer.":
    "申請資格與回饋金額依各活動規定。",
  "Open for claims": "開放申請",
  "Not accepting claims": "暫不受理",
  "Up to {amount}": "最高 {amount}",
  "per eligible product": "每件適用產品",
  "Purchase period": "購買期間",
  "Claim period": "申請期間",
  "View offer": "查看活動",
  "No published campaigns for this market. Choose another market or check back later.":
    "此市場目前沒有已發布活動，請選擇其他市場或稍後再查看。",
  "Programme benefits": "活動特色",
  "Same-invoice claims": "同張發票合併申請",
  "Keep eligible products together": "一次申請多項適用產品",
  "Cross-border purchases": "跨國購買",
  "Check each offer’s eligible stores": "依活動確認適用通路",
  "Traceable decisions": "處理過程可追蹤",
  "Follow review and payment separately": "分別掌握審核與付款進度",
  "HOW IT WORKS": "申請流程",
  "From upgrade to cashback.": "從升級產品到收到回饋。",
  "← All offers": "← 所有活動",
  "BUY BETWEEN": "購買期間",
  "CLAIM WINDOW": "申請期間",
  "Start your claim →": "開始申請 →",
  "Claims currently unavailable": "目前無法申請",
  "Wait {days} days after purchase · {timeZone}":
    "購買後須等待 {days} 天 · {timeZone}",
  "Version {version}": "版本 {version}",
  "Up to {amount} per eligible product. Your total depends on the products and campaign rules.":
    "每件適用產品最高回饋 {amount}，總金額依產品與活動規則計算。",
  "Campaign details": "活動詳情",
  "Eligible products": "適用產品",
  Retailers: "合作通路",
  "How it works": "申請流程",
  "Terms & FAQs": "條款與常見問題",
  "PROMOTION DETAILS": "活動詳情",
  "Choose your reward.": "選擇你的回饋。",
  "Shop across borders.": "跨國購買也能參加。",
  "From purchase to payout.": "從購買到領取回饋。",
  "Clear rules. No surprises.": "清楚了解活動規則。",
  "Search products": "搜尋產品",
  "Search stores or countries": "搜尋通路或國家",
  "Product, series or category": "產品、系列或類別",
  "Store or country": "通路或國家",
  "Claim →": "申請 →",
  "No products match your search.": "找不到符合條件的產品。",
  "Maximum {count} item(s) per category. All claimed products must be on the same invoice. Selecting Claim opens the application; choose your products in the purchase step.":
    "每個類別最多 {count} 件，所有申請產品須列於同張發票。點選「申請」後，請於購買步驟選擇產品。",
  "Your activity market is {market}. Your purchase country may differ. Select an eligible retailer by purchase country when applying.":
    "你的活動市場為{market}，購買國家可以不同。申請時請依購買國家選擇適用通路。",
  "No start limit": "不限開始日期",
  "No end limit": "不限結束日期",
  "No stores match your search.": "找不到符合條件的通路。",
  "For this offer, wait {days} days after purchase and submit within the claim window. Review and payment timing follow the campaign terms.":
    "本活動須於購買後等待 {days} 天，並於申請期間內送出。審核及付款時間依活動條款。",
  "Terms — {version}": "活動條款 — {version}",
  "Terms have not been provided.": "尚未提供活動條款。",
  "Privacy notice": "隱私權聲明",
  "Privacy notice has not been provided.": "尚未提供隱私權聲明。",
  "Frequently asked questions": "常見問題",
  "No FAQs have been provided.": "尚未提供常見問題。",
  "Need help?": "需要協助？",
  "Change payment profile": "變更收款資料",
  "Changes before authorization return the claim to review. Account details are never changed on an existing payment instruction.":
    "付款授權前變更收款資料，申請將重新進入審核。已建立的付款指示不會更改帳戶資料。",
  "Account holder profile": "帳戶持有人類型",
  Individual: "個人",
  Company: "公司",
  "Account holder": "帳戶持有人",
  "Bank name": "銀行名稱",
  IBAN: "IBAN",
  "BIC / SWIFT": "BIC / SWIFT",
  "Account number": "銀行帳號",
  "Sort code": "銀行分行代碼",
  "Submit bank change": "送出收款資料變更",
  "Payment profile changed and review reset.":
    "收款資料已變更，申請將重新審核。",
  Applicant: "申請人",
  "Applicant details": "申請人資料",
  "Tell us who is claiming and where you live.": "請填寫申請人身分及居住地址。",
  "Bank details": "銀行資料",
  "Payment profile": "收款資料",
  "Add the account where your approved cashback should go.":
    "請填寫核准後接收回饋款項的帳戶。",
  "Purchase & products": "購買與產品",
  "Purchase and products": "購買與產品資料",
  "Add eligible products from the same invoice.": "加入同張發票上的適用產品。",
  Evidence: "證明文件",
  "Supporting documents": "證明文件",
  "Upload your invoice and a serial number image for each product.":
    "上傳發票及各項產品的序號照片。",
  "Review and submit": "確認並送出",
  "Check every detail before sending your claim for review.":
    "送出審核前，請確認各項資料正確。",
  "Evidence uploaded.": "證明文件已上傳。",
  Edit: "編輯",
  "{count} file(s) uploaded": "已上傳 {count} 個檔案",
  "Choose a clear, readable image or document": "請選擇清晰可辨識的圖片或文件",
  "Application received": "已收到申請",
  "Your claim is on its way.": "你的申請已成功送出。",
  "We have received your claim for {campaign}. Keep your reference handy while we review your application.":
    "我們已收到「{campaign}」的申請，請保留申請編號以便查詢審核進度。",
  "Claim reference": "申請編號",
  "Cashback submitted for review": "送審回饋金額",
  "What happens next?": "接下來的流程",
  "We check your purchase, product details and supporting documents.":
    "我們將核對購買紀錄、產品資料及證明文件。",
  "If we need more information, you can provide it through My claims.":
    "如需補充資料，可透過「我的申請」提供。",
  "Track your review status and, once approved, payment progress in My claims.":
    "請在「我的申請」追蹤審核狀態，以及核准後的付款進度。",
  "Track in My claims": "前往我的申請追蹤",
  Claim: "申請",
  "Claim progress": "申請進度",
  "Your application": "你的申請",
  "Saved:": "已儲存：",
  "One invoice, multiple eligible products. Save your draft and return whenever you need.":
    "同張發票可申請多項適用產品。你可以儲存草稿，之後再繼續填寫。",
  "Step {step} of 5": "第 {step} 步，共 5 步",
  "Reason for correction": "更正原因",
  Title: "稱謂",
  "Select title": "選擇稱謂",
  Mr: "先生",
  Ms: "女士",
  Mrs: "夫人",
  Mx: "不指定性別稱謂",
  Dr: "博士",
  "First name": "名字",
  "Last name": "姓氏",
  "AORUS email": "AORUS 電子郵件",
  "Confirm email": "確認電子郵件",
  "Mobile number": "手機號碼",
  Address: "地址",
  "Address line 2": "地址第二行",
  City: "城市",
  "State / region": "州／地區",
  "Postal code": "郵遞區號",
  "Country of residence": "居住國家",
  "Use synthetic bank details for this evaluation. No money is transferred by this form.":
    "測試時請使用虛構銀行資料，此表單不會執行實際匯款。",
  "Bank country (ISO code)": "銀行所在國家（ISO 代碼）",
  "Account holder's profile type": "帳戶持有人類型",
  "Account holder full name": "帳戶持有人全名",
  "Full bank account number": "完整銀行帳號",
  "Sort code (where applicable)": "銀行分行代碼（如適用）",
  "Product series": "產品系列",
  "Select series": "選擇系列",
  "Eligible product": "適用產品",
  "Select product": "選擇產品",
  "Serial number": "產品序號",
  "Check number (if present)": "檢查碼（如有）",
  "Product purchase date": "產品購買日期",
  "Product store name": "產品購買通路",
  "Use invoice retailer": "使用發票上的通路",
  Category: "產品類別",
  "Select a product": "請選擇產品",
  "Purchase details default to the shared invoice.":
    "購買資料預設沿用共用發票。",
  "Remove product": "移除產品",
  "Add product": "新增產品",
  "Upload JPG, PNG, PDF or TIFF evidence, up to 8 MB per file. Files are reviewed before approval.":
    "支援 JPG、PNG、PDF 或 TIFF，每個檔案上限 8 MB。文件須經審查後才能核准。",
  "Proof of purchase (shared invoice)": "購買證明（共用發票）",
  "Serial number image — {product}": "序號照片 — {product}",
  "Select a product first": "請先選擇產品",
  "Name & email": "姓名與電子郵件",
  Contact: "聯絡資料",
  "Bank / country": "銀行／國家",
  Account: "帳號",
  "Not provided": "尚未提供",
  "Retailer / country": "通路／國家",
  "Not selected": "尚未選擇",
  "Invoice amount": "發票金額",
  "No product selected": "尚未選擇產品",
  "Serial:": "序號：",
  "Check:": "檢查碼：",
  "Shared invoice": "共用發票",
  "No evidence uploaded yet.": "尚未上傳證明文件。",
  "Terms — version {version}": "活動條款 — 版本 {version}",
  "I accept the promotion terms.": "我同意活動條款。",
  "I acknowledge the privacy notice.": "我已閱讀隱私權聲明。",
  "I would like to receive marketing updates (optional).":
    "我願意接收行銷資訊（選填）。",
  "Eligibility and the reward are recalculated on the server when you submit.":
    "送出時系統將重新驗證申請資格及回饋金額。",
  "Estimated cashback": "預估回饋金額",
  "{count} eligible products selected": "已選擇 {count} 項適用產品",
  "Subject to eligibility review": "實際資格須經審核",
  "Draft saved.": "草稿已儲存。",
  "Save draft": "儲存草稿",
  Previous: "上一步",
  "Saving…": "儲存中…",
  "Submit claim": "送出申請",
  "Save and continue": "儲存並繼續",
  "Reason / message": "原因／留言",
  "Please provide a reason or message.": "請填寫原因或留言。",
};

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
type LocaleContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: Translate;
};
const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return localStorage.getItem("cashback.public.locale") === "zh-TW"
        ? "zh-TW"
        : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem("cashback.public.locale", locale);
    } catch {
      /* Storage may be unavailable in private browsers. */
    }
  }, [locale]);
  const t = useCallback<Translate>(
    (key, values) => {
      const template = locale === "zh-TW" ? (translations[key] ?? key) : key;
      return template.replace(/\{(\w+)\}/g, (token, name: string) =>
        String(values?.[name] ?? token),
      );
    },
    [locale],
  );
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
