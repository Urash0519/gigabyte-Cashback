// Device-local UAT model. No member, payment or email API is called.
export const TODAY = "2026-08-27";
export const MARKETS = [
  { code: "DE", name: "Germany", language: "Deutsch", zone: "Europe/Berlin" },
  { code: "FR", name: "France", language: "Français", zone: "Europe/Paris" },
  { code: "IT", name: "Italy", language: "Italiano", zone: "Europe/Rome" },
  { code: "ES", name: "Spain", language: "Español", zone: "Europe/Madrid" },
  { code: "NL", name: "Netherlands", language: "Nederlands", zone: "Europe/Amsterdam" },
] as const;
export type Market = typeof MARKETS[number]["code"];
export type Role = "Programme admin" | "Reviewer" | "Finance" | "Support";
export type Review = "Submitted" | "Under review" | "More info required" | "Approved" | "Rejected" | "Cancelled";
export type PayStatus = "Ready" | "Authorized" | "Submitted" | "Processing" | "Unknown" | "Failed" | "Succeeded";
export type Product = { id: string; name: string; category: string; short: string; amount: number };
export const PRODUCTS: Product[] = [
  { id: "gpu", name: "AORUS Radeon RX 9070 XT ELITE 16G", category: "Graphics card", short: "GPU", amount: 3000 },
  { id: "mb", name: "B850 AORUS ELITE WIFI7", category: "Motherboard", short: "MB", amount: 2000 },
  { id: "monitor", name: "AORUS FO27Q5P", category: "Monitor", short: "OLED", amount: 6000 },
];
export const REGISTERED_PRODUCTS = PRODUCTS.map((p, index) => ({
  ...p, sn: ["UAT-GPU-10001", "UAT-MB-10001", "UAT-MON-10001"][index], registered: "2026-08-11",
}));
export const RETAILERS = [
  { id: "de-amazon", name: "Amazon.de", country: "DE" },
  { id: "de-alternate", name: "Alternate.de", country: "DE" },
  { id: "de-mindfactory", name: "Mindfactory", country: "DE" },
  { id: "fr-amazon", name: "Amazon.fr", country: "FR" },
  { id: "fr-ldlc", name: "LDLC", country: "FR" },
  { id: "fr-topachat", name: "Top Achat", country: "FR" },
  { id: "it-amazon", name: "Amazon.it", country: "IT" },
  { id: "it-nexths", name: "Nexths", country: "IT" },
  { id: "es-amazon", name: "Amazon.es", country: "ES" },
  { id: "es-pc", name: "PcComponentes", country: "ES" },
  { id: "nl-megekko", name: "Megekko", country: "NL" },
  { id: "nl-alternate", name: "Alternate.nl", country: "NL" },
] as const;
export type Item = { productId: string; sn: string; attached: boolean };
export type Campaign = {
  id: string; name: string; version: number; status: "Open" | "Paused" | "Draft" | "Closed";
  markets: Market[]; purchaseStart: string; purchaseEnd: string; claimStart: string; claimEnd: string;
  waitDays: number; budget: number; buffer: number; claimCap: number;
  products: Product[]; termsVersion: string; headline: string; mutualGroup: string;
};
export type Draft = {
  firstName: string; lastName: string; email: string; phone: string; address: string; city: string; postalCode: string;
  bankCountry: Market; accountType: "Individual" | "Business"; accountHolder: string; iban: string; bic: string;
  market: Market; purchaseCountry: Market; retailerId: string; purchaseDate: string;
  invoice: string; invoiceAmount: number; items: Item[]; invoiceAttached: boolean; terms: boolean; marketing: boolean;
};
export type Claim = Draft & {
  id: string; campaignId: string; snapshot: Campaign; applicantId: string; applicant: string; household: string;
  trackingUsername: string;
  status: Review; hold: string; amount: number; checks: Record<string, boolean>; createdAt: string;
  history: { title: string; detail: string; at: string }[];
};
export type Payment = {
  id: string; claimId: string; batchId: string; status: PayStatus; amount: number;
  attempts: number; delivery: string; evidence: string; lastResult: string;
};
export type State = {
  schema: 3; campaigns: Campaign[]; activeCampaignId: string; claims: Claim[]; payments: Payment[];
  memberVerified: boolean; role: Role;
  audit: { id: number; action: string; target: string; role: string; detail: string; at: string }[];
  notifications: { claimId: string; subject: string; detail: string; at: string }[];
};
export const CHECKS = ["AORUS membership", "Invoice & purchase amount", "SN photo matches", "Date & retailer", "Duplicate / RMA check"];
export const MEMBER_ID = "UAT-MEMBER-001";
export const money = (minor: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(minor / 100);
export const marketName = (code: string) => MARKETS.find(x => x.code === code)?.name ?? code;
export const normalSN = (sn: string) => sn.toUpperCase().replace(/[^A-Z0-9]/g, "");
export function freshDraft(market: Market = "DE"): Draft {
  return { firstName: "Taylor", lastName: "Demo", email: "taylor.demo@example.test", phone: "+49 000 000 000",
    address: "1 Sample Street", city: "Demo City", postalCode: "00000", bankCountry: market, accountType: "Individual",
    accountHolder: "Taylor Demo", iban: "DE00 UAT0 0000 0000 0000 00", bic: "UATBDE00XXX",
    market, purchaseCountry: market, retailerId: "", purchaseDate: "2026-08-10", invoice: "UAT-INVOICE-001", invoiceAmount: 89900,
    items: [{ productId: "gpu", sn: "", attached: false }], invoiceAttached: false, terms: false, marketing: false };
}
// Explicitly select form fields so a correction cannot overwrite case identity,
// original rules, amount or history when its UI value originated from a Claim.
function formFields(d: Draft): Draft {
  return { firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone, address: d.address, city: d.city,
    postalCode: d.postalCode, bankCountry: d.bankCountry, accountType: d.accountType, accountHolder: d.accountHolder, iban: d.iban, bic: d.bic,
    market: d.market, purchaseCountry: d.purchaseCountry, retailerId: d.retailerId,
    purchaseDate: d.purchaseDate, invoice: d.invoice, invoiceAmount: d.invoiceAmount,
    items: d.items.map(i => ({ productId: i.productId, sn: i.sn, attached: i.attached })),
    invoiceAttached: d.invoiceAttached, terms: d.terms, marketing: d.marketing };
}
export function createState(): State {
  const campaign: Campaign = {
    id: "q1-uat", name: "AORUS Upgrade Cashback", version: 1, status: "Open",
    markets: MARKETS.map(x => x.code), purchaseStart: "2026-08-01", purchaseEnd: "2026-08-31",
    claimStart: "2026-08-15", claimEnd: "2026-09-30", waitDays: 14, budget: 5000000, buffer: 250000,
    claimCap: 500, products: structuredClone(PRODUCTS), termsVersion: "UAT-Q1-v1",
    headline: "Build more. Get more back.", mutualGroup: "q1-uat-group",
  };
  const rows: [Market, string, Review, string, string[]][] = [
    ["DE", "Lena Demo", "Under review", "", ["gpu", "mb"]],
    ["FR", "Camille Demo", "More info required", "", ["monitor"]],
    ["IT", "Luca Demo", "Under review", "RMA record requires manual confirmation", ["gpu"]],
    ["ES", "Alex Demo", "Approved", "", ["gpu", "monitor"]],
    ["NL", "Sam Demo", "Approved", "", ["mb"]],
    ["DE", "Robin Demo", "Approved", "", ["monitor"]],
  ];
  const claims: Claim[] = rows.map(([market, name, status, hold, ids], index) => ({
    ...freshDraft(market), id: market + "-UAT-" + (1001 + index), campaignId: campaign.id,
    snapshot: structuredClone(campaign), applicantId: "UAT-SEED-" + index, applicant: name, trackingUsername: "track-demo-" + (1001 + index),
    household: "UAT-HOUSEHOLD-" + index, retailerId: RETAILERS.find(r => r.country === market)!.id,
    invoice: "UAT-SAMPLE-" + (index + 1), items: ids.map(id => ({ productId: id, sn: "UAT-SEED-" + index + "-" + id, attached: true })),
    invoiceAttached: true, terms: true, status, hold, amount: ids.reduce((n, id) => n + PRODUCTS.find(p => p.id === id)!.amount, 0),
    checks: Object.fromEntries(CHECKS.map(x => [x, status === "Approved"])), createdAt: "2026-08-25",
    history: [{ title: status, detail: hold || (status === "More info required" ? "Please provide a clearer sample invoice." : "Seeded demonstration case. No real applicant."), at: "2026-08-25T09:00:00Z" }],
  }));
  return { schema: 3, campaigns: [campaign], activeCampaignId: campaign.id, claims, memberVerified: false, role: "Programme admin",
    payments: [
      { id: "PAY-ES-UAT-1004", claimId: claims[3].id, batchId: "BATCH-UAT-001", amount: claims[3].amount, status: "Unknown", attempts: 1, delivery: "Email delivered (simulated)", evidence: "", lastResult: "Timeout: reconcile before retry" },
      { id: "PAY-NL-UAT-1005", claimId: claims[4].id, batchId: "BATCH-UAT-001", amount: claims[4].amount, status: "Succeeded", attempts: 1, delivery: "Email delivered (simulated)", evidence: "UAT-BANK-EXAMPLE-001", lastResult: "Simulated settlement confirmed" },
    ], audit: [{ id: 1, action: "UAT initialized", target: campaign.id, role: "System demo", detail: "Synthetic records only. No integrations connected.", at: "2026-08-27T08:00:00Z" }], notifications: [] };
}
export function totals(state: State, campaignId = state.activeCampaignId) {
  const campaign = state.campaigns.find(c => c.id === campaignId)!;
  let reserved = 0, approved = 0, paid = 0;
  const claims = state.claims.filter(c => c.campaignId === campaignId);
  for (const c of claims) {
    if (c.status === "Cancelled" || c.status === "Rejected") continue;
    if (state.payments.some(p => p.claimId === c.id && p.status === "Succeeded")) paid += c.amount;
    else if (c.status === "Approved") approved += c.amount;
    else reserved += c.amount;
  }
  return { reserved, approved, paid, remaining: campaign.budget - campaign.buffer - reserved - approved - paid,
    used: reserved + approved + paid, count: claims.filter(c => !["Cancelled", "Rejected"].includes(c.status)).length };
}
type DraftSection = "personal" | "bank" | "purchase" | "products" | "documents" | "review";
type DraftIssue = { section: DraftSection; message: string };
function draftIssues(state: State, draft: Draft, campaign: Campaign, excludeId?: string): DraftIssue[] {
  const errors: DraftIssue[] = [];
  const add = (section: DraftSection, message: string) => errors.push({ section, message });
  const retired = new Set(["Rejected", "Cancelled"]);
  if (!excludeId && (campaign.status !== "Open" || TODAY < campaign.claimStart || TODAY > campaign.claimEnd)) add("personal", "This campaign is not accepting new claims.");
  if (!campaign.markets.includes(draft.market)) add("personal", "This market is not enabled for the campaign.");
  if (![draft.firstName, draft.lastName, draft.phone, draft.address, draft.city, draft.postalCode].every(v => v.trim())) add("personal", "Complete all required personal and contact details.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) add("personal", "Enter the AORUS membership email in a valid format.");
  if (![draft.accountHolder, draft.iban, draft.bic].every(v => v.trim())) add("bank", "Complete the sample bank transfer details.");
  const iban = draft.iban.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9]{15,34}$/.test(iban)) add("bank", "Enter a sample IBAN with 15–34 letters or digits.");
  if (!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(draft.bic.toUpperCase().replace(/\s/g, ""))) add("bank", "Enter a sample BIC with 8 or 11 letters or digits.");
  if (draft.purchaseDate < campaign.purchaseStart || draft.purchaseDate > campaign.purchaseEnd) add("purchase", "Purchase date must be within the campaign purchase period.");
  const days = (Date.parse(TODAY + "T00:00:00Z") - Date.parse(draft.purchaseDate + "T00:00:00Z")) / 86400000;
  if (!Number.isFinite(days) || days < campaign.waitDays) add("purchase", "Wait at least " + campaign.waitDays + " calendar days after purchase. UAT date: " + TODAY + ".");
  if (!RETAILERS.some(r => r.id === draft.retailerId && r.country === draft.purchaseCountry)) add("purchase", "Select an eligible retailer from the suggestions for the purchase country.");
  if (!draft.invoice.trim()) add("purchase", "Enter an invoice reference.");
  if (!draft.invoiceAttached) add("documents", "Attach a sample invoice.");
  if (!Number.isSafeInteger(draft.invoiceAmount) || draft.invoiceAmount <= 0) add("purchase", "Enter a valid purchase amount.");
  if (!draft.terms) add("review", "Accept the UAT terms and privacy notice; marketing consent is optional.");
  if (!draft.items.length) add("products", "Add at least one eligible product.");
  const categories = new Set<string>(), serials = new Set<string>();
  for (const item of draft.items) {
    const product = campaign.products.find(p => p.id === item.productId);
    if (!product) { add("products", "Product is not eligible."); continue; }
    if (categories.has(product.category)) add("products", "Only one product per category is allowed in a claim.");
    categories.add(product.category);
    const sn = normalSN(item.sn);
    if (sn.length < 8 || sn.length > 40) add("products", "Enter a serial number with 8–40 letters or digits.");
    if (serials.has(sn)) add("products", "The same serial appears more than once.");
    serials.add(sn);
    if (!item.attached) add("documents", "Attach a sample serial-label photo for each product.");
    if (state.claims.some(c => c.id !== excludeId && !retired.has(c.status) && c.snapshot.mutualGroup === campaign.mutualGroup && c.items.some(x => normalSN(x.sn) === sn))) add("products", "This serial is already reserved in this campaign group.");
  }
  if (!excludeId && state.claims.some(c => c.campaignId === campaign.id && (c.applicantId === MEMBER_ID || c.household === "UAT-YOUR-HOUSEHOLD") && !retired.has(c.status))) add("personal", "One claim per participant and household. Use Track claim to manage the existing claim.");
  const total = totals(state, campaign.id);
  const previous = excludeId ? state.claims.find(c => c.id === excludeId)?.amount ?? 0 : 0;
  const amount = draft.items.reduce((n, item) => n + (campaign.products.find(p => p.id === item.productId)?.amount ?? 0), 0);
  if (amount > total.remaining + previous) add("review", "Not enough available campaign budget. No claim has been created.");
  if (!excludeId && total.count >= campaign.claimCap) add("personal", "The claim limit has been reached.");
  return errors;
}
export function draftErrors(state: State, draft: Draft, campaign: Campaign, excludeId?: string): string[] {
  return draftIssues(state, draft, campaign, excludeId).map(issue => issue.message);
}
export function claimStepErrors(state: State, draft: Draft, campaign: Campaign, step: number): string[] {
  const sections: Record<number, DraftSection[]> = { 1: ["personal", "purchase"], 2: ["products"], 3: ["documents"], 4: ["personal", "bank", "purchase", "products", "documents", "review"] };
  return draftIssues(state, draft, campaign).filter(issue => sections[step]?.includes(issue.section)).map(issue => issue.message);
}
export function claimV3StepErrors(state: State, draft: Draft, campaign: Campaign, step: number): string[] {
  const sections: Record<number, DraftSection[]> = { 1: ["personal"], 2: ["bank"], 3: ["purchase", "products"], 4: ["documents"], 5: ["personal", "bank", "purchase", "products", "documents", "review"] };
  return draftIssues(state, draft, campaign).filter(issue => sections[step]?.includes(issue.section)).map(issue => issue.message);
}
export type Action =
  | { type: "verify" }
  | { type: "role"; role: Role }
  | { type: "selectCampaign"; id: string }
  | { type: "submit"; draft: Draft }
  | { type: "checks"; id: string; key: string; checked: boolean }
  | { type: "review"; id: string; status: Review; note: string }
  | { type: "hold"; id: string; hold: boolean; note: string }
  | { type: "message"; id: string; note: string }
  | { type: "supplement"; id: string; draft: Draft; note: string }
  | { type: "cancel"; id: string; note: string }
  | { type: "saveCampaign"; campaign: Campaign; note: string }
  | { type: "createCampaign" }
  | { type: "copyCampaign"; id: string }
  | { type: "batch" }
  | { type: "pay"; id: string; operation: "authorize" | "send" | "delivered" | "unknown" | "failed" | "paid" | "retry"; evidence?: string };
