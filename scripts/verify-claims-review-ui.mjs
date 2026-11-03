import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';

// Production-bundle browser tests with isolated API fixtures; creates no UAT data.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const dist = resolve('frontend/apps/admin-web/dist');
const output = resolve(process.env.CLAIMS_UI_REPORT_DIR ?? '.uat-test/claims-review-ui');
await mkdir(output, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(dist, '.' + new URL(request.url, 'http://localhost').pathname);
    assert.ok(path === dist || path.startsWith(dist + sep));
    response.setHeader('Content-Type', mime[extname(path)] ?? 'text/html');
    response.end(await readFile(extname(path) ? path : resolve(dist, 'index.html')));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const campaignId = '11111111-1111-1111-1111-111111111111';
const firstId = '22222222-2222-2222-2222-222222222222';
const secondId = '33333333-3333-3333-3333-333333333333';
const longName = 'AORUS-Returned-Name-' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(5);
const campaign = { id: campaignId, publishedVersion: 1, versions: [], reservedMinor: 2000, approvedMinor: 0, paidMinor: 0, availableMinor: 8000,
  data: { name: 'Review UI fixture', slug: 'review-ui-fixture', type: 'Cashback', status: 'Active', market: 'DE', markets: ['DE'], languages: ['en'], currency: 'EUR',
    budgetMinor: 10000, bufferMinor: 0, products: [], retailers: [], timeZone: 'Europe/Berlin', purchaseStart: '2026-01-01T00:00:00Z', purchaseEnd: '2027-01-01T00:00:00Z',
    claimStart: '2026-01-01T00:00:00Z', claimEnd: '2027-02-01T00:00:00Z', legacyFields: {}, description: '', bannerUrl: '', terms: 'Test', privacy: 'Test', faq: '', supportEmail: '' } };
const claims = [firstId, secondId].map((id, index) => ({ id, reference: 'GB-' + (index ? 'ABCDEF0123456789' : '3CC46D1843384C1C').repeat(2),
  campaignVersionId: null, reviewStatus: 'Submitted', paymentStatus: 'None', amountMinor: 1000, currency: 'EUR', revisions: [], onHold: false,
  createdAt: '2026-11-03T00:00:00Z', submittedAt: '2026-11-03T01:00:00Z',
  history: [{ id: `event-${index}`, action: 'Submitted', createdAt: '2026-11-03T01:00:00Z', actor: 'reviewer@example.test', reason: 'Synthetic UI fixture' }],
  data: { campaignId, email: index ? 'second@example.test' : 'first@example.test', title: 'Mx', firstName: 'Synthetic', lastName: 'Test', phone: '+4900000000',
    address1: 'Long synthetic address '.repeat(6), address2: '', city: 'Berlin', state: '', postcode: '10115', residenceCountry: 'DE', purchaseCountry: 'DE', bankCountry: 'DE',
    language: 'en', invoiceNumber: 'INVOICE-UI-TEST', purchaseDate: '2026-11-01T00:00:00Z', purchaseAmountMinor: 90000, retailerId: 'shop', termsAccepted: true, privacyAccepted: true,
    marketingAccepted: false, attachments: [], items: [], legacyFields: {}, bank: { accountHolder: 'Synthetic Test', iban: '********0000', accountNumber: '', sortCode: '', bic: '', bankName: '' } } }));
const checks = [], errors = [];
let browser;
const pass = text => { checks.push(text); console.log(`PASS ${text}`); };
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  async function fixture(width, reference = false, initialMode = 'found') {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('cashback.admin.locale', 'en'));
    const state = { mode: initialMode, calls: 0, releases: [] };
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body;
      if (path.endsWith('/aorus-member')) {
        state.calls++;
        const first = path.includes(firstId);
        const mode = state.mode;
        if (mode === 'slow' && first) await new Promise(done => { state.releases.push(done); });
        if (mode === 'error') { await route.fulfill({ status: 403, json: { error: { message: 'AORUS membership verification is temporarily unavailable. Please try again later.' } } }); return; }
        body = { email: first ? 'first@example.test' : 'second@example.test', isMember: mode === 'disabled' ? null : mode !== 'missing',
          name: ['disabled', 'missing', 'nameless'].includes(mode) ? null : first ? longName : 'Second member name', checkedAt: mode === 'disabled' ? null : '2026-11-03T02:00:00Z' };
      } else if (path.endsWith('/session')) body = { isAuthenticated: true, email: 'reviewer@example.test', area: 'admin', development: true };
      else if (path.endsWith('/campaigns')) body = [campaign];
      else if (path.endsWith('/claims')) body = claims;
      else if (path.endsWith('/payments') || path.endsWith('/audit')) body = [];
      else if (path.endsWith('/reports')) body = { rows: [], generatedAt: '2026-11-03T00:00:00Z', timeZone: 'UTC', dateBasis: 'SubmittedAt' };
      else throw new Error(`Unexpected API mutation or request: ${route.request().method()} ${path}`);
      try { await route.fulfill({ json: body }); } catch (error) { if (!path.endsWith('/aorus-member')) throw error; }
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/admin/${reference ? 'reference/' : ''}`);
    if (reference) {
      await page.getByRole('button', { name: campaign.data.name, exact: true }).click();
      const detailed = page.getByRole('button', { name: /Detailed/, exact: false });
      if (!(await detailed.isVisible())) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await detailed.click();
      await page.locator('.ra-detail-tabs').getByRole('button', { name: 'Review cases', exact: true }).click();
    } else await page.getByRole('button', { name: 'Claims', exact: true }).click();
    return { context, page, state, open: id => page.getByRole('button', { name: claims.find(c => c.id === id).reference, exact: true }).click() };
  }
  async function noOverflow(page) {
    const result = await page.evaluate(() => {
      const name = document.querySelector('.aorus-member-name');
      const reference = document.querySelector('.claim-reference');
      const card = reference.closest('.metric').getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(reference);
      return { viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth,
        referenceFits: [...range.getClientRects()].every(rect => rect.left >= card.left && rect.right <= card.right + 1 && rect.bottom <= card.bottom + 1),
        memberNameFits: name.scrollWidth <= name.clientWidth + 1 };
    });
    assert.ok(result.page <= result.viewport + 1, JSON.stringify(result));
    assert.ok(result.referenceFits, JSON.stringify(result));
    assert.ok(result.memberNameFits, JSON.stringify(result));
    assert.equal(await page.locator('.review-check input:checked').count(), 0);
  }
  for (const reference of [false, true]) for (const width of [1920, 1440, 768, 375]) {
    const f = await fixture(width, reference);
    await f.open(firstId);
    await f.page.locator('.aorus-member-name').filter({ hasText: longName }).waitFor();
    await noOverflow(f.page);
    await f.page.screenshot({ path: resolve(output, `${reference ? 'reference' : 'original'}-${width}.png`), fullPage: true });
    if (width === 1920) {
      await f.page.screenshot({ path: resolve(output, `${reference ? 'reference' : 'original'}-first-screen.png`) });
      await f.page.locator('.aorus-member-reference').scrollIntoViewIfNeeded();
      await f.page.screenshot({ path: resolve(output, `${reference ? 'reference' : 'original'}-member-reference.png`) });
    }
    pass(`${reference ? 'Reference' : 'Original'} review ${width}px: long reference/name stay inside cards, no page overflow or automatic review checks`);
    await f.context.close();
  }
  for (const [mode, expected] of [['missing', 'No AORUS member found'], ['disabled', 'AORUS lookup is not enabled'], ['nameless', 'Name not returned']]) {
    const f = await fixture(1440, false, mode); await f.open(firstId);
    await f.page.locator('.aorus-member-reference').getByText(expected, { exact: true }).waitFor();
    assert.ok(!(await f.page.locator('.aorus-member-name').textContent()).includes(longName));
    pass(`${mode}: missing/unverified information is shown clearly without an old name`); await f.context.close();
  }
  {
    const f = await fixture(1440, false, 'error'); await f.open(firstId);
    await f.page.locator('.aorus-member-reference [role=alert]').waitFor(); f.state.mode = 'found';
    await f.page.getByRole('button', { name: 'Refresh member details' }).click();
    await f.page.locator('.aorus-member-name').filter({ hasText: longName }).waitFor();
    const before = f.state.calls;
    await f.page.getByLabel('Interface language').selectOption('zh-TW');
    await f.page.getByRole('heading', { name: 'AORUS 會員參考資料' }).waitFor();
    assert.equal(f.state.calls, before);
    pass('Provider error supports retry; Chinese labels preserve the returned name without another lookup'); await f.context.close();
  }
  {
    const f = await fixture(1440, false, 'slow'); await f.open(firstId);
    await f.page.locator('.aorus-member-reference [role=status]').waitFor();
    const deadline = Date.now() + 5000;
    while (!f.state.releases.length && Date.now() < deadline) await new Promise(done => setTimeout(done, 10));
    assert.ok(f.state.releases.length, 'Delayed member lookup should start');
    await f.page.getByRole('button', { name: 'Back to claims' }).click(); f.state.mode = 'found'; await f.open(secondId);
    await f.page.locator('.aorus-member-name').filter({ hasText: 'Second member name' }).waitFor();
    f.state.releases.forEach(release => release()); await f.page.waitForTimeout(80);
    assert.equal(await f.page.locator('.aorus-member-name').textContent(), 'Second member name');
    pass('Switching claims aborts/ignores the previous lookup and prevents stale member names'); await f.context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ passed: true, checks, console_errors: errors, uat_claims_created: 0 }, null, 2) + '\n');
} finally {
  await browser?.close(); await new Promise(done => server.close(done));
}
