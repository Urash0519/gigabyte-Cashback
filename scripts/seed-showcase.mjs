// Explicit, development-only fixture creation. Existing campaigns and claims are never deleted or overwritten.
import assert from 'node:assert/strict';

const base = process.env.CASHBACK_API_URL ?? 'http://localhost:44305';
const slug = 'aorus-upgrade-showcase-v1';
const jar = new Map();
async function request(path, body) {
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
  };
  if (jar.has('XSRF-TOKEN')) headers.RequestVerificationToken = decodeURIComponent(jar.get('XSRF-TOKEN'));
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0];
    const at = pair.indexOf('=');
    jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const raw = await response.text();
  assert.equal(response.status, 200, `${path}: ${response.status} ${raw.slice(0, 500)}`);
  return JSON.parse(raw);
}

await request('/api/dev-auth/session');
await request('/api/dev-auth/login', { area: 'admin' });
assert.equal((await request('/api/dev-auth/session')).email, 'yoyo.chen@gigabyte.com');
const existing = (await request('/api/operations/campaigns?admin=true')).filter(c => c.data.slug === slug);
assert.ok(existing.length <= 1, 'Duplicate showcase slug; inspect the campaigns before continuing.');
let campaign = existing[0];
if (campaign) {
  assert.equal(campaign.data.legacyFields.dataPurpose, 'showcase', 'Slug is already owned by a non-showcase campaign.');
  console.log(`Existing showcase retained: ${campaign.id} (version ${campaign.publishedVersion})`);
} else {
  const now = new Date();
  const date = offset => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString();
  const retailers = [
    ['de-amazon', 'Amazon.de', 'DE'], ['de-alternate', 'Alternate.de', 'DE'], ['de-mindfactory', 'Mindfactory', 'DE'],
    ['fr-amazon', 'Amazon.fr', 'FR'], ['fr-ldlc', 'LDLC', 'FR'], ['fr-topachat', 'Top Achat', 'FR'],
    ['it-amazon', 'Amazon.it', 'IT'], ['it-nexths', 'Nexths', 'IT'],
    ['es-amazon', 'Amazon.es', 'ES'], ['es-pc', 'PcComponentes', 'ES'],
    ['nl-megekko', 'Megekko', 'NL'], ['nl-alternate', 'Alternate.nl', 'NL'],
  ].map(([id, name, country]) => ({ id, name, country, url: '', validFrom: null, validTo: null }));
  campaign = await request('/api/operations/campaigns', {
    name: 'AORUS Upgrade Cashback', slug, type: 'Cashback', status: 'Draft',
    market: 'DE', markets: ['DE', 'FR', 'IT', 'ES', 'NL'], languages: ['en'], currency: 'EUR', timeZone: 'Europe/Berlin',
    purchaseStart: date(-45), purchaseEnd: date(60), claimStart: date(-31), claimEnd: date(90),
    waitingDays: 14, maxClaimsPerPerson: 3, maxClaimsPerHousehold: 3, maxItemsPerCategory: 1,
    claimLimit: 1000, budgetMinor: 10000000, bufferMinor: 500000, acceptingClaims: true,
    termsVersion: 'showcase-1',
    terms: 'Internal demonstration only: this is not a live promotion or an offer of payment. Purchase eligible products from a listed retailer during the purchase period. Submit products from the same invoice in one claim after the 14-day waiting period and before the claim deadline. One item per product category; up to three claims per person and household. Keep the invoice and a photo of each product serial label. Returned or cancelled purchases are ineligible.',
    privacy: 'Internal demonstration only. Use synthetic information and documents. This environment demonstrates application review and manual payment processing; it does not send bank instructions or real email.',
    faq: 'Can I buy in another country? Yes: this example accepts participating retailers across Germany, France, Italy, Spain and the Netherlands. Can I add multiple products? Yes, on the same invoice, with one item per category. When can I claim? At least 14 days after purchase and within the claim period. Are rewards guaranteed? No; the displayed amounts are sample values and submission remains subject to validation and review.',
    description: 'Upgrade your build with selected AORUS graphics cards, motherboards and OLED monitors. Internal showcase — sample rewards and retailer participation only.',
    bannerUrl: '', supportEmail: 'support@example.test',
    products: [
      { id: 'gpu', category: 'Graphics card', series: 'AORUS', model: 'AORUS Radeon RX 9070 XT ELITE 16G', ean: '', cashbackMinor: 3000, quantityLimit: 1 },
      { id: 'mb', category: 'Motherboard', series: 'AORUS', model: 'B850 AORUS ELITE WIFI7', ean: '', cashbackMinor: 2000, quantityLimit: 1 },
      { id: 'monitor', category: 'Monitor', series: 'AORUS', model: 'AORUS FO27Q5P', ean: '', cashbackMinor: 6000, quantityLimit: 1 },
    ],
    retailers,
    legacyFields: { dataPurpose: 'showcase', showcaseVersion: '1', reviewSlaDays: '7', maxClaimsPerHousehold: '3', privacyVersion: 'showcase-1', notificationTemplateVersion: 'claim-update-v1' },
  });
}
// Resume safely if a previous invocation stopped between creation and first publication.
if (campaign.publishedVersion === 0) {
  campaign = await request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'Publish clearly labeled internal showcase for public interface review' });
}
const publicCampaigns = await request('/api/operations/campaigns');
assert.ok(publicCampaigns.some(c => c.id === campaign.id), 'Showcase must be discoverable on the public website.');
assert.ok(!publicCampaigns.some(c => c.data.legacyFields.dataPurpose === 'integration-test'), 'Test fixtures must not be publicly listed.');
console.log(JSON.stringify({ campaignId: campaign.id, slug, publishedVersion: campaign.publishedVersion, publicUrl: 'http://localhost:5173', purpose: 'Internal showcase; sample terms, values and retailers' }, null, 2));
