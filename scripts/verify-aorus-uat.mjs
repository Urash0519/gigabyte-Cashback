import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

// Manual live UAT check. Creates an explicitly marked fixture, then cancels and archives it.
const base = process.env.CASHBACK_API_URL;
assert.ok(base, 'CASHBACK_API_URL is required');
const knownEmail = process.env.AORUS_TEST_EMAIL ?? 'test@gmail.com';
const missingEmail = 'aorus-api-verification-20261030@example.invalid';
const cookies = new Map();
const checks = [];
let campaign;
let claim;
let cleanupComplete = false;
const report = { started_at: new Date().toISOString(), base_url: base, checks };
async function request(path, body, status = 200) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (cookies.has('XSRF-TOKEN')) headers.RequestVerificationToken = decodeURIComponent(cookies.get('XSRF-TOKEN'));
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(180000) });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0]; const at = pair.indexOf('=');
    cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const raw = await response.text();
  assert.equal(response.status, status, `${path}: HTTP ${response.status} ${raw.slice(0, 500)}`);
  return raw ? JSON.parse(raw) : null;
}
function pass(check) { checks.push(check); console.log(`PASS ${check}`); }
async function currentCampaign() { return (await request('/api/operations/campaigns?admin=true')).find(c => c.id === campaign.id); }
async function currentClaim() { return (await request('/api/operations/claims')).find(c => c.id === claim.id); }
try {
  await request('/api/dev-auth/session');
  await request('/api/dev-auth/login', { area: 'admin' });
  await request('/api/dev-auth/session');
  const stamp = Date.now(); const today = Date.now(); const iso = days => new Date(today + days * 86400000).toISOString();
  campaign = await request('/api/operations/campaigns', {
    name: `AORUS integration ${stamp}`, slug: `aorus-verification-${stamp}`, type: 'Cashback', status: 'Draft',
    market: 'DE', markets: ['DE'], languages: ['en'], currency: 'EUR', timeZone: 'Europe/Berlin',
    purchaseStart: iso(-30), purchaseEnd: iso(1), claimStart: iso(-10), claimEnd: iso(10), waitingDays: 0,
    maxClaimsPerPerson: 2, maxClaimsPerHousehold: 2, maxItemsPerCategory: 1, claimLimit: 2,
    budgetMinor: 1000, bufferMinor: 0, acceptingClaims: true, termsVersion: 'aorus-test-1',
    terms: 'Synthetic test terms', privacy: 'Synthetic test privacy', description: 'AORUS integration verification',
    products: [{ id: 'AORUS-TEST', category: 'GPU', model: 'Synthetic test product', cashbackMinor: 100, quantityLimit: 1 }],
    retailers: [{ id: 'TEST-SHOP', name: 'Synthetic test retailer', country: 'DE', url: '' }],
    legacyFields: { dataPurpose: 'integration-test' }
  });
  report.campaign_id = campaign.id;
  campaign = await request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'AORUS integration verification' });
  assert.ok(!(await request('/api/operations/campaigns')).some(c => c.id === campaign.id));
  pass('Synthetic campaign is hidden from public discovery');
  claim = await request('/api/operations/claims', {
    campaignId: campaign.id, market: 'DE', email: missingEmail, confirmEmail: missingEmail,
    firstName: 'Synthetic', lastName: 'Test', address1: `Test-only address ${stamp}`, city: 'Berlin', postcode: '10115',
    residenceCountry: 'DE', purchaseCountry: 'DE', bankCountry: 'DE', language: 'en', termsAccepted: true, privacyAccepted: true,
    purchaseDate: iso(-1), purchaseAmountMinor: 10000, invoiceNumber: `AORUS-TEST-${stamp}`, retailerId: 'TEST-SHOP',
    bank: { accountHolder: 'Synthetic Test', iban: 'DE00000000000000000000' },
    items: [{ productId: 'AORUS-TEST', serialNumber: `AORUS-TEST-${stamp}` }]
  });
  report.claim_id = claim.id;
  const originalEmail = claim.data.email;
  const missingCheck = await request(`/api/operations/claims/${claim.id}/verify-email`, { email: missingEmail });
  assert.equal(missingCheck.isMember, false);
  const foundCheck = await request(`/api/operations/claims/${claim.id}/verify-email`, { email: ` ${knownEmail} ` });
  assert.equal(foundCheck.email, knownEmail); assert.equal(foundCheck.isMember, true);
  assert.equal((await currentClaim()).data.email, originalEmail);
  assert.ok(!/access_token|client_secret|password/i.test(JSON.stringify(foundCheck)));
  pass('Early lookup checks unsaved emails without changing the draft or exposing credentials');
  const anonymous = await fetch(`${base}/api/operations/claims/${claim.id}/verify-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: knownEmail }),
  });
  assert.equal(anonymous.status, 401);
  const invalidCheck = await request(`/api/operations/claims/${claim.id}/verify-email`, { email: 'invalid' }, 403);
  assert.match(invalidCheck.error.message, /valid email/);
  pass('Early lookup requires authentication and validates email format');
  if (process.env.AORUS_BROWSER_CHECK === '1') {
    const { verifyLiveAorusEmailUi } = await import('./verify-live-aorus-email-ui.mjs');
    report.browser_checks = await verifyLiveAorusEmailUi({ base, cookies, campaignId: campaign.id, claimId: claim.id });
    assert.equal((await currentClaim()).data.email, originalEmail);
    pass('Real browser shows AORUS membership results before claim submission without saving input');
  }
  let rejection = await request(`/api/operations/claims/${claim.id}/submit`, {}, 403);
  assert.match(rejection.error.message, /No AORUS member/);
  claim = await currentClaim(); assert.equal(claim.reviewStatus, 'Draft');
  assert.equal((await currentCampaign()).reservedMinor, 0);
  pass('Unknown AORUS email blocks submission without reserving budget');
  claim = await request(`/api/operations/claims/${claim.id}/save`, { ...claim.data, email: knownEmail, confirmEmail: missingEmail });
  rejection = await request(`/api/operations/claims/${claim.id}/submit`, {}, 403);
  assert.match(rejection.error.message, /Email confirmation must match/);
  pass('Email confirmation still must match');
  claim = await request(`/api/operations/claims/${claim.id}/save`, { ...claim.data, email: knownEmail, confirmEmail: knownEmail });
  const content = Buffer.from('%PDF-1.4\nSynthetic AORUS verification evidence\n%%EOF').toString('base64');
  for (const [kind, productId] of [['Invoice', ''], ['SerialNumber', 'AORUS-TEST']])
    await request(`/api/operations/claims/${claim.id}/evidence`, { fileName: `${kind}.pdf`, kind, productId, content });
  claim = await request(`/api/operations/claims/${claim.id}/submit`, {});
  assert.equal(claim.reviewStatus, 'Submitted'); assert.equal(claim.amountMinor, 100);
  assert.equal((await currentCampaign()).reservedMinor, 100);
  pass('Known AORUS email passes actual claim submission');
  const closedCheck = await request(`/api/operations/claims/${claim.id}/verify-email`, { email: knownEmail }, 403);
  assert.match(closedCheck.error.message, /editable claim/);
  pass('Early lookup is restricted to editable claims');
  claim = await request(`/api/operations/claims/${claim.id}/action`, { action: 'supplement', reason: 'Synthetic email correction test' });
  claim = await request(`/api/operations/claims/${claim.id}/save`, { ...claim.data, email: missingEmail, confirmEmail: missingEmail, changeReason: 'Synthetic unknown-email correction' });
  rejection = await request(`/api/operations/claims/${claim.id}/submit`, {}, 403);
  assert.match(rejection.error.message, /No AORUS member/);
  assert.equal((await currentClaim()).reviewStatus, 'MoreInfoRequired');
  assert.equal((await currentCampaign()).reservedMinor, 100);
  pass('Supplement resubmission rechecks the current email and preserves budget on rejection');
  claim = await request(`/api/operations/claims/${claim.id}/save`, { ...claim.data, email: knownEmail, confirmEmail: knownEmail, changeReason: 'Restore known test member' });
  claim = await request(`/api/operations/claims/${claim.id}/submit`, {});
  assert.equal(claim.reviewStatus, 'Submitted');
  assert.equal((await currentCampaign()).reservedMinor, 100);
  pass('Corrected supplement submits without double reservation');
  report.passed = true;
} finally {
  try {
    if (claim) {
      claim = await currentClaim();
      if (!['Cancelled', 'Rejected'].includes(claim.reviewStatus))
        claim = await request(`/api/operations/claims/${claim.id}/action`, { action: 'cancel', reason: 'AORUS synthetic verification completed' });
      assert.equal(claim.reviewStatus, 'Cancelled');
      await request(`/api/operations/claims/${claim.id}/action`, { action: 'archive-test', reason: 'Remove completed AORUS test claim from lists' });
      assert.ok(!(await request('/api/operations/claims?admin=true')).some(c => c.id === claim.id));
      report.claim_archived = true;
    }
    if (campaign) {
      campaign = await currentCampaign();
      assert.equal(campaign.reservedMinor, 0); assert.equal(campaign.approvedMinor, 0); assert.equal(campaign.paidMinor, 0);
      await request(`/api/operations/campaigns/${campaign.id}/save`, { ...campaign.data, concurrencyStamp: campaign.concurrencyStamp, status: 'Archived', acceptingClaims: false });
      await request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'Archive completed synthetic AORUS verification' });
    }
    cleanupComplete = true;
    pass('Synthetic claim cancelled and archived from lists, budget released, and hidden campaign archived');
  } finally {
    report.cleanup_complete = cleanupComplete;
    report.completed_at = new Date().toISOString();
    report.payment_created = false;
    if (process.env.AORUS_SMOKE_REPORT) writeFileSync(process.env.AORUS_SMOKE_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    await request('/api/dev-auth/logout', {}, 200);
  }
}
