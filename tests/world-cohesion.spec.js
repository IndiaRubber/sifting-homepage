const { test, expect } = require('playwright/test');

test('signal disturbance recovers and returns intact after leaving its layer', async ({ page }) => {
  await page.goto('/');
  const signal = page.locator('#signal [data-dream-signal]');
  const semantic = signal.locator('.dream-semantic');
  await signal.hover();
  await expect(signal).toHaveAttribute('data-dream-disintegrating', 'true');
  await page.waitForTimeout(500);
  const displaced = await signal.locator('.dream-letter').evaluateAll(letters => letters.some(el => parseFloat(el.style.opacity) < .95));
  expect(displaced).toBe(true);
  await page.mouse.move(30, 100);
  await page.waitForTimeout(150);
  // Recovery retains visible displacement instead of snapping back on leave.
  expect(await signal.locator('.dream-letter').evaluateAll(letters => letters.some(el => parseFloat(el.style.opacity) < .98))).toBe(true);
  await expect(signal).toHaveAttribute('data-dream-disintegrating', 'false', { timeout: 4500 });
  await expect(semantic).toHaveText('THIS IS NOT A DREAM');
  await page.getByRole('link', { name: 'Layer 2: The author', exact: true }).click();
  await expect(page).toHaveURL(/#about$/);
  await page.getByRole('link', { name: 'Layer 0: The surface', exact: true }).click();
  await expect(page).toHaveURL(/#signal$/);
  await expect(signal).toHaveAttribute('data-dream-paused', 'false');
  await expect(signal.locator('.dream-char__glyph--current')).toHaveText([...('THISISNOTADREAM')]);
});

test('menu reverses, restores focus, and supports keyboard layer navigation', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-index-toggle]');
  const menu = page.locator('#layer-index');
  await toggle.click();
  await page.waitForTimeout(90);
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await menu.getByRole('link', { name: '02 The author ↗', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(menu).toBeHidden();
  await toggle.press('Enter');
  await menu.getByRole('link', { name: '03 The machinery ↗', exact: true }).press('Enter');
  await expect(page.locator('#machines-title')).toBeFocused();
  await expect(page.locator('[data-layer]:not([inert])')).toHaveCount(1);
});

test('a reversed peel settles back before a subsequent drag opens the next layer', async ({ page }) => {
  await page.goto('/');
  const handle = page.locator('[data-peel]');
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 350, y, { steps: 16 });
  await page.waitForTimeout(200);
  await page.mouse.move(x - 20, y);
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/is-peeling/);
  await expect(page.locator('body')).toHaveAttribute('data-active-layer', '0');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 350, y, { steps: 16 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#minerva$/);
  await expect(page.locator('body')).not.toHaveClass(/is-peeling/);
});

test('book preview preserves excerpt clearance and closes without moving copy sideways', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#minerva');
  const cover = page.locator('[data-book-cover]');
  await cover.press('Enter');
  await expect(cover).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(500);
  await page.locator('[data-book-continue]').focus();
  const layout = await page.evaluate(() => {
    const content = document.querySelector('.minerva-content');
    const excerpt = document.querySelector('.minerva-book__excerpt').getBoundingClientRect();
    const container = content.getBoundingClientRect();
    const hinge = document.querySelector('[data-minerva-book]').getBoundingClientRect();
    return { scroll: content.scrollLeft, visible: excerpt.right <= container.right, clearHinge: excerpt.left >= hinge.left };
  });
  expect(layout).toEqual({ scroll: 0, visible: true, clearHinge: true });
  await page.keyboard.press('Escape');
  await expect(cover).toHaveAttribute('aria-expanded', 'false');
  await expect(cover).toBeFocused();
  expect(await page.locator('.minerva-content').evaluate(el => el.scrollLeft)).toBe(0);
});

test('Still the world follows routes and restores canonical text and usable controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-motion]').click();
  for (const route of ['/archive/', '/extensions/', '/#minerva']) {
    await page.goto(route);
    await expect(page.locator('body')).toHaveClass(/still/);
    await expect(page.locator('[data-motion]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-dream-signal]').first()).toHaveAttribute('data-dream-paused', 'true');
    expect(await page.locator('.dream-letter, .dream-headline__letter').evaluateAll(letters => letters.every(el => getComputedStyle(el).transform === 'none'))).toBe(true);
  }
  await page.locator('[data-book-cover]').press('Enter');
  await expect(page.locator('[data-book-continue]')).toHaveAttribute('tabindex', '0');
  await page.locator('[data-reading]').click();
  await expect(page.locator('[data-layer][inert]')).toHaveCount(0);
  await page.locator('[data-reading]').click();
  await expect(page.locator('[data-layer]:not([inert])')).toHaveCount(1);
});

test('system reduced motion disables Archive pulse and all decorative mutations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/archive/', '/extensions/']) {
    await page.goto(route);
    await expect(page.locator('[data-motion]')).toBeDisabled();
    await expect(page.locator('body')).toHaveClass(/still/);
    const animations = await page.locator('.dream-letter, .dream-headline__letter, .blink').evaluateAll(elements => elements.map(el => ({ transform: getComputedStyle(el).transform, animation: getComputedStyle(el).animationName })));
    expect(animations.every(style => style.transform === 'none' && style.animation === 'none')).toBe(true);
  }
});

test('touch layout keeps motion control reachable and vertical book reading uncaptured', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#minerva');
  await page.locator('[data-index-toggle]').click();
  await expect(page.locator('#layer-index [data-motion]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-dream-signal]').first()).toHaveAttribute('data-dream-paused', 'true');
  expect(await page.locator('[data-book-stage]').evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');
  await page.locator('[data-reading]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('http://127.0.0.1:4173/extensions/');
  await expect(page.getByRole('link', { name: 'Download package' })).toHaveAttribute('href', './downloads/chatflow-local-1.1.0.zip');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
