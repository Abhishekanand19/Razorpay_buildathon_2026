import { test, expect } from '@playwright/test';
import { persona1, calculateOrder, matchesPersona1, canAcceptOffer } from '../src/scenarios/persona1.js';
import { scenes, flowReducer, initialFlow } from '../src/scenarios/flowMachine.js';

test('scenario economics and input boundaries', () => {
  const order = calculateOrder(persona1);
  expect(persona1.products.map(product => product.price)).toEqual([387, 332, 300]);
  expect(order.selected.id).toBe('dot-key');
  expect(order.headroom).toBe(113);
  expect(order.initialShipping).toBe(59);
  expect(persona1.shippingRules.freeDeliveryThreshold).toBe(449);
  expect(order.initialTotal).toBe(446);
  expect(order.merchandise).toBe(486);
  expect(order.total).toBe(486);
  expect(order.shipping).toBe(0);
  expect(order.additionalSpend).toBe(40);
  expect(order.merchandiseUplift).toBe(99);
  expect(order.upliftPercent).toBeCloseTo(25.6, 1);
  expect(canAcceptOffer(persona1)).toBe(true);
  expect(canAcceptOffer({ ...persona1, addon: { ...persona1.addon, price: 120 } })).toBe(false);
  for (const phrase of [persona1.query, ...persona1.triggerPhrases, 'Buy sunscreen under five hundred']) expect(matchesPersona1(phrase)).toBe(true);
  for (const phrase of ['sunscreen under 400', 'sunscreen under 1500', 'sunscreen under 500.50', 'sunscreen under 500 not 400', 'shoes under 500']) expect(matchesPersona1(phrase)).toBe(false);
  const blocked = { ...initialFlow, state: 'AWAITING_APPROVAL', runId: 1 };
  expect(flowReducer(blocked, { type: 'ELAPSED', from: 'ORDER_READY', runId: 1 })).toBe(blocked);
  expect(flowReducer(blocked, { type: 'PAYMENT_RESOLVED', runId: 1, success: true })).toBe(blocked);
  expect(flowReducer(blocked, { type: 'SET_MODE', mode: 'full' })).toBe(blocked);
});

async function observeDemo(page) {
  await page.evaluate(() => {
    window.observed = { states: [], errors: [] };
    const observer = new MutationObserver(() => {
      const stage = document.querySelector('.dynamic-stage');
      if (!stage || window.observed.states.includes(stage.dataset.state)) return;
      window.observed.states.push(stage.dataset.state);
      const composer = document.querySelector('.prompt-composer').getBoundingClientRect();
      const bounds = stage.getBoundingClientRect();
      if (document.documentElement.scrollHeight > innerHeight) window.observed.errors.push(`${stage.dataset.state}: scroll`);
      if (bounds.bottom > composer.top) window.observed.errors.push(`${stage.dataset.state}: composer overlap`);
    });
    observer.observe(document.querySelector('main'), { subtree: true, attributes: true, childList: true });
  });
}

