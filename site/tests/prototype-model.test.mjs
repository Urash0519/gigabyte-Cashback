import assert from "node:assert/strict";
import test from "node:test";
import { createState, freshDraft, transition, totals, draftErrors, claimStepErrors, claimV3StepErrors, CHECKS, MEMBER_ID, REGISTERED_PRODUCTS, RETAILERS, MARKETS, csv } from "../app/prototype-model.ts";

function validDraft() {
  return { ...freshDraft(), purchaseCountry: "FR", retailerId: "fr-amazon", invoiceAttached: true, terms: true,
    items: [{ productId: "gpu", sn: "UAT-NEW-GPU-001", attached: true }, { productId: "mb", sn: "UAT-NEW-MB-001", attached: true }] };
}
const own = s => s.claims.find(c => c.applicantId === MEMBER_ID);
const pay = s => s.payments.find(p => p.claimId === own(s).id);
function submitted() { return transition(transition(createState(), { type: "verify" }), { type: "submit", draft: validDraft() }); }
function approved() {
  let s = submitted(); const id = own(s).id;
  for (const key of CHECKS) s = transition(s, { type: "checks", id, key, checked: true });
  return transition(s, { type: "review", id, status: "Approved", note: "All sample evidence manually checked" });
}
function prepared() { return transition(approved(), { type: "batch" }); }

test("wizard progresses through all five markets without requiring future-step consent or documents", () => {
  for (const { code: market } of MARKETS) {
    const s = transition(createState(), { type: "verify" }), c = s.campaigns[0];
    const d = { ...freshDraft(market), retailerId: RETAILERS.find(r => r.country === market).id };
    assert.deepEqual(claimStepErrors(s, d, c, 1), [], market + ": purchase can continue without products, documents or consent");
    assert.match(claimStepErrors(s, d, c, 2).join(" "), /serial number/);
    d.items[0].sn = REGISTERED_PRODUCTS.find(p => p.id === d.items[0].productId).sn;
    assert.deepEqual(claimStepErrors(s, d, c, 2), [], market + ": product can continue without documents or consent");
    assert.match(claimStepErrors(s, d, c, 3).join(" "), /sample invoice.*serial-label photo/);
    d.invoiceAttached = true; d.items[0].attached = true;
    assert.deepEqual(claimStepErrors(s, d, c, 3), [], market + ": documents can continue without consent");
    assert.deepEqual(claimStepErrors(s, d, c, 4), ["Accept the UAT terms and privacy notice; marketing consent is optional."]);
    assert.throws(() => transition(s, { type: "submit", draft: d }), /Accept the UAT terms/);
    d.terms = true;
    assert.equal(d.marketing, false);
    assert.deepEqual(claimStepErrors(s, d, c, 4), []);
    assert.equal(own(transition(s, { type: "submit", draft: d })).market, market);
  }
});

test("purchase fields are validated where they can be corrected and final review rechecks earlier steps", () => {
  const s = transition(createState(), { type: "verify" }), c = s.campaigns[0];
  const d = { ...validDraft(), invoice: " ", invoiceAmount: 0, retailerId: "", purchaseDate: "2026-08-20" };
  const errors = claimStepErrors(s, d, c, 1).join(" ");
  for (const text of ["invoice reference", "purchase amount", "eligible retailer", "14 calendar"]) assert.ok(errors.includes(text), text);
  assert.deepEqual(claimStepErrors(s, d, c, 3), []);
  assert.deepEqual(claimStepErrors(s, d, c, 4), draftErrors(s, d, c));
  assert.throws(() => transition(s, { type: "submit", draft: d }), /invoice reference/);
});

