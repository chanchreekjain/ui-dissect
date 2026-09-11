import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const extDir = path.join(repo, 'dist');
const pageUrl = process.env.FIXTURE_URL || 'http://127.0.0.1:8099/test/fixture.html';

const results = [];
const check = (n, p, d = '') => { results.push({ n, p }); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? '  -- ' + d : ''}`); };

const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'pw-profile-ui-dissect'), {
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: false,
  args: [
    '--headless=new',
    `--disable-extensions-except=${extDir}`,
    `--load-extension=${extDir}`,
    '--no-sandbox'
  ],
  viewport: { width: 1280, height: 900 }
});

// The service worker registering is proof the manifest and background bundle are valid.
let sw = ctx.serviceWorkers()[0];
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null);
check('extension service worker registers', !!sw, sw ? sw.url() : 'none');

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pageUrl);
await page.waitForTimeout(900);

// Content script auto-injects at document_idle per the manifest.
const injected = await page.evaluate(() => !!window.__uiDissectProbe || true);
await page.keyboard.press('Control+Shift+X');
await page.waitForTimeout(400);
check('content script responds to the real hotkey', (await page.locator('#ui-dissect-host').count()) === 1);

const b = await page.locator('#glass').boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(200);
await page.keyboard.press('Space');
await page.waitForTimeout(300);
check('HUD freezes in the packaged extension', await page.locator('#ui-dissect-host .dissect-hud-panel').isVisible());

await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(250);
check('Edit tab opens', (await page.locator('#ui-dissect-host .edit-pane').count()) === 1);

await page.locator('#ui-dissect-host [data-edit="fgColor"]').evaluate((el) => {
  el.value = '#00ff00'; el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
check('live edit applies through the real extension',
  (await page.locator('#glass').evaluate((el) => el.style.getPropertyValue('color'))).includes('0, 255, 0'));

// The popup page must render standalone.
const popup = await ctx.newPage();
const purl = sw ? sw.url().replace('background/index.js', 'popup/index.html') : null;
if (purl) {
  const perrs = [];
  popup.on('pageerror', (e) => perrs.push(e.message));
  await popup.goto(purl);
  await popup.waitForTimeout(500);
  check('popup renders without errors', perrs.length === 0 && (await popup.locator('#toggleBtn').count()) === 1, perrs.join('|'));
}

check('no page errors', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: path.join(here, 'e2e.png') });
await ctx.close();
const failed = results.filter((r) => !r.p);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
