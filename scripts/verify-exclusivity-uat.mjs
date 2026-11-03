import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

// Manual live regression: uses hidden synthetic campaigns and closes every test claim.
const base = process.env.CASHBACK_API_URL;
assert.ok(base, 'CASHBACK_API_URL is required');
const email = process.env.AORUS_TEST_EMAIL ?? 'test@gmail.com';
const cookies = new Map();
const campaigns = [];
const claims = [];
const checks = [];
const stamp = Date.now();
const report = { started_at: new Date().toISOString(), base_url: base, checks };

async function request(path, body, status = 200) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (cookies.has('XSRF-TOKEN')) headers.RequestVerificationToken = decodeURIComponent(cookies.get('XSRF-TOKEN'));
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(90000),
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0]; const at = pair.indexOf('=');
    cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const raw = await response.text();
  assert.equal(response.status, status, `${path}: HTTP ${response.status} ${raw.slice(0, 500)}`);
  return raw ? JSON.parse(raw) : null;
}
function pass(check) { checks.push(check); console.log(`PASS ${check}`); }
async function currentCampaign(id) { return (await request('/api/operations/campaigns?admin=true')).find(c => c.id === id); }
async function currentClaim(id) { return (await request('/api/operations/claims')).find(c => c.id === id); }
async function createCampaign(label, group) {
  const iso = days => new Date(stamp + days * 86400000).toISOString();
  const campaign = await request('/api/operations/campaigns', {
    name: `Exclusivity regression ${stamp} ${label}`, slug: `exclusive-test-${stamp}-${label}`, status: 'Draft',
    market: 'DE', markets: ['DE'], languages: ['en'], currency: 'EUR', timeZone: 'Europe/Berlin',
    purchaseStart: iso(-30), purchaseEnd: iso(1), claimStart: iso(-10), claimEnd: iso(10), waitingDays: 0,
    maxClaimsPerPerson: 2, maxClaimsPerHousehold: 2, maxItemsPerCategory: 1, claimLimit: 5,
    budgetMinor: 1000, bufferMinor: 0, acceptingClaims: true, exclusivityGroup: group,
    termsVersion: 'exclusive-test-1', terms: 'Synthetic test terms', privacy: 'Synthetic test privacy',
    products: [{ id: 'EXCLUSIVE-TEST', category: 'Motherboard', model: 'Synthetic board', cashbackMinor: 100, quantityLimit: 1 }],
    retailers: [{ id: 'TEST-SHOP', name: 'Synthetic test retailer', country: 'DE' }],
    legacyFields: { dataPurpose: 'integration-test' },
  });
  campaigns.push(campaign.id);
  return request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'Synthetic exclusivity regression' });
}
async function createClaim(campaignId, suffix) {
  const claim = await request('/api/operations/claims', {
    campaignId, market: 'DE', email, confirmEmail: email,
    firstName: 'Synthetic', lastName: 'Test', address1: `Test-only address ${stamp}`, city: 'Berlin', postcode: '10115',
    residenceCountry: 'DE', purchaseCountry: 'DE', bankCountry: 'DE', language: 'en', termsAccepted: true, privacyAccepted: true,
    purchaseDate: new Date(stamp - 86400000).toISOString(), purchaseAmountMinor: 10000,
    invoiceNumber: `EXCLUSIVE-${stamp}-${suffix}`, retailerId: 'TEST-SHOP',
    bank: { accountHolder: 'Synthetic Test', iban: 'DE00000000000000000000' },
    items: [{ productId: 'EXCLUSIVE-TEST', serialNumber: `EXCLUSIVE-${stamp}-${suffix}` }],
  });
  claims.push(claim.id);
  const content = Buffer.from('%PDF-1.4\nSynthetic exclusivity regression evidence\n%%EOF').toString('base64');
  for (const [kind, productId] of [['Invoice', ''], ['SerialNumber', 'EXCLUSIVE-TEST']])
    await request(`/api/operations/claims/${claim.id}/evidence`, { fileName: `${kind}.pdf`, kind, productId, content });
  return claim;
}
async function submit(id) { return request(`/api/operations/claims/${id}/submit`, {}); }
async function close(id, action) { return request(`/api/operations/claims/${id}/action`, { action, reason: 'Synthetic exclusivity regression' }); }
async function blocked(id, pattern) {
  const result = await request(`/api/operations/claims/${id}/submit`, {}, 403);
  assert.match(result.error.message, pattern);
}