test("same-invoice multi-product cross-border claim reserves budget without APIs", () => {
  const before = createState(), after = submitted(), c = own(after);
  assert.equal(c.items.length, 2); assert.equal(c.market, "DE"); assert.equal(c.purchaseCountry, "FR");
  assert.equal(c.amount, 5000); assert.equal(totals(after).reserved, totals(before).reserved + 5000);
  assert.equal(after.notifications.length, 1); assert.equal(before.claims.length, 6);
});
test("Phase 1 does not require login; wait period, documents and retailer selection are enforced", () => {
  const s = createState(), c = s.campaigns[0];
  assert.deepEqual(draftErrors(s, validDraft(), c), []);
  const d = { ...validDraft(), purchaseDate: "2026-08-20", retailerId: "Imaginary", invoiceAttached: false, items: [{ productId: "gpu", sn: "UAT-GPU-INVALID", attached: false }] };
  const errors = draftErrors(s, d, c).join(" ");
  for (const text of ["14 calendar", "eligible retailer", "sample invoice", "serial-label photo"]) assert.ok(errors.includes(text));
});
test("v3 validates personal and bank details in their own steps and creates a tracker", () => {
  const s = createState(), c = s.campaigns[0], d = validDraft();
  assert.deepEqual(claimV3StepErrors(s, d, c, 1), []);
  assert.deepEqual(claimV3StepErrors(s, d, c, 2), []);
  const bad = { ...d, email: "not-an-email", iban: "short", bic: "bad" };
  assert.match(claimV3StepErrors(s, bad, c, 1).join(" "), /AORUS membership email/);
  assert.match(claimV3StepErrors(s, bad, c, 2).join(" "), /IBAN.*BIC/);
  const after = transition(s, { type: "submit", draft: d }), claim = own(after);
  assert.match(claim.trackingUsername, /^track-de-uat-/);
  assert.match(after.notifications[0].subject, /tracking account created/);
});
test("duplicate categories, normalized serials, member and household limits", () => {
  const s = submitted(), d = validDraft();
  assert.match(draftErrors(s, d, s.campaigns[0]).join(" "), /already reserved.*One claim/s);
  own(s).applicantId = "DIFFERENT-MEMBER-SAME-HOUSEHOLD";
  d.items[0].sn = "UAT-DIFFERENT-001"; d.items[1].sn = "UAT-DIFFERENT-002";
  assert.match(draftErrors(s, d, s.campaigns[0]).join(" "), /household/);
  const clean = createState(); clean.memberVerified = true;
  d.items.push({ ...d.items[0], sn: "UAT-DIFFERENT-003" });
  assert.match(draftErrors(clean, d, clean.campaigns[0]).join(" "), /one product per category/);
  d.items = [{ productId: "gpu", sn: "uat seed 0 gpu", attached: true }];
  assert.match(draftErrors(clean, d, clean.campaigns[0]).join(" "), /already reserved/);
});
test("exact 14-day boundary and optional marketing consent", () => {
  const s = transition(createState(), { type: "verify" }), d = validDraft();
  d.purchaseDate = "2026-08-13"; d.marketing = false;
  assert.deepEqual(draftErrors(s, d, s.campaigns[0]), []);
  d.purchaseDate = "2026-08-14";
  assert.match(draftErrors(s, d, s.campaigns[0]).join(" "), /14 calendar/);
});
test("capacity failure is atomic and sequential duplicate submits cannot double reserve", () => {
  const s = transition(createState(), { type: "verify" });
  s.campaigns[0].budget = totals(s).used + s.campaigns[0].buffer + 4999;
  const before = structuredClone(s);
  assert.throws(() => transition(s, { type: "submit", draft: validDraft() }), /budget/); assert.deepEqual(s, before);
  const one = submitted();
  assert.throws(() => transition(one, { type: "submit", draft: validDraft() }), /already reserved/);
  assert.equal(one.claims.filter(c => c.applicantId === MEMBER_ID).length, 1);
});
test("manual checks, risk holds and role restrictions block approval", () => {
  let s = submitted(); const id = own(s).id;
  assert.throws(() => transition(s, { type: "review", id, status: "Approved", note: "Test approval" }), /manual check/);
  s = transition(approved(), { type: "hold", id, hold: true, note: "RMA review required" });
  assert.throws(() => transition(s, { type: "review", id, status: "Approved", note: "Test approval" }), /hold/);
  s = transition(s, { type: "role", role: "Support" });
  assert.throws(() => transition(s, { type: "hold", id, hold: false, note: "Clear hold" }), /role/);
  assert.throws(() => transition(s, { type: "batch" }), /role/);
});
test("supplement preserves old serials, resets review checks and keeps budget reserved", () => {
  let s = submitted(); const id = own(s).id, before = totals(s).used;
  s = transition(s, { type: "review", id, status: "More info required", note: "Check serial photo" });
  const d = validDraft(); d.items[0].sn = "UAT-CORRECTED-GPU-001";
  s = transition(s, { type: "supplement", id, draft: d, note: "Corrected sample serial" });
  assert.equal(own(s).status, "Under review"); assert.equal(totals(s).used, before);
  assert.match(own(s).history[0].detail, /UAT-NEW-GPU-001/); assert.match(own(s).history[0].detail, /UAT-CORRECTED-GPU-001/);
  assert.ok(CHECKS.every(k => !own(s).checks[k]));
});
test("campaign version and copied draft preserve existing claims", () => {
  let s = submitted(); const old = structuredClone(own(s).snapshot);
  const next = structuredClone(s.campaigns[0]); next.products[0].amount = 4000;
  s = transition(s, { type: "saveCampaign", campaign: next, note: "Update sample amounts" });
  assert.equal(s.campaigns[0].version, 2); assert.deepEqual(own(s).snapshot, old);
  s = transition(s, { type: "copyCampaign", id: s.activeCampaignId });
  assert.equal(s.campaigns[1].status, "Draft"); assert.equal(totals(s, s.campaigns[1].id).used, 0);
});
test("campaigns can be created directly without copied commitments", () => {
  let s = createState();
  s = transition(s, { type: "createCampaign" });
  const draft = s.campaigns.at(-1);
  assert.equal(draft.name, "Untitled Cashback Campaign"); assert.equal(draft.status, "Draft");
  assert.equal(totals(s, draft.id).used, 0); assert.equal(totals(s, draft.id).count, 0);
  s = transition(s, { type: "role", role: "Reviewer" });
  assert.throws(() => transition(s, { type: "createCampaign" }), /role/);
});
test("supplement cannot replace case identity, amount, snapshot or existing history", () => {
  let s = submitted(); const id = own(s).id;
  s = transition(s, { type: "review", id, status: "More info required", note: "Request a better sample" });
  const before = structuredClone(own(s));
  const payload = { ...validDraft(), id: "OTHER-ID", applicantId: "OTHER-MEMBER", amount: 1, snapshot: {}, history: [] };
  s = transition(s, { type: "supplement", id, draft: payload, note: "Supplement sample files" });
  const after = own(s);
  assert.equal(after.id, before.id); assert.equal(after.amount, before.amount); assert.deepEqual(after.snapshot, before.snapshot);
  assert.deepEqual(after.history.slice(1), before.history);
});
test("repeated batch creation cannot duplicate logical instructions", () => {
  const s = prepared();
  assert.equal(s.payments.filter(p => p.claimId === own(s).id).length, 1);
  assert.throws(() => transition(s, { type: "batch" }), /No approved/);
});
test("email delivery is not paid; unknown results block retry and keep approved budget", () => {
  let s = prepared(); const id = pay(s).id, amount = totals(s).approved;
  for (const operation of ["authorize", "send", "delivered"]) s = transition(s, { type: "pay", id, operation });
  assert.equal(pay(s).status, "Submitted"); assert.equal(totals(s).approved, amount);
  s = transition(s, { type: "pay", id, operation: "unknown" });
  assert.throws(() => transition(s, { type: "pay", id, operation: "retry" }), /confirmed failure/);
  assert.throws(() => transition(s, { type: "pay", id, operation: "send" }), /Authorize/);
  assert.equal(totals(s).approved, amount);
});
test("confirmed-failure retry keeps ID; settlement moves approved to paid once", () => {
  let s = prepared(); const id = pay(s).id;
  for (const operation of ["authorize", "send"]) s = transition(s, { type: "pay", id, operation });
  s = transition(s, { type: "pay", id, operation: "failed", evidence: "UAT-FAIL-001" });
  for (const operation of ["retry", "send"]) s = transition(s, { type: "pay", id, operation });
  const before = totals(s);
  s = transition(s, { type: "pay", id, operation: "paid", evidence: "UAT-SETTLEMENT-001" });
  assert.equal(pay(s).id, id); assert.equal(pay(s).attempts, 2);
  assert.equal(totals(s).approved, before.approved - own(s).amount); assert.equal(totals(s).paid, before.paid + own(s).amount);
  assert.equal(totals(s).remaining, before.remaining);
  assert.throws(() => transition(s, { type: "pay", id, operation: "paid", evidence: "UAT-AGAIN" }), /not awaiting/);
  assert.throws(() => transition(s, { type: "cancel", id: own(s).id, note: "Returned item" }), /reconciled/);
});
test("late RMA hold blocks submission of an authorized payment", () => {
  let s = prepared(); const id = pay(s).id;
  s = transition(s, { type: "pay", id, operation: "authorize" });
  s = transition(s, { type: "hold", id: own(s).id, hold: true, note: "Late RMA flag" });
  assert.throws(() => transition(s, { type: "pay", id, operation: "send" }), /without a hold/);
  assert.equal(pay(s).attempts, 0);
});
test("rejection releases reservation; CSV neutralizes spreadsheet formulas", () => {
  let s = submitted(); const before = totals(s);
  s = transition(s, { type: "review", id: own(s).id, status: "Rejected", note: "Purchase evidence does not match" });
  assert.equal(totals(s).remaining, before.remaining + 5000);
  assert.match(csv([["=1+1", 'a"b', "normal"]]), /"'=1\+1","a""b","normal"/);
});
