import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { campaignSession } from './campaign-api-session.mjs';

const checks = [];
const check = name => { checks.push(name); console.log(`PASS ${name}`); };
const admin = campaignSession();
const consumer = campaignSession();
await consumer.login('public');
await consumer.request('/api/operations/reports', undefined, 403);
await consumer.request('/api/operations/reports/export', undefined, 403);
await consumer.request('/api/operations/catalog', undefined, 403);
check('consumer-only session cannot read admin reports, export or master catalog');
await admin.login('admin');
assert.equal((await admin.login('public')).area, 'admin');
await admin.request('/api/operations/reports');
await admin.request('/api/operations/reports/export');
await admin.request('/api/operations/reconciliations');
check('consumer sign-in preserves existing admin cookie and reports/reconciliation access');
await admin.request('/api/dev-auth/logout', {});
assert.equal((await admin.request('/api/dev-auth/session')).isAuthenticated, false);
await admin.login('public');
await admin.request('/api/operations/catalog', undefined, 403);
check('logout removes admin role; subsequent consumer login remains unprivileged');
await admin.login('admin');
const request = admin.request;
const source = JSON.parse(await readFile(new URL('../frontend/apps/admin-web/public/templates/q1-campaign.json', import.meta.url), 'utf8'));
assert.deepEqual((await request('/api/operations/campaigns/validate', source.data)).errors, []);
assert.ok((await request('/api/operations/campaigns/validate', { ...source.data, name: '' })).errors.some(e => e.path === 'name'));
check('complete screenshot-derived Q1 template passes shared server preflight');
const stamp = Date.now().toString();
const envelope = structuredClone(source);
envelope.data.name = `Configuration test ${stamp}`;
envelope.data.slug = `configuration-test-${stamp}`;
envelope.data.legacyFields.dataPurpose = 'integration-test';
envelope.data.legacyFields.integrationMarker = stamp;
envelope.data.products[0].model = 'Synthetic "quoted", model\nwith newline';
envelope.data.terms += '\nRoundtrip Unicode: 繁體中文 €.';
const campaign = await request('/api/operations/campaigns/import', { configuration: envelope, reason: 'Synthetic complete configuration roundtrip test' });
assert.equal(campaign.publishedVersion, 0);
assert.equal(campaign.reservedMinor, 0);
const exported = await request(`/api/operations/campaigns/${campaign.id}/configuration`);
assert.ok(!Object.hasOwn(exported.data, 'concurrencyStamp'));
assert.deepEqual(Object.keys(exported).sort(), ['data', 'format', 'schemaVersion']);
assert.equal(exported.data.terms, envelope.data.terms);
assert.deepEqual(exported.data.products, envelope.data.products);
assert.deepEqual(exported.data.retailers, envelope.data.retailers);
assert.equal(exported.data.maxClaimsPerHousehold, 1);
check('import creates draft only; full JSON retains text, products, retailers and canonical rules without runtime state');
const copy = await request('/api/operations/campaigns/import', { configuration: exported, reason: 'Synthetic raw export can reimport without manual modification' });
assert.notEqual(copy.id, campaign.id);
assert.equal(copy.publishedVersion, 0);
assert.deepEqual((await request(`/api/operations/campaigns/${copy.id}/configuration`)), exported);
check('export to new draft is a lossless settings roundtrip');
await consumer.request(`/api/operations/campaigns/${campaign.id}/configuration`, undefined, 403);
await consumer.request('/api/operations/campaigns/import', { configuration: exported, reason: 'Must deny consumer' }, 403);
check('configuration transfer requires campaign management permission');
const published = await request(`/api/operations/campaigns/${campaign.id}/publish`, { reason: 'Synthetic immutable snapshot test' });
const beforeSnapshot = await request(`/api/operations/campaigns/${campaign.id}/configuration?version=1`);
const change = structuredClone(exported);
change.data.description += '\nChanged draft only';
change.data.products[0].cashbackMinor += 100;
const updated = await request('/api/operations/campaigns/import', { configuration: change, targetCampaignId: campaign.id, concurrencyStamp: published.concurrencyStamp, reason: 'Update draft, preserve published version' });
assert.equal(updated.publishedVersion, 1);
assert.deepEqual(await request(`/api/operations/campaigns/${campaign.id}/configuration?version=1`), beforeSnapshot);
assert.equal(updated.reservedMinor, published.reservedMinor);
assert.equal(updated.paidMinor, published.paidMinor);
await request('/api/operations/campaigns/import', { configuration: change, targetCampaignId: campaign.id, concurrencyStamp: published.concurrencyStamp, reason: 'Stale update must fail' }, 403);
check('draft import preserves published snapshots and balances; stale concurrency is rejected');
const countBefore = (await request('/api/operations/campaigns?admin=true')).length;
for (const [label, mutation] of [
  ['unknown schema', e => { e.schemaVersion = 99; }],
  ['unknown field', e => { e.data.unknownTypo = true; }],
  ['runtime state', e => { e.data.concurrencyStamp = 'injected'; }],
  ['duplicate product', e => { e.data.products.push(e.data.products[0]); }],
  ['nonpositive reward', e => { e.data.products[0].cashbackMinor = 0; }],
  ['unsupported country', e => { e.data.markets.push('GB'); }],
]) {
  const invalid = structuredClone(exported);
  mutation(invalid);
  await request('/api/operations/campaigns/import', { configuration: invalid, reason: `Reject ${label}` }, 403);
}
assert.equal((await request('/api/operations/campaigns?admin=true')).length, countBefore);
check('invalid schema, fields, state, duplicate IDs, amount and sixth country produce no campaign writes');
const invalid = structuredClone(exported.data);
invalid.products[0].cashbackMinor = -1;
assert.ok((await request('/api/operations/campaigns/validate', invalid)).errors.some(e => e.path.includes('products')));
check('preflight returns row/field-addressable errors');
const product = { id: `test-catalog-${stamp}`, category: 'Monitor', model: 'Synthetic catalog', series: 'Test', ean: '', group: 'Integration test' };
await request('/api/operations/catalog', { products: [product], retailers: [], reason: 'Synthetic catalog persistence test', conflictStrategy: 'reject' });
assert.deepEqual((await request('/api/operations/catalog')).products.find(p => p.id === product.id), product);
const newcomer = { ...product, id: `${product.id}-atomic` };
await request('/api/operations/catalog', { products: [newcomer, { ...product, model: 'Conflict' }], retailers: [], reason: 'No partial catalog import on conflict', conflictStrategy: 'reject' }, 403);
assert.ok(!(await request('/api/operations/catalog')).products.some(p => p.id === newcomer.id));
await request('/api/operations/catalog', { products: [{ ...product, model: 'Explicit replacement' }], retailers: [], reason: 'Explicit metadata replacement', conflictStrategy: 'replace' });
assert.deepEqual(await request(`/api/operations/campaigns/${campaign.id}/configuration?version=1`), beforeSnapshot);
check('master catalog persists, rejects whole conflicting import and never mutates published snapshots');
assert.ok(!(await request('/api/operations/campaigns')).some(c => c.id === campaign.id || c.id === copy.id));
check('synthetic test records remain hidden from public discovery');
console.log(JSON.stringify({ passed: checks.length, campaignId: campaign.id, copyId: copy.id, checks }, null, 2));