try {
  await request('/api/dev-auth/session');
  await request('/api/dev-auth/login', { area: 'admin' });
  await request('/api/dev-auth/session');
  const group = `exclusive-regression-${stamp}`;
  const firstCampaign = await createCampaign('a', group);
  const otherCampaign = await createCampaign('b', ` ${group.toUpperCase()} `);
  const visible = await request('/api/operations/campaigns');
  assert.ok(campaigns.every(id => !visible.some(c => c.id === id)));
  pass('Synthetic campaigns stay hidden from public discovery');

  const first = await createClaim(firstCampaign.id, 'first');
  const second = await createClaim(firstCampaign.id, 'second');
  const third = await createClaim(firstCampaign.id, 'over-limit');
  const other = await createClaim(otherCampaign.id, 'other-campaign');
  assert.equal((await submit(first.id)).reviewStatus, 'Submitted');
  assert.equal((await submit(second.id)).reviewStatus, 'Submitted');
  assert.equal((await currentCampaign(firstCampaign.id)).reservedMinor, 200);
  pass('Two same-campaign claims submit with shared owner/email and separate serials');

  await blocked(third.id, /Applicant claim limit exceeded/);
  assert.equal((await currentClaim(third.id)).reviewStatus, 'Draft');
  assert.equal((await currentCampaign(firstCampaign.id)).reservedMinor, 200);
  pass('Per-person limit still blocks the third claim without reserving budget');
  await blocked(other.id, /exclusive campaign/);
  assert.equal((await currentCampaign(otherCampaign.id)).reservedMinor, 0);
  pass('Another campaign with an equivalent normalized group stays blocked');

  await close(first.id, 'supplement');
  assert.equal((await submit(first.id)).reviewStatus, 'Submitted');
  assert.equal((await currentCampaign(firstCampaign.id)).reservedMinor, 200);
  pass('Supplement resubmission shares scopes and does not double-reserve budget');
  await close(first.id, 'cancel');
  assert.equal((await currentCampaign(firstCampaign.id)).reservedMinor, 100);
  await blocked(other.id, /exclusive campaign/);
  pass('Cancelling the original scope owner keeps the remaining claim exclusive');
  await close(second.id, 'reject');
  assert.equal((await currentCampaign(firstCampaign.id)).reservedMinor, 0);
  assert.equal((await submit(other.id)).reviewStatus, 'Submitted');
  assert.equal((await currentCampaign(otherCampaign.id)).reservedMinor, 100);
  pass('Closing the last claim releases the group for another campaign');
  report.passed = true;
} finally {
  try {
    for (const id of claims) {
      const claim = await currentClaim(id);
      if (!['Cancelled', 'Rejected'].includes(claim.reviewStatus)) await close(id, 'cancel');
    }
    for (const id of campaigns) {
      const campaign = await currentCampaign(id);
      assert.equal(campaign.reservedMinor, 0);
      assert.equal(campaign.approvedMinor, 0);
      assert.equal(campaign.paidMinor, 0);
      await request(`/api/operations/campaigns/${id}/save`, {
        ...campaign.data, concurrencyStamp: campaign.concurrencyStamp, status: 'Archived', acceptingClaims: false,
      });
      await request(`/api/operations/campaigns/${id}/publish`, { reason: 'Archive completed synthetic exclusivity regression' });
    }
    report.cleanup_complete = true;
    pass('All synthetic claims closed, budgets released, campaigns archived; no payments created');
  } finally {
    report.campaign_ids = campaigns;
    report.claim_ids = claims;
    report.completed_at = new Date().toISOString();
    report.payment_created = false;
    if (process.env.CASHBACK_EXCLUSIVITY_REPORT)
      writeFileSync(process.env.CASHBACK_EXCLUSIVITY_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    await request('/api/dev-auth/logout', {});
  }
}
