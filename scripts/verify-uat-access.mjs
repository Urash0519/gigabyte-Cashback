import assert from 'node:assert/strict';
import { fetchWithUatAccess } from './uat-fetch.mjs';
const base = process.env.CASHBACK_API_URL;
assert.ok(base && process.env.CASHBACK_UAT_BASIC_AUTH, 'Supply UAT URL and gateway authentication through environment variables.');
for (const path of ['/', '/admin/', '/health', '/api/dev-auth/session', '/api/operations/campaigns']) {
  const noGateHeaders = process.env.CASHBACK_RUN_ID_TOKEN
    ? { 'X-Serverless-Authorization': `Bearer ${process.env.CASHBACK_RUN_ID_TOKEN}` } : {};
  const denied = await fetch(base + path, { headers: noGateHeaders, redirect: 'error' });
  assert.equal(denied.status, 401, `Gateway must challenge missing UAT password: ${path}`);
  assert.match(denied.headers.get('www-authenticate') ?? '', /Basic/);
  const allowed = await fetchWithUatAccess(base + path);
  assert.equal(allowed.status, 200, `Authorized UAT access: ${path}`);
  if (path === '/' || path === '/admin/') {
    const html = await allowed.text();
    const script = html.match(/<script[^>]+src="([^"]+)"/);
    assert.ok(script, `Built application script missing: ${path}`);
    const asset = await fetchWithUatAccess(new URL(script[1], base + path));
    assert.equal(asset.status, 200, `Built application script inaccessible: ${path}`);
    assert.match(asset.headers.get('content-type') ?? '', /javascript/);
  }
  console.log(`PASS password gate and authorized access ${path}`);
}
const session = await (await fetchWithUatAccess(base + '/api/dev-auth/session')).json();
assert.equal(session.isAuthenticated, false, 'Gateway password alone must not create an application login.');
console.log('PASS gateway authentication remains separate from application login');
