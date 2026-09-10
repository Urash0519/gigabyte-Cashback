// Explicit UAT-only Q1 simulation. Never replaces existing campaigns or published history.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { campaignSession } from './campaign-api-session.mjs';

const template = JSON.parse(await readFile(new URL('../frontend/apps/admin-web/public/templates/q1-campaign.json', import.meta.url), 'utf8'));
const { request, login } = campaignSession();
const session = await login('admin');
assert.equal(session.development, true, 'Refuse to seed a non-development environment.');
assert.equal(session.area, 'admin');
const slug = 'q1-build-beyond-uat-v1';
const existing = (await request('/api/operations/campaigns?admin=true')).filter(c => c.data.slug === slug);
assert.ok(existing.length <= 1, 'Duplicate Q1 simulation slug: manual inspection required.');
let campaign = existing[0];
if (campaign) {
  assert.equal(campaign.data.legacyFields.dataPurpose, 'q1-simulation', 'Slug is owned by another campaign.');
  console.log(`Retained existing Q1 simulation ${campaign.id}; dates and settings are unchanged.`);
} else {
  const data = template.data;
  const now = new Date();
  const date = days => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)).toISOString();
  data.legacyFields = {
    ...data.legacyFields,
    dataPurpose: 'q1-simulation', simulationVersion: '1',
    sourcePurchaseStart: data.purchaseStart, sourcePurchaseEnd: data.purchaseEnd,
    sourceClaimStart: data.claimStart, sourceClaimEnd: data.claimEnd,
    simulationDatePolicy: 'Purchase -45 to +60 days; claims -31 to +90 days from initial seed, UTC. Not historical Q1 eligibility.',
  };
  Object.assign(data, {
    name: 'Q1 Build Beyond — UAT simulation', slug, status: 'Draft',
    purchaseStart: date(-45), purchaseEnd: date(60), claimStart: date(-31), claimEnd: date(90),
    description: "UAT SIMULATION — selected GIGABYTE graphics cards, motherboards and monitors with up to EUR 180 combined standard cashback. One invoice, one product per category, one claim per person/household; wait 14 days. The displayed dates are shifted for testing. No real offer, payment or A+B bonus.",
  });
  // Campaign-independent metadata only; do not replace operator-maintained catalog rows.
  const catalog = await request('/api/operations/catalog');
  const products = data.products.filter(p => !catalog.products.some(c => c.id.toLowerCase() === p.id.toLowerCase()))
    .map(({ cashbackMinor, quantityLimit, ...p }) => ({ ...p, group: 'Q1 Build Beyond' }));
  const retailers = data.retailers.filter(r => !catalog.retailers.some(c => c.id.toLowerCase() === r.id.toLowerCase()))
    .map(({ validFrom, validTo, ...r }) => ({ ...r, group: `Q1 ${r.country}` }));
  if (products.length || retailers.length)
    await request('/api/operations/catalog', { products, retailers, reason: 'Seed screenshot-derived Q1 master metadata for UAT', conflictStrategy: 'reject' });
  const validation = await request('/api/operations/campaigns/validate', data);
  assert.deepEqual(validation.errors, [], 'Q1 simulation must pass preflight.');
  campaign = await request('/api/operations/campaigns/import', {
    configuration: template, reason: 'Create clearly labeled Q1 reference simulation with active UAT dates',
  });
}
// Resume interrupted first publication only; never republish changed operator drafts.
if (campaign.publishedVersion === 0)
  campaign = await request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'Publish Q1 simulation for requested UAT, not a real promotion' });
const visible = (await request('/api/operations/campaigns')).find(c => c.id === campaign.id);
assert.ok(visible, 'Q1 simulation must be visible publicly.');
console.log(JSON.stringify({ campaignId: campaign.id, slug, publishedVersion: campaign.publishedVersion,
  products: visible.data.products.length, retailers: visible.data.retailers.length, markets: visible.data.markets,
  purchaseStart: visible.data.purchaseStart, purchaseEnd: visible.data.purchaseEnd,
  claimStart: visible.data.claimStart, claimEnd: visible.data.claimEnd, simulation: true }, null, 2));
