import { chromium } from 'playwright';
import fs from 'node:fs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const bundle = fs.readFileSync(path.join(repo, 'dist/content/index.js'), 'utf8');
const fixtureUrl = 'file://' + path.join(here, 'fixture.html');
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.addInitScript(() => {
  window.chrome = {
    runtime: { sendMessage: () => Promise.resolve({}), onMessage: { addListener: () => {} } }
  };
});
await page.goto(fixtureUrl);
await page.addScriptTag({ content: bundle, type: 'module' });
await page.waitForTimeout(150);
await page.keyboard.press('Control+Shift+X');
await page.waitForTimeout(120);

const drive = async (name, value) => {
  await page.locator(`#ui-dissect-host [data-edit="${name}"]`).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(80);
};

const freezeOn = async (sel) => {
  if (await page.locator('#ui-dissect-host .dissect-hud-panel').isVisible()) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
  }
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(140);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
  await page.waitForTimeout(150);
};

const styleOf = (sel, prop) =>
  page.locator(sel).evaluate((el, p) => el.style.getPropertyValue(p), prop);

// ---- glass card: alpha, border, shadow, font size
await freezeOn('#glass');

await drive('bgAlpha', '100');
check('background alpha slider applies', (await styleOf('#glass', 'background-color')).startsWith('rgb('),
  await styleOf('#glass', 'background-color'));

await drive('bgAlpha', '30');
check('alpha 30% produces rgba', (await styleOf('#glass', 'background-color')).includes('0.3'),
  await styleOf('#glass', 'background-color'));

await drive('borderWidth', '5');
check('border width applies', (await styleOf('#glass', 'border-width')) === '5px', await styleOf('#glass', 'border-width'));
check('border style forced solid', (await styleOf('#glass', 'border-style')) === 'solid', await styleOf('#glass', 'border-style'));

await drive('borderWidth', '0');
check('border width 0 removes the border', (await styleOf('#glass', 'border-style')) === 'none', await styleOf('#glass', 'border-style'));

await drive('shadowBlur', '60');
await drive('shadowAlpha', '80');
const shadow = await styleOf('#glass', 'box-shadow');
check('shadow blur + opacity applies', /60px/.test(shadow) && /0\.8/.test(shadow), shadow);

await drive('shadowBlur', '0');
await drive('shadowAlpha', '0');
check('shadow zeroed becomes none', (await styleOf('#glass', 'box-shadow')) === 'none', await styleOf('#glass', 'box-shadow'));

await drive('fontSize', '28');
check('font size applies', (await styleOf('#glass', 'font-size')) === '28px', await styleOf('#glass', 'font-size'));

// ---- other tabs still generate
await page.locator('#ui-dissect-host .hud-tab[data-fmt="react"]').click();
await page.waitForTimeout(200);
const react = (await page.locator('#ui-dissect-host .hud-code-box').textContent()) || '';
check('React tab renders a component', /export const \w+: React\.FC/.test(react));
check('React output keeps ${className} literal', react.includes('${className}'),
  (react.split('\n').find((l) => l.includes('className={')) || '').trim());
check('React tab is not the error fallback', !react.includes('React Component\n'));

await page.locator('#ui-dissect-host .hud-tab[data-fmt="tailwind"]').click();
await page.waitForTimeout(200);
const tw = (await page.locator('#ui-dissect-host .hud-code-box').textContent()) || '';
check('Tailwind tab non-empty', tw.trim().length > 0 && !tw.startsWith('/*'), tw.slice(0, 60));

// ---- gradient element: colour edit must clear the gradient to be visible
await freezeOn('#grad');
check('gradient starts with a background-image',
  (await page.locator('#grad').evaluate((el) => getComputedStyle(el).backgroundImage)).includes('gradient'));
await drive('bgColor', '#00ff00');
check('gradient cleared so the colour edit is visible',
  (await styleOf('#grad', 'background-image')) === 'none', await styleOf('#grad', 'background-image'));
check('gradient element now measures contrast',
  (await page.locator('#ui-dissect-host .contrast-ratio').count()) === 1);

// ---- reset all, across both edited elements
const resetAll = page.locator('#ui-dissect-host #editResetAll');
check('Reset all is enabled with 2 edited elements', !(await resetAll.isDisabled()),
  (await resetAll.textContent()) || '');
await resetAll.click();
await page.waitForTimeout(250);
check('reset all clears the gradient element', (await page.locator('#grad').getAttribute('style')) === null);
check('reset all clears the glass element', (await page.locator('#glass').getAttribute('style')) === null);
check('computed gradient is restored',
  (await page.locator('#grad').evaluate((el) => getComputedStyle(el).backgroundImage)).includes('gradient'));

await page.waitForTimeout(200);
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
