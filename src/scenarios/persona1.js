import { normalizeCommerceQuery } from '../speech/language.js';

export const money = value => `₹${value.toLocaleString('en-IN')}`;

export const persona1 = {
  scenarioId: 'persona-1-suncare',
  persona: 'budget_capped_value_hunter',
  query: 'Buy me the best sunscreen under ₹500',
  triggerPhrases: ['Best sunscreen under 500', 'Find me a sunscreen under ₹500', 'Buy sunscreen under 500'],
  buyerIntent: { category: 'sunscreen', hardBudget: 500, currency: 'INR', intent: 'buy', priority: 'best_value' },
  hardBudget: 500,
  authorizationMode: 'approval',
  products: [
    { id: 'dot-key', name: 'Dot & Key Vitamin C+ E Face Sunscreen SPF 50 PA+++', shortName: 'Dot & Key Vitamin C+', orderName: 'Dot & Key Vitamin C+ SPF 50', price: 387, originalPrice: 445, discount: 58, size: '50 g', attributes: ['SPF 50', 'PA+++'], image: '/products/dot-key-source.png', crop: { x: 46, y: 19, width: 51, height: 112, mask: 'polygon(35% 0, 75% 0, 91% 5%, 100% 14%, 100% 78%, 81% 78%, 81% 98%, 20% 100%, 8% 95%, 8% 80%, 0 72%, 0 20%, 8% 8%)' }, bestMatch: true },
    { id: 'minimalist', name: 'Minimalist Light Fluid Sunscreen SPF 50', shortName: 'Minimalist Light Fluid', price: 332, originalPrice: 349, discount: 17, size: '30 ml', attributes: ['SPF 50', 'Ultra-light'], image: '/products/minimalist-source.png', crop: { x: 45, y: 25, width: 60, height: 90, mask: 'polygon(0 0, 100% 0, 100% 90%, 63% 90%, 63% 100%, 0 100%)' } },
    { id: 'foxtale', name: 'Foxtale Glow Sunscreen SPF 50 PA++++', shortName: 'Foxtale Glow', price: 300, originalPrice: 375, discount: 75, size: '50 ml', attributes: ['SPF 50', 'PA++++'], image: '/products/foxtale-source.png', crop: { x: 15, y: 25, width: 43, height: 111 } },
  ],
  selectedProductId: 'dot-key',
  shippingRules: { deliveryFee: 59, freeDeliveryThreshold: 449 },
  addon: { id: 'spf-lip-balm', name: 'SPF Lip Balm', price: 99, description: 'Relevant complementary protection', complementary: true, image: null },
  payment: { kind: 'mock', authorizedLimit: 500, demoPin: '1234', delay: 1100 },
};

export function calculateOrder(scenario) {
  const selected = scenario.products.find(product => product.id === scenario.selectedProductId);
  const { deliveryFee, freeDeliveryThreshold } = scenario.shippingRules;
  const initialShipping = selected.price >= freeDeliveryThreshold ? 0 : deliveryFee;
  const merchandise = selected.price + scenario.addon.price;
  const shipping = merchandise >= freeDeliveryThreshold ? 0 : deliveryFee;
  return {
    selected, items: [selected, scenario.addon], headroom: scenario.hardBudget - selected.price,
    initialMerchandise: selected.price, initialShipping, initialTotal: selected.price + initialShipping,
    merchandise, shipping, total: merchandise + shipping,
    additionalSpend: merchandise + shipping - selected.price - initialShipping,
    merchandiseUplift: scenario.addon.price,
    upliftPercent: scenario.addon.price / selected.price * 100,
    withinBudget: merchandise <= scenario.hardBudget,
  };
}
persona1.order = calculateOrder(persona1);

// Explicit deterministic scenario matching, not persona classification or an LLM.
export function matchesPersona1(query) {
  const normalized = normalizeCommerceQuery(query);
  const amounts = normalized.match(/\d+(?:[.,]\d+)?/g) || [];
  return /(\bsunscreen\b|सनस्क्रीन)/.test(normalized) && /(\b(under|below|within|up to|max|maximum|budget|andar)\b|अंदर|तक|बजट)/.test(normalized)
    && amounts.length === 1 && Number(amounts[0]) === persona1.hardBudget;
}

export function canAcceptOffer(scenario) {
  const order = calculateOrder(scenario);
  return order.withinBudget && scenario.addon.complementary && order.shipping === 0
    && order.additionalSpend >= 0 && order.additionalSpend < scenario.addon.price;
}