for (const mode of ['approval', 'full']) {
  test(`complete ${mode} flow from composer`, async ({ page }) => {
    test.setTimeout(45000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await observeDemo(page);
    if (mode === 'full') {
      await page.getByRole('button', { name: /Ask for approval/ }).click();
      await page.getByRole('menuitemradio', { name: /Full access/ }).click();
    }
    await page.getByRole('textbox', { name: 'Instruction for your agents' }).fill(persona1.query);
    await page.getByRole('button', { name: 'Send instruction' }).click();
    await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', 'BUYER_RECEIVING_INTENT');
    await expect(page.locator('.product-card')).toHaveCount(3, { timeout: 8000 });
    await expect(page.locator('.product-price strong')).toHaveText(['₹387', '₹332', '₹300']);
    expect(await page.locator('.product-crop img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await expect(page.locator('.has-selection')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.best-product .best-match')).toBeVisible();
    await expect(page.locator('.offer-value')).toContainText('₹40 more · get a ₹99 add-on', { timeout: 5000 });
    await expect(page.locator('.offer-value')).toContainText('₹486 merchandise · within ₹500');
    await expect(page.locator('.dynamic-stage')).not.toContainText(/you save|savings|upsell|reasoning/i);
    if (mode === 'approval') {
      const approve = page.getByRole('button', { name: 'Approve ₹486' });
      await expect(approve).toBeVisible({ timeout: 7000 });
      await page.waitForTimeout(1600);
      await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', 'AWAITING_APPROVAL');
      await expect(page.locator('.authorization-trigger')).toBeDisabled();
      await approve.click();
      await page.getByLabel('4-digit demo PIN').fill('0000');
      await page.getByRole('button', { name: 'Verify & pay ₹486' }).click();
      await expect(page.getByRole('alert')).toContainText('Use the demo PIN');
      await page.getByLabel('4-digit demo PIN').fill('1234');
      await page.getByRole('button', { name: 'Verify & pay ₹486' }).click();
    }
    await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', 'PAYMENT_SUCCESS', { timeout: 9000 });
    await expect(page.locator('.payment-amount')).toHaveText('₹486');
    await expect(page.locator('.mock-disclosure')).toContainText('No money is charged');
    await expect(page.locator('.product-offers, .basket-offer, .order-summary')).toHaveCount(0);
    const observed = await page.evaluate(() => window.observed);
    expect(observed.errors).toEqual([]);
    expect(observed.states).toContain('OFFER_ACCEPTED');
    expect(observed.states).toContain('BUYER_TO_NOVA');
    expect(observed.states).toContain('NOVA_TO_BUYER');
    expect(observed.states.includes('AWAITING_APPROVAL')).toBe(mode === 'approval');
    expect(observed.states.includes('VERIFYING_APPROVAL')).toBe(mode === 'approval');
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/persona-${mode}-success.png`, animations: 'disabled' });
  });
}

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
  test(`every scene fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    for (const state of Object.keys(scenes).filter(state => state !== 'IDLE')) {
      await page.evaluate(state => window.__novaDemo.jump(state), state);
      await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', state);
      const layout = await page.evaluate(() => {
        const stage = document.querySelector('.dynamic-stage');
        const composer = document.querySelector('.prompt-composer').getBoundingClientRect();
        const elements = [...stage.querySelectorAll('.scene-heading, .product-card, .basket-offer, .basket-analysis, .order-summary, .payment-stage, .verification')];
        return { scroll: document.documentElement.scrollHeight > innerHeight, overlap: elements.some(element => element.getBoundingClientRect().bottom > composer.top), nodesVisible: [...document.querySelectorAll('.agent-orb')].every(element => element.getBoundingClientRect().top >= 0) };
      });
      expect(layout, state).toEqual({ scroll: false, overlap: false, nodesVisible: true });
      if (['PRODUCT_RESULTS', 'PRODUCT_SELECTED', 'NOVA_BASKET_ANALYSIS', 'NOVA_ADDON_OFFER', 'ORDER_READY', 'AWAITING_APPROVAL', 'VERIFYING_APPROVAL', 'PAYMENT_SUCCESS'].includes(state)) {
        await page.screenshot({ path: `test-results/${state}-${width}.png`, animations: 'disabled' });
      }
    }
  });
}

test('decline, reset, stale timers and hidden development controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Development controls')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+D');
  await expect(page.getByLabel('Development controls')).toBeVisible();
  await page.getByLabel('Jump to scene').selectOption('AWAITING_APPROVAL');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', 'DECLINED');
  await page.evaluate(() => window.__novaDemo.replay('full'));
  await expect(page.locator('.dynamic-stage')).toHaveAttribute('data-state', 'BUYER_RECEIVING_INTENT');
  await page.evaluate(() => window.__novaDemo.reset());
  await page.waitForTimeout(1200);
  await expect(page.locator('.dynamic-stage')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveValue('');
});
