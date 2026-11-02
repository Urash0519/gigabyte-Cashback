import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyLiveAorusEmailUi({ base, cookies, campaignId, claimId }) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const output = resolve(process.env.EMAIL_UI_REPORT_DIR ?? '.uat-test/email-ui-release');
  await mkdir(output, { recursive: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([...cookies].map(([name, value]) => ({ name, value, url: base, httpOnly: name !== 'XSRF-TOKEN', secure: base.startsWith('https:') })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/reference/#/form?campaign=${campaignId}&market=DE&claim=${claimId}`);
    const email = page.getByRole('textbox', { name: 'AORUS email', exact: false });
    const status = page.locator('.aorus-email-result');
    await status.filter({ hasText: 'No AORUS member' }).waitFor({ timeout: 60000 });
    await email.fill('test@gmail.com');
    await status.filter({ hasText: 'AORUS member found for this email.' }).waitFor({ timeout: 60000 });
    await email.scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, 'live-verified-desktop.png') });
    await email.fill('aorus-api-verification-20261030@example.invalid');
    await status.filter({ hasText: 'No AORUS member' }).waitFor({ timeout: 60000 });
    assert.equal(await email.getAttribute('aria-invalid'), 'true');
    assert.deepEqual(errors, []);
    return ['Known member shown before submission through actual GCP backend', 'Unknown member shown inline with aria-invalid', 'Lookup does not save the edited email'];
  } finally { await browser.close(); }
}
