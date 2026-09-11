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

await page.addInitScript(() => {
  window.chrome = {
    runtime: {
      sendMessage: () => Promise.resolve({}),
      onMessage: { addListener: () => {} }
    }
  };
});

await page.goto(fixtureUrl);
await page.addScriptTag({ content: bundle, type: 'module' });
await page.waitForTimeout(150);

// Activate the inspector
await page.keyboard.press('Control+Shift+X');
await page.waitForTimeout(120);
check('inspector host mounts', await page.locator('#ui-dissect-host').count() === 1);

// Hover the glass card, then freeze
const box = await page.locator('#glass').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(120);
await page.keyboard.press('Space');
await page.waitForTimeout(200);

const panel = page.locator('#ui-dissect-host .dissect-hud-panel');
check('HUD panel visible when frozen', await panel.isVisible());

// Open the Edit tab
await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(150);
check('edit pane renders', await page.locator('#ui-dissect-host .edit-pane').count() === 1);
check('contrast card renders', await page.locator('#ui-dissect-host .contrast-card').count() === 1);

const ratioBefore = (await page.locator('#ui-dissect-host .contrast-ratio').textContent().catch(() => '')) || '';
check('contrast ratio shown', /^\d+\.\d+:1$/.test(ratioBefore.trim()), ratioBefore.trim());

// Record original inline style, then drive the text-colour picker
const beforeStyle = await page.locator('#glass').getAttribute('style');
await page.locator('#ui-dissect-host [data-edit="fgColor"]').evaluate((el) => {
  el.value = '#ff0000';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(120);
const afterColor = await page.locator('#glass').evaluate((el) => el.style.getPropertyValue('color'));
const afterPriority = await page.locator('#glass').evaluate((el) => el.style.getPropertyPriority('color'));
check('text colour applied live', afterColor.includes('255, 0, 0'), afterColor);
check('applied with !important', afterPriority === 'important', afterPriority);

const ratioAfter = (await page.locator('#ui-dissect-host .contrast-ratio').textContent().catch(() => '')) || '';
check('contrast recalculates', ratioAfter.trim() !== ratioBefore.trim(), `${ratioBefore.trim()} -> ${ratioAfter.trim()}`);

// Background colour + alpha
await page.locator('#ui-dissect-host [data-edit="bgColor"]').evaluate((el) => {
  el.value = '#112233';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(100);
const bgApplied = await page.locator('#glass').evaluate((el) => el.style.getPropertyValue('background-color'));
check('background colour applied', bgApplied.includes('17, 34, 51'), bgApplied);

// Radius slider
await page.locator('#ui-dissect-host [data-edit="radius"]').evaluate((el) => {
  el.value = '40';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(100);
const radiusApplied = await page.locator('#glass').evaluate((el) => el.style.getPropertyValue('border-radius'));
check('radius applied', radiusApplied === '40px', radiusApplied);

// Keyboard must not leak to the inspector while a slider has focus
await page.locator('#ui-dissect-host [data-edit="radius"]').evaluate((el) => el.focus());
await page.keyboard.press('Space');
await page.waitForTimeout(150);
check('Space does not unfreeze while a control is focused', await panel.isVisible());

// Generated CSS must reflect the edits
await page.locator('#ui-dissect-host .hud-tab[data-fmt="css"]').click();
await page.waitForTimeout(200);
const css = (await page.locator('#ui-dissect-host .hud-code-box').textContent()) || '';
check('edited colour in generated CSS', /rgb\(255,\s*0,\s*0\)/.test(css), css.split('\n').find((l) => l.includes('color:')) || '');
check('edited radius in generated CSS', /border-radius:\s*40px/.test(css), css.split('\n').find((l) => l.includes('radius')) || '');

// Reset restores the element exactly
await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(150);
await page.locator('#ui-dissect-host #editReset').click();
await page.waitForTimeout(200);
const afterReset = await page.locator('#glass').getAttribute('style');
check('reset restores original inline style exactly', afterReset === beforeStyle, `${JSON.stringify(afterReset)} vs ${JSON.stringify(beforeStyle)}`);

// Low-contrast element should fail AA
await page.keyboard.press('Space');
await page.waitForTimeout(100);
const lowBox = await page.locator('#low').boundingBox();
await page.mouse.move(lowBox.x + lowBox.width / 2, lowBox.y + lowBox.height / 2);
await page.waitForTimeout(150);
await page.keyboard.press('Space');
await page.waitForTimeout(200);
await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(150);
const lowRatio = (await page.locator('#ui-dissect-host .contrast-ratio').textContent()) || '';
const aaClass = await page.locator('#ui-dissect-host .cbadge').first().getAttribute('class');
check('low-contrast element fails AA', aaClass.includes('no'), `ratio ${lowRatio.trim()}`);
check('grey-on-white ratio matches WCAG maths (1.92:1)', Math.abs(parseFloat(lowRatio) - 1.92) < 0.01, lowRatio.trim());

await page.screenshot({ path: path.join(here, 'edit-pane.png') });

// Gradient element must say so rather than invent a number
await page.keyboard.press('Space');
await page.waitForTimeout(100);
const gBox = await page.locator('#grad').boundingBox();
await page.mouse.move(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
await page.waitForTimeout(150);
await page.keyboard.press('Space');
await page.waitForTimeout(200);
await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(150);
const naCount = await page.locator('#ui-dissect-host .contrast-na').count();
check('gradient background reports not-measurable', naCount === 1);

// Regression: a translucent card over a gradient that has an opaque colour beneath it.
// This used to resolve to "assumes white page behind", inverting the verdict on dark pages.
await page.keyboard.press('Space');
await page.waitForTimeout(100);
const tBox = await page.locator('#translucent').boundingBox();
await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
await page.waitForTimeout(150);
await page.keyboard.press('Space');
await page.waitForTimeout(200);
await page.locator('#ui-dissect-host .hud-tab.edit-tab').click();
await page.waitForTimeout(150);
const tNote = (await page.locator('#ui-dissect-host .contrast-sub').textContent()) || '';
const tRatio = parseFloat((await page.locator('#ui-dissect-host .contrast-ratio').textContent()) || '0');
check('translucent-over-gradient does not assume a white page', !/assumes white/.test(tNote), tNote);
check('translucent-over-gradient is marked approximate', /gradient behind/.test(tNote), tNote);
check('ratio resolves against the dark colour beneath the gradient', tRatio > 7, `${tRatio}:1`);

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.waitForTimeout(200);
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
