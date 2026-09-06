const { test, expect } = require('playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const data = JSON.parse(readFileSync(resolve(__dirname, '../content/minerva-codex.json'), 'utf8'));

test('pointer sequence is delayed, reverses smoothly, reveals and navigates', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#about');
  const seam = page.locator('[data-notice]');
  const trigger = seam.locator('button');
  const link = seam.locator('a');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const original = await page.locator('.author-quote').boundingBox();
  await trigger.hover();
  await page.waitForTimeout(400);
  await expect(link).toHaveAttribute('tabindex', '-1');
  expect(await seam.evaluate(el => Number(el.style.getPropertyValue('--density')))).toBeGreaterThan(0);
  expect(await seam.evaluate(el => Number(el.style.getPropertyValue('--rift-opacity')))).toBe(0);
  await page.waitForTimeout(1100);
  const opening = await seam.evaluate(el => Number(el.style.getPropertyValue('--rift-opacity')));
  expect(opening).toBeGreaterThan(0);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(100);
  const reversing = await seam.evaluate(el => Number(el.style.getPropertyValue('--rift-opacity')));
  expect(reversing).toBeLessThan(opening);
  await expect.poll(() => seam.evaluate(el => Number(el.style.getPropertyValue('--density')))).toBe(0);
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 4500 });
  await expect(link).toHaveAttribute('tabindex', '0');
  const current = await page.locator('.author-quote').boundingBox();
  expect(current.width).toBe(original.width);
  expect(current.height).toBe(original.height);
  await expect(page.locator('#layer-index a[href*="codex"], .depth-nav a[href*="codex"]')).toHaveCount(0);
  await link.click();
  await expect(page).toHaveURL(/\/observer\/codex\/$/);
  await expect(page.locator('.codex-entry')).toHaveCount(28);
  await page.goBack();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('a fully formed fissure reseals after leaving', async ({ page }) => {
  await page.goto('/#about');
  const trigger = page.locator('[data-notice] button');
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 4500 });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.locator('[data-notice]').evaluate(el => Number(el.style.getPropertyValue('--density'))), { timeout: 3500 }).toBe(0);
});

test('keyboard discovers the trigger and can dismiss or follow CODEX', async ({ page }) => {
  await page.goto('/#about');
  const trigger = page.locator('[data-notice] button');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (await trigger.evaluate(el => el === document.activeElement)) break;
  }
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 4500 });
  await page.keyboard.press('Tab');
  await expect(page.locator('#observer-codex-link')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 4500 });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/observer\/codex\/$/);
});

test('reduced motion reveals without displacement or animated rupture', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#about');
  const trigger = page.locator('[data-notice] button');
  await trigger.focus();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1500 });
  expect(await page.locator('.observer-notice__half, .observer-notice__half > span').evaluateAll(els => els.every(el => getComputedStyle(el).transform === 'none'))).toBe(true);
  await expect(page.locator('.observer-notice__rift')).toHaveCSS('visibility', 'hidden');
  await page.locator('#observer-codex-link').click();
  await expect(page).toHaveURL(/\/observer\/codex\/$/);
});

test('touch requires discovery then a second tap; a scroll does not activate it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#about');
  const trigger = page.locator('[data-notice] button');
  await trigger.scrollIntoViewIfNeeded();
  const bounds = await trigger.boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 18 }] });
    await page.waitForTimeout(30);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.tap();
  await expect(page).toHaveURL(/#about$/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 4500 });
  await page.locator('#observer-codex-link').tap();
  await expect(page).toHaveURL(/\/observer\/codex\/$/);
  await expect(page.locator('#codex-search')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('direct route, exact content, sorting, search, disclosure and entry links', async ({ page }) => {
  await page.goto('/observer/codex');
  await expect(page.locator('.codex-disclaimer')).toHaveText('Definitions represent common contemporary usage. Accuracy should not be inferred from consensus.');
  const terms = await page.locator('.codex-entry summary').allTextContents();
  expect(terms).toEqual(data.map(entry => entry.term).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', ignorePunctuation: true })));
  for (const entry of data) {
    const record = page.locator('#' + entry.id);
    if (Array.isArray(entry.definition)) expect(await record.locator('li').allTextContents()).toEqual(entry.definition);
    else await expect(record.locator('p').first()).toHaveText(entry.definition);
  }
  await expect(page.locator('#firmament .codex-entry__note')).toHaveText('Classification disputed.');
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('details[open]')).toHaveCount(28);
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('details[open]')).toHaveCount(0);
  const search = page.locator('#codex-search');
  await search.fill('  sOuL   tEtHeR  ');
  await expect(page.locator('.codex-entry:visible')).toHaveCount(1);
  await expect(page.locator('#soul-tether')).toHaveAttribute('open', '');
  await search.fill('Observer');
  await expect(page.locator('.codex-entry:visible')).toHaveCount(0);
  await expect(page.locator('[data-empty]')).toHaveText('NO RECORD FOUND.');
  await search.fill('no such term');
  await expect(page.locator('[data-empty]')).toHaveText('No matching records.');
  await page.getByRole('link', { name: 'Terms beginning with F', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('#letter-f')).toBeFocused();
  await page.goto('/observer/codex/#firmament');
  await expect(page.locator('#firmament')).toHaveAttribute('open', '');
  await expect(page.locator('#firmament summary')).toBeFocused();
  await page.locator('#firmament summary').press('Enter');
  await expect(page.locator('#firmament')).not.toHaveAttribute('open', '');
});

test('all definitions remain readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/observer/codex/');
  await expect(page.locator('details')).toHaveCount(28);
  await expect(page.locator('.codex-tools')).toBeHidden();
  await page.locator('#firmament summary').click();
  await expect(page.locator('#firmament li')).toHaveCount(3);
  await expect(page.locator('#firmament .codex-entry__note')).toBeVisible();
  await context.close();
});

test('glossary fits narrow screens and enlarged text', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/observer/codex/#universal-basic-income');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#universal-basic-income p')).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