export function can(state: State, area: "review" | "finance" | "campaign" | "support") {
  return state.role === "Programme admin" || (area === "review" && state.role === "Reviewer") ||
    (area === "finance" && state.role === "Finance") || (area === "support" && ["Support", "Reviewer"].includes(state.role));
}
export function transition(source: State, action: Action): State {
  const state = structuredClone(source);
  const at = new Date().toISOString();
  const requireRole = (area: "review" | "finance" | "campaign" | "support") => { if (!can(state, area)) throw new Error("This demo role cannot perform that action."); };
  const requiredNote = (note: string) => { if (note.trim().length < 3) throw new Error("Enter a reason or evidence reference (at least 3 characters)."); };
  const audit = (title: string, target: string, detail: string, role = state.role) => state.audit.unshift({ id: state.audit.length + 1, action: title, target, detail, role, at });
  const claimById = (id: string) => { const claim = state.claims.find(c => c.id === id); if (!claim) throw new Error("Claim not found."); return claim; };
  const history = (c: Claim, title: string, detail: string) => { c.history.unshift({ title, detail, at }); audit(title, c.id, detail); };
  const notify = (c: Claim, subject: string, detail: string) => state.notifications.unshift({ claimId: c.id, subject, detail, at });
  const paymentInFlight = (id: string) => state.payments.some(p => p.claimId === id && !["Ready", "Authorized", "Failed"].includes(p.status));
  if (action.type === "verify") {
    state.memberVerified = true; audit("Demo member verified", MEMBER_ID, "Simulated AORUS qualification. No SSO/API request.");
  } else if (action.type === "role") {
    state.role = action.role; audit("Demo role switched", action.role, "UI simulation, not production access control.");
  } else if (action.type === "selectCampaign") {
    if (!state.campaigns.some(c => c.id === action.id)) throw new Error("Campaign not found.");
    state.activeCampaignId = action.id;
  } else if (action.type === "submit") {
    const campaign = state.campaigns.find(c => c.id === state.activeCampaignId)!;
    const errors = draftErrors(state, action.draft, campaign);
    if (errors.length) throw new Error(errors.join("\n"));
    const draft = formFields(action.draft);
    const id = draft.market + "-UAT-" + (1001 + state.claims.length);
    const claim: Claim = { ...draft, id, campaignId: campaign.id, snapshot: structuredClone(campaign),
      applicantId: MEMBER_ID, applicant: draft.firstName.trim() + " " + draft.lastName.trim(), household: "UAT-YOUR-HOUSEHOLD", trackingUsername: "track-" + id.toLowerCase(),
      status: "Submitted", hold: "", amount: draft.items.reduce((n, i) => n + campaign.products.find(p => p.id === i.productId)!.amount, 0),
      checks: Object.fromEntries(CHECKS.map(c => [c, false])), createdAt: TODAY, history: [] };
    state.claims.unshift(claim);
    history(claim, "Claim submitted", "Same-invoice claim reserved against campaign version " + campaign.version + ". All documents are samples.");
    notify(claim, "Claim received and tracking account created (simulation)", "Reference " + claim.id + " · username " + claim.trackingUsername + ". No email was sent.");
  } else if (action.type === "checks") {
    requireRole("review"); const c = claimById(action.id);
    if (["Approved", "Rejected", "Cancelled"].includes(c.status)) throw new Error("Review is closed for this claim.");
    if (!CHECKS.includes(action.key)) throw new Error("Unknown check.");
    c.checks[action.key] = action.checked; c.status = "Under review";
    history(c, "Manual check updated", action.key + ": " + (action.checked ? "passed" : "pending"));
  } else if (action.type === "review") {
    requireRole("review"); requiredNote(action.note); const c = claimById(action.id);
    if (!["Approved", "Rejected", "More info required"].includes(action.status)) throw new Error("Invalid decision.");
    if (paymentInFlight(c.id)) throw new Error("Reconcile the existing payment before changing the decision.");
    if (["Rejected", "Cancelled"].includes(c.status)) throw new Error("This case is closed.");
    if (action.status === "Approved" && (c.hold || !CHECKS.every(k => c.checks[k]))) throw new Error("Complete every manual check and clear the hold before approval.");
    c.status = action.status;
    history(c, action.status, action.note); notify(c, action.status + " (simulation)", action.note);
  } else if (action.type === "hold") {
    requireRole("review"); requiredNote(action.note); const c = claimById(action.id);
    c.hold = action.hold ? action.note : "";
    history(c, action.hold ? "Risk hold added" : "Risk hold cleared", action.note);
  } else if (action.type === "message") {
    requireRole("support"); requiredNote(action.note); const c = claimById(action.id);
    history(c, "Support message", action.note); notify(c, "Support update (simulation)", action.note);
  } else if (action.type === "supplement") {
    requiredNote(action.note); const c = claimById(action.id);
    if (c.applicantId !== MEMBER_ID || c.status !== "More info required") throw new Error("Only your own missing-information case can be supplemented.");
    const errors = draftErrors(state, action.draft, c.snapshot, c.id);
    if (errors.length) throw new Error(errors.join("\n"));
    if (JSON.stringify(action.draft.items.map(i => i.productId)) !== JSON.stringify(c.items.map(i => i.productId))) throw new Error("Product changes require manual review; do not change the claimed categories.");
    const previous = c.items.map(i => i.sn).join(", ");
    Object.assign(c, formFields(action.draft));
    c.status = "Under review"; c.checks = Object.fromEntries(CHECKS.map(k => [k, false]));
    history(c, "Supplement received", action.note + " | Previous serials: " + previous + " | Replaced with: " + c.items.map(i => i.sn).join(", "));
    notify(c, "Supplement received (simulation)", "The review team will check the changes.");
  } else if (action.type === "cancel") {
    requiredNote(action.note); const c = claimById(action.id);
    if (c.applicantId !== MEMBER_ID) throw new Error("Only your own claim can be cancelled.");
    if (paymentInFlight(c.id)) throw new Error("Payment has been submitted. Contact support; the result must be reconciled first.");
    c.status = "Cancelled"; history(c, "Claim cancelled", action.note);
  } else if (action.type === "saveCampaign") {
    requireRole("campaign"); requiredNote(action.note);
    const current = state.campaigns.find(c => c.id === action.campaign.id);
    if (!current) throw new Error("Campaign not found.");
    const next = structuredClone(action.campaign);
    if (!next.name.trim() || !next.markets.length || next.markets.some(m => !MARKETS.some(x => x.code === m))) throw new Error("Choose a name and at least one of the five approved UAT markets.");
    if (next.purchaseStart > next.purchaseEnd || next.claimStart > next.claimEnd || next.claimEnd < next.purchaseEnd) throw new Error("Check purchase and claim date ranges.");
    if (![next.budget, next.buffer, next.claimCap, next.waitDays].every(Number.isSafeInteger) || next.buffer < 0 || next.waitDays < 0 || next.claimCap < 1) throw new Error("Budget and limits must be valid non-negative integers.");
    if (next.budget < totals(state, current.id).used + next.buffer) throw new Error("Budget cannot be below existing commitments plus buffer.");
    if (!next.products.length || next.products.some(p => p.amount <= 0 || !Number.isSafeInteger(p.amount))) throw new Error("Product amounts must be positive.");
    next.version = current.version + 1; Object.assign(current, next);
    audit("Campaign version saved", current.id, "v" + current.version + " · " + action.note + ". Existing claim snapshots unchanged.");
  } else if (action.type === "createCampaign") {
    requireRole("campaign"); const base = state.campaigns.find(x => x.id === state.activeCampaignId)!;
    const campaign = { ...structuredClone(base), id: "uat-new-" + (state.campaigns.length + 1), name: "Untitled Cashback Campaign", status: "Draft" as const, version: 1 };
    state.campaigns.push(campaign); audit("Campaign created", campaign.id, "Blank UAT draft created from the approved Q1 field structure; no claims or budget usage copied.");
  } else if (action.type === "copyCampaign") {
    requireRole("campaign"); const c = state.campaigns.find(x => x.id === action.id);
    if (!c) throw new Error("Campaign not found.");
    const copy = { ...structuredClone(c), id: "uat-copy-" + (state.campaigns.length + 1), name: c.name + " · Copy", status: "Draft" as const, version: 1 };
    state.campaigns.push(copy); audit("Campaign copied", copy.id, "Draft copied without claims, payments or budget consumption.");
  } else if (action.type === "batch") {
    requireRole("finance");
    const claims = state.claims.filter(c => c.status === "Approved" && !c.hold && !state.payments.some(p => p.claimId === c.id));
    if (!claims.length) throw new Error("No approved, unheld claims without an existing payment.");
    const batchId = "BATCH-UAT-" + String(new Set(state.payments.map(p => p.batchId)).size + 1).padStart(3, "0");
    for (const c of claims) state.payments.push({ id: "PAY-" + c.id, claimId: c.id, batchId, status: "Ready", amount: c.amount, attempts: 0, delivery: "Not sent", evidence: "", lastResult: "Demo instruction prepared" });
    audit("Demo batch prepared", batchId, claims.length + " logical instructions; no provider request or money transfer.");
  } else if (action.type === "pay") {
    requireRole("finance");
    const p = state.payments.find(x => x.id === action.id);
    if (!p) throw new Error("Payment not found.");
    const c = claimById(p.claimId);
    const op = action.operation;
    if (["authorize", "send", "retry"].includes(op) && (c.hold || c.status !== "Approved")) throw new Error("Only approved claims without a hold can proceed to payment.");
    if (op === "authorize") {
      if (p.status !== "Ready") throw new Error("Only ready instructions can be authorized.");
      p.status = "Authorized";
    } else if (op === "send") {
      if (p.status !== "Authorized") throw new Error("Authorize this instruction first. Submitted instructions cannot be sent again.");
      p.status = "Submitted"; p.attempts += 1; p.lastResult = "Simulated submission";
    } else if (op === "delivered") {
      if (!p.attempts) throw new Error("Submit the simulated instruction first.");
      p.delivery = "Email delivered (simulated)";
    } else if (op === "unknown") {
      if (!["Submitted", "Processing"].includes(p.status)) throw new Error("Only in-flight instructions can have an unknown result.");
      p.status = "Unknown"; p.lastResult = "Simulated timeout — reconcile before retry";
    } else if (op === "retry") {
      if (p.status !== "Failed" || !p.evidence) throw new Error("Only a confirmed failure can be retried. Unknown results must be reconciled.");
      p.status = "Authorized"; p.evidence = ""; p.lastResult = "Retry authorized with the same instruction ID";
    } else {
      if (!["Submitted", "Processing", "Unknown"].includes(p.status)) throw new Error("This instruction is not awaiting reconciliation.");
      requiredNote(action.evidence ?? "");
      p.status = op === "paid" ? "Succeeded" : "Failed"; p.evidence = action.evidence!.trim();
      p.lastResult = op === "paid" ? "Simulated settlement confirmed" : "Simulated failure confirmed";
      notify(c, p.lastResult, p.evidence + " · No real payment occurred.");
    }
    history(c, "Payment " + op + " (simulation)", p.id + " · " + p.status + (action.evidence ? " · " + action.evidence : ""));
  }
  return state;
}
export function csv(rows: (string | number)[][]) {
  return "\uFEFF" + rows.map(row => row.map(v => {
    let value = String(v);
    if (/^[\s]*[=+\-@]/.test(value)) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n");
}
