import assert from 'node:assert/strict';
import { fetchWithUatAccess } from './uat-fetch.mjs';

// Separate instances keep consumer/admin authorization tests independent.
export function campaignSession(base = process.env.CASHBACK_API_URL ?? 'http://localhost:44305') {
  const jar = new Map();
  async function request(path, body, expected = 200) {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
    };
    if (jar.has('XSRF-TOKEN')) headers.RequestVerificationToken = decodeURIComponent(jar.get('XSRF-TOKEN'));
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetchWithUatAccess(base + path, {
      method: body === undefined ? 'GET' : 'POST', headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0];
      const at = pair.indexOf('=');
      jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
    const raw = await response.text();
    assert.equal(response.status, expected, `${path}: ${response.status} ${raw.slice(0, 1000)}`);
    try { return JSON.parse(raw); } catch { return raw; }
  }
  async function login(area) {
    await request('/api/dev-auth/session');
    await request('/api/dev-auth/login', { area });
    return request('/api/dev-auth/session');
  }
  return { request, login };
}
