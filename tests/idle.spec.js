import { test, expect } from '@playwright/test';

test('idle composer and keyboard permission selection', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  const send = page.getByRole('button', { name: 'Send instruction' });
  const input = page.getByRole('textbox', { name: 'Instruction for your agents' });
  const selector = page.getByRole('button', { name: 'Ask for approval', exact: false });
  await expect(send).toBeDisabled();
  await input.fill('   ');
  await expect(send).toBeDisabled();
  await input.fill('Find a thoughtful gift');
  await expect(send).toBeEnabled();
  await send.click();
  await expect(input).toHaveValue('Find a thoughtful gift');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await selector.click();
  await expect(page.getByRole('menuitemradio')).toHaveCount(2);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const full = page.getByRole('button', { name: 'Full access', exact: false });
  await expect(full).toBeFocused();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await full.click();
  await page.keyboard.press('Escape');
  await expect(full).toBeFocused();
  await full.click();
  await page.getByRole('menuitemradio', { name: /Ask for approval/ }).click();
  await expect(selector).toBeVisible();
  await selector.click();
  await input.click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await input.fill('');
  await expect(send).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/GPT|Medium|dashboard|Flash|Terra|Luna/);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [390, 844], [320, 640]]) {
  test(`layout ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual({ width, height });
    await expect(page.getByRole('textbox')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Send instruction' })).toBeInViewport();
    const nodes = await page.locator('.agent-orb').all();
    const left = await nodes[0].boundingBox();
    const right = await nodes[1].boundingBox();
    expect(left.x + left.width).toBeLessThan(right.x);
    expect(left.y).toBe(right.y);
    await page.screenshot({ path: `test-results/idle-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: /Ask for approval/ }).click();
    await expect(page.getByRole('menu')).toBeInViewport();
    await page.screenshot({ path: `test-results/permissions-${width}.png`, animations: 'disabled' });
  });
}

test('reduced motion disables ambient animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('.thread-presence').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.orb-light').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
