export type Product = {
  id: string;
  category: string;
  model: string;
  series: string;
  ean: string;
  cashbackMinor: number;
  quantityLimit: number;
};
export type Retailer = {
  id: string;
  name: string;
  country: string;
  url: string;
  validFrom: string | null;
  validTo: string | null;
};
export type CampaignInput = {
  concurrencyStamp?: string;
  maxClaimsPerHousehold?: number;
  exclusivityGroup?: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  market: string;
  markets: string[];
  languages: string[];
  currency: string;
  timeZone: string;
  purchaseStart: string;
  purchaseEnd: string;
  claimStart: string;
  claimEnd: string;
  waitingDays: number;
  maxClaimsPerPerson: number;
  maxItemsPerCategory: number;
  claimLimit: number;
  budgetMinor: number;
  bufferMinor: number;
  acceptingClaims: boolean;
  termsVersion: string;
  terms: string;
  privacy: string;
  faq: string;
  description: string;
  bannerUrl: string;
  supportEmail: string;
  products: Product[];
  retailers: Retailer[];
  legacyFields: Record<string, string>;
};
export type Campaign = {
  id: string;
  data: CampaignInput;
  publishedVersion: number;
  concurrencyStamp: string;
  reservedMinor: number;
  approvedMinor: number;
  paidMinor: number;
  availableMinor: number;
  versions: {
    id: string;
    version: number;
    createdAt: string;
    data: CampaignInput;
  }[];
};
export type Bank = {
  accountHolderProfileType: string;
  accountHolder: string;
  bankName: string;
  iban: string;
  bic: string;
  accountNumber: string;
  sortCode: string;
};
export type Evidence = {
  id: string;
  fileName: string;
  kind: string;
  productId: string;
  scanStatus: string;
  size: number;
};
export type ClaimItem = {
  purchaseDate?: string | null;
  retailerId?: string;
  productId: string;
  serialNumber: string;
  checkNumber: string;
  amountMinor: number;
};
export type ClaimInput = {
  market: string;
  changeReason?: string;
  campaignId: string;
  email: string;
  confirmEmail: string;
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  residenceCountry: string;
  purchaseCountry: string;
  bankCountry: string;
  language: string;
  invoiceNumber: string;
  purchaseDate: string;
  purchaseAmountMinor: number;
  retailerId: string;
  bank: Bank;
  items: ClaimItem[];
  attachments: Evidence[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  legacyFields: Record<string, string>;
};
export type Event = {
  id: string;
  targetId: string;
  action: string;
  reason: string;
  actor: string;
  amountMinor: number;
  createdAt: string;
};
export type ClaimRevision = {
  id: string;
  createdAt: string;
  reason: string;
  amountMinor: number;
  data: ClaimInput;
};
export type Claim = {
  revisions: ClaimRevision[];
  id: string;
  reference: string;
  data: ClaimInput;
  reviewStatus: string;
  onHold: boolean;
  paymentStatus: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  submittedAt: string | null;
  campaignVersionId: string | null;
  history: Event[];
};
export type Payment = {
  id: string;
  claimId: string;
  batchId: string;
  status: string;
  amountMinor: number;
  currency: string;
  resultReference: string;
  exportSha256: string;
  createdAt: string;
};
export type ReportRow = {
  averageReviewDays: number | null;
  medianReviewDays: number | null;
  averagePaymentDays: number | null;
  medianPaymentDays: number | null;
  supplementRate: number | null;
  firstReviewOverdue: number;
  dimension: string;
  value: string;
  currency: string;
  claims: number;
  items: number;
  amountMinor: number;
  approved: number;
  rejected: number;
  approvalRate: number | null;
  paid: number;
  onHold: number;
  slaOverdue: number;
};
export type Report = {
  generatedAt: string;
  timeZone: string;
  dateBasis: string;
  rows: ReportRow[];
};
export type Session = {
  isAuthenticated: boolean;
  email: string | null;
  area: string;
  development: boolean;
};
export type OperationNotification = {
  claimId: string | null;
  templateVersion: string;
  id: string;
  recipientMasked: string;
  subject: string;
  status: string;
  attempts: number;
  processedAt: string | null;
};
export type Action = {
  action: string;
  reason: string;
  value?: string;
  reference?: string;
  amountMinor?: number;
  currency?: string;
};
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const urls = {
  public: import.meta.env.VITE_PUBLIC_WEB_URL ?? "http://localhost:5173",
  admin: import.meta.env.VITE_ADMIN_WEB_URL ?? "http://localhost:5174",
};
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  format: "json" | "text" = "json",
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("X-Requested-With", "XMLHttpRequest");
  if (
    !["GET", "HEAD", "OPTIONS"].includes((init?.method ?? "GET").toUpperCase())
  ) {
    const token = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length);
    if (token)
      headers.set("RequestVerificationToken", decodeURIComponent(token));
  }
  const response = await fetch(base + path, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const body = JSON.parse(raw);
      message = body.error?.message || body.message || raw;
      const details = body.error?.validationErrors
        ?.map((e: { message: string }) => e.message)
        .join("; ");
      if (details) message += ": " + details;
    } catch {
      /* Plain text error */
    }
    throw new Error(message || `Request failed (${response.status})`);
  }
  const body = await response.text();
  return format === "text"
    ? (body as T)
    : body
      ? (JSON.parse(body) as T)
      : (undefined as T);
}
const post = <T>(path: string, data: unknown = {}) =>
  apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const api = {
  session: () => apiRequest<Session>("/api/dev-auth/session"),
  login: async (area: "public" | "admin") => {
    await post<Session>("/api/dev-auth/login", { area });
    // Refresh the antiforgery token after the cookie identity changes.
    return apiRequest<Session>("/api/dev-auth/session");
  },
  logout: () => post<void>("/api/dev-auth/logout"),
  campaigns: (admin = false) =>
    apiRequest<Campaign[]>(`/api/operations/campaigns?admin=${admin}`),
  createCampaign: (data: CampaignInput) =>
    post<Campaign>("/api/operations/campaigns", data),
  saveCampaign: (id: string, data: CampaignInput) =>
    post<Campaign>(`/api/operations/campaigns/${id}/save`, data),
  copyCampaign: (id: string) =>
    post<Campaign>(`/api/operations/campaigns/${id}/copy`),
  publishCampaign: (id: string, reason: string) =>
    post<Campaign>(`/api/operations/campaigns/${id}/publish`, { reason }),
  claimCampaign: (claimId: string) =>
    apiRequest<Campaign>(`/api/operations/claims/${claimId}/campaign`),
  claims: (admin = false) =>
    apiRequest<Claim[]>(`/api/operations/claims?admin=${admin}`),
  createClaim: (data: ClaimInput) =>
    post<Claim>("/api/operations/claims", data),
  saveClaim: (id: string, data: ClaimInput) =>
    post<Claim>(`/api/operations/claims/${id}/save`, data),
  submitClaim: (id: string) =>
    post<Claim>(`/api/operations/claims/${id}/submit`),
  claimAction: (id: string, action: Action) =>
    post<Claim>(`/api/operations/claims/${id}/action`, action),
  upload: async (id: string, file: File, kind: string, productId = "") => {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return post<Evidence>(`/api/operations/claims/${id}/evidence`, {
      fileName: file.name,
      kind,
      productId,
      content,
    });
  },
  downloadEvidence: (id: string, fileId: string) =>
    `${base}/api/operations/claims/${id}/evidence/${fileId}`,
  payments: () => apiRequest<Payment[]>("/api/operations/payments"),
  createPayments: (claimIds: string[], reason: string) =>
    post<Payment[]>("/api/operations/payments", { claimIds, reason }),
  paymentAction: (id: string, action: Action) =>
    post<Payment>(`/api/operations/payments/${id}/action`, action),
  exportPayment: (id: string) => `${base}/api/operations/payments/${id}/export`,
  reports: (params: Record<string, string> = {}) =>
    apiRequest<Report>(
      "/api/operations/reports?" +
        new URLSearchParams(Object.entries(params).filter(([, v]) => v)),
    ),
  exportReport: (params: Record<string, string> = {}) =>
    apiRequest<string>(
      "/api/operations/reports/export?" +
        new URLSearchParams(Object.entries(params).filter(([, v]) => v)),
      undefined,
      "text",
    ),
  audit: () => apiRequest<Event[]>("/api/operations/audit"),
  notifications: () =>
    apiRequest<OperationNotification[]>("/api/operations/notifications"),
  simulateNotification: (id: string) =>
    post<void>(`/api/operations/notifications/${id}/simulate`),
};
export const markets = ["DE", "FR", "IT", "ES", "NL"];
export const marketNames: Record<string, string> = {
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
};
export const blankCampaign = (): CampaignInput => ({
  name: "",
  slug: "",
  type: "Cashback",
  status: "Draft",
  market: "DE",
  markets: ["DE"],
  languages: ["en"],
  currency: "EUR",
  timeZone: "Europe/Berlin",
  purchaseStart: "2026-09-01T00:00:00Z",
  purchaseEnd: "2026-12-31T23:59:59Z",
  claimStart: "2026-09-15T00:00:00Z",
  claimEnd: "2027-01-31T23:59:59Z",
  waitingDays: 14,
  maxClaimsPerPerson: 1,
  maxItemsPerCategory: 1,
  claimLimit: 1000,
  budgetMinor: 10000000,
  bufferMinor: 500000,
  acceptingClaims: true,
  termsVersion: "1.0",
  terms: "",
  privacy: "",
  faq: "",
  description: "",
  bannerUrl: "",
  supportEmail: "",
  products: [],
  retailers: [],
  legacyFields: {},
});
export const blankClaim = (campaignId: string): ClaimInput => ({
  campaignId,
  market: "DE",
  email: "yoyo.chen@gigabyte.com",
  confirmEmail: "yoyo.chen@gigabyte.com",
  firstName: "",
  lastName: "",
  title: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postcode: "",
  residenceCountry: "DE",
  purchaseCountry: "DE",
  bankCountry: "DE",
  language: "en",
  invoiceNumber: "",
  purchaseDate: new Date().toISOString(),
  purchaseAmountMinor: 0,
  retailerId: "",
  bank: {
    accountHolderProfileType: "Individual",
    accountHolder: "",
    bankName: "",
    iban: "",
    bic: "",
    accountNumber: "",
    sortCode: "",
  },
  items: [],
  attachments: [],
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
  legacyFields: {},
});
