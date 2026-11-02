import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';

// Manual browser regression test against the production bundle. All API replies are isolated fixtures.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const dist = resolve('frontend/apps/public-web/dist');
const output = resolve(process.env.EMAIL_UI_REPORT_DIR ?? '.uat-test/email-ui');
await mkdir(output, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(dist, '.' + new URL(request.url, 'http://localhost').pathname);
    assert.ok(path === dist || path.startsWith(dist + sep));
    const asset = extname(path) ? path : resolve(dist, 'index.html');
    response.setHeader('Content-Type', mime[extname(asset)] ?? 'text/html');
    response.end(await readFile(asset));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const checks = [];
const errors = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const campaignId = '11111111-1111-1111-1111-111111111111';
  const claimId = '22222222-2222-2222-2222-222222222222';
  const config = { name: 'Email verification UI test', slug: 'email-ui-test', status: 'Active', market: 'DE', markets: ['DE'], languages: ['en', 'zh-TW'],
    currency: 'EUR', timeZone: 'Europe/Berlin', purchaseStart: '2026-01-01T00:00:00Z', purchaseEnd: '2027-01-01T00:00:00Z', claimStart: '2026-01-01T00:00:00Z', claimEnd: '2027-02-01T00:00:00Z',
    waitingDays: 0, maxClaimsPerPerson: 1, maxItemsPerCategory: 1, acceptingClaims: true, termsVersion: 'test', terms: 'Test', privacy: 'Test', products: [], retailers: [], legacyFields: {}, description: '', bannerUrl: '', faq: '', supportEmail: '' };
  const campaign = { id: campaignId, data: config, publishedVersion: 1, versions: [], reservedMinor: 0, approvedMinor: 0, paidMinor: 0, availableMinor: 1000 };
  const claim = { id: claimId, campaignVersionId: 'v1', reference: 'EMAIL-UI-TEST', reviewStatus: 'Draft', paymentStatus: 'None', amountMinor: 0, currency: 'EUR', history: [], revisions: [],
    data: { campaignId, market: 'DE', email: '', confirmEmail: '', firstName: 'Synthetic', lastName: 'Test', title: 'Mx', phone: '+49000000000', address1: 'Test address', address2: '', city: 'Berlin', state: '', postcode: '10115', residenceCountry: 'DE', purchaseCountry: 'DE', bankCountry: 'DE', language: 'en',
      purchaseDate: '2026-11-01T00:00:00Z', purchaseAmountMinor: 0, invoiceNumber: '', retailerId: '', bank: { accountHolderProfileType: 'Individual', accountHolder: '', bankName: '', iban: '', bic: '', accountNumber: '', sortCode: '' }, items: [], attachments: [], termsAccepted: false, privacyAccepted: false, marketingAccepted: false, legacyFields: {} } };
  const requests = [];
  let saveCalls = 0;
  let recover = false;
  let releaseOld;
  const oldGate = new Promise(done => { releaseOld = done; });
  let releaseFirstKnown;
  const firstKnownGate = new Promise(done => { releaseFirstKnown = done; });
  let firstKnown = true;
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path.endsWith('/verify-email')) {
      const email = route.request().postDataJSON().email;
      requests.push(email);
      if (email === 'slow@example.invalid') await oldGate;
      if (email === 'error@example.invalid' && !recover) {
        await route.fulfill({ status: 503, json: { error: { message: 'Provider unavailable' } } }); return;
      }
      if (email === 'test@gmail.com' && firstKnown) { firstKnown = false; await firstKnownGate; }
      body = { email, isMember: email === 'disabled@example.invalid' ? null : email === 'test@gmail.com' || (email === 'error@example.invalid' && recover) };
    } else if (path.endsWith('/session')) body = { isAuthenticated: true, email: 'synthetic@example.invalid', developmentLoginEnabled: true };
    else if (path.endsWith('/version-check')) body = { needsUpdate: false, currentVersion: 1, latestVersion: 1, campaign };
    else if (path.endsWith('/campaigns')) body = [campaign];
    else if (path.endsWith('/claims')) body = [claim];
    else if (path.endsWith('/campaign')) body = campaign;
    else if (path.endsWith('/save')) { saveCalls++; claim.data = route.request().postDataJSON(); body = claim; }
    else throw new Error(`Unexpected API call: ${path}`);
    try { await route.fulfill({ json: body }); } catch (error) { if (path.endsWith('/verify-email')) return; throw error; }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/reference/#/form?campaign=${campaignId}&market=DE&claim=${claimId}`);
  const email = page.getByRole('textbox', { name: 'AORUS email', exact: false });
  const confirm = page.getByRole('textbox', { name: 'Confirm email', exact: false });
  const status = page.locator('.aorus-email-result');
  const waitText = text => status.filter({ hasText: text }).waitFor();
  const pass = text => { checks.push(text); console.log(`PASS ${text}`); };
  await email.fill('test@gmail.com');
  await waitText('Checking AORUS membership');
  await confirm.focus();
  releaseFirstKnown();
  await waitText('AORUS member found');
  assert.equal(await status.evaluate(element => getComputedStyle(element).color), 'rgb(142, 229, 171)');
  assert.equal(requests.filter(e => e === 'test@gmail.com').length, 1);
  pass('Debounced input and blur share one request, with checking and success feedback');
  await email.fill('missing@example.invalid');
  assert.equal(await status.textContent(), 'Your email will be checked for AORUS membership automatically.');
  await confirm.fill('missing@example.invalid');
  await waitText('No AORUS member');
  assert.equal(await email.getAttribute('aria-invalid'), 'true');
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await page.locator('.form-error-notice').filter({ hasText: 'No AORUS member' }).waitFor();
  assert.equal(saveCalls, 0);
  pass('Changed email clears old success; unknown member blocks continuing without saving');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.locator('.message').filter({ hasText: 'Draft saved.' }).waitFor();
  assert.equal(saveCalls, 1);
  pass('Draft saving remains available when the member is not found');
  await email.fill('slow@example.invalid');
  await waitText('Checking AORUS membership');
  await email.fill('test@gmail.com');
  await waitText('AORUS member found');
  releaseOld();
  await page.waitForTimeout(300);
  assert.match(await status.textContent(), /AORUS member found/);
  pass('An older delayed lookup cannot overwrite the latest email result');
  await email.fill('error@example.invalid');
  await waitText('temporarily unavailable');
  recover = true;
  await page.getByRole('button', { name: 'Check membership again' }).click();
  await waitText('AORUS member found');
  pass('Provider outage shows a recoverable error and retry succeeds');
  await email.fill('invalid'); await confirm.focus();
  await waitText('Enter a valid email');
  assert.ok(!requests.includes('invalid'));
  await email.fill('');
  assert.ok(!(await status.textContent()).includes('member found'));
  pass('Invalid or cleared email never shows an old success or calls the provider');
  await email.fill('test@gmail.com'); await confirm.fill('test@gmail.com');
  await waitText('AORUS member found');
  await page.screenshot({ path: resolve(output, 'verified-desktop.png') });
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Payment profile', exact: true }).waitFor();
  await page.locator('.claim-step-list button').first().click();
  await waitText('AORUS member found');
  pass('Verified applicant can continue and the result survives wizard navigation');
  await page.setViewportSize({ width: 375, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: resolve(output, 'verified-mobile.png'), fullPage: true });
  pass('Email feedback fits the mobile layout');
  await context.addInitScript(() => localStorage.setItem('cashback.public.locale', 'zh-TW'));
  const chinese = await context.newPage();
  await chinese.goto(`${base}/reference/#/form?campaign=${campaignId}&market=DE&claim=${claimId}`);
  await chinese.locator('.aorus-email-result').filter({ hasText: '已查到此電子郵件的 AORUS 會員' }).waitFor();
  pass('Traditional Chinese membership feedback is translated');
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'ui-verification.json'), JSON.stringify({ verified_at: new Date().toISOString(), checks, passed: true, mode: 'production bundle with isolated API fixtures', browser: 'Chromium', viewport_checks: [1440, 375] }, null, 2) + '\n');
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
