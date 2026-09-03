const { test, expect } = require('playwright/test');

test('accepts typed and toggled answers', async ({ page }) => {
  await page.goto('file:///home/exsifting/Work/sifting-homepage/games/binary/index.html');
  await page.getByRole('button', { name: 'Begin drill' }).click();

  const first = page.locator('.challenge-row.current');
  const bits = await first.locator('.bit').allTextContents();
  const decimal = bits.reduce((total, bit, index) => total + Number(bit) * (128 >> index), 0);
  await first.locator('input.decimal').fill(String(decimal));
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('#cleared')).toHaveText('01');

  const second = page.locator('.challenge-row.current');
  const target = Number(await second.locator('.decimal.target').textContent());
  for (let index = 0; index < 8; index++) {
    if ((target >> (7 - index)) & 1) await second.locator('.bit').nth(index).click();
  }
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('#cleared')).toHaveText('02');
  await expect(page.locator('#score')).not.toHaveText('000000');
});
