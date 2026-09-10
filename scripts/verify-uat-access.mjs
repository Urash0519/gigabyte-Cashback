import assert from 'node:assert/strict';
const base = process.env.CASHBACK_API_URL;
assert.ok(base, 'Supply the UAT URL.');
// Deliberately send neither Authorization nor cookies: verify genuinely open UAT access.
for (const path of ['/', '/admin/', '/health', '/api/dev-auth/session', '/api/operations/campaigns']) {
  const response = await fetch(base + path, { redirect: 'error' });
  assert.equal(response.status, 200, `Anonymous UAT entry: ${path}`);
  assert.equal(response.headers.get('www-authenticate'), null, `Unexpected password challenge: ${path}`);
  if (path === '/' || path === '/admin/') {
    const html = await response.text();
    const script = html.match(/<script[^>]+src="([^"]+)"/);
    assert.ok(script, `Built application script missing: ${path}`);
    const asset = await fetch(new URL(script[1], base + path), { redirect: 'error' });
    assert.equal(asset.status, 200, `Built script inaccessible: ${path}`);
    assert.match(asset.headers.get('content-type') ?? '', /javascript/);
  }
  console.log(`PASS anonymous entry without password ${path}`);
}
const session = await (await fetch(base + '/api/dev-auth/session')).json();
assert.equal(session.isAuthenticated, false, 'Opening the site should retain the explicit development-login button.');
const admin = await fetch(base + '/api/operations/campaigns?admin=true');
assert.ok([401, 403].includes(admin.status), 'Admin operations still require the development session.');
console.log('PASS development session remains required for administration');
