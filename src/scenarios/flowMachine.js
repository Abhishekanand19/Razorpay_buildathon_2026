import { canAcceptOffer, calculateOrder, persona1 } from './persona1.js';

// Each scene describes an observable action, its presentation, and its next event.
// Replace ELAPSED with service events later; presentation components own no timers.
export const scenes = {
  IDLE: { view: null },
  BUYER_RECEIVING_INTENT: { title: 'Understanding your request…', actor: 'buyer', duration: 550, next: 'BUYER_INTENT_READY' },
  BUYER_INTENT_READY: { title: 'Best sunscreen under ₹500', detail: 'Hard product budget detected', actor: 'buyer', duration: 500, next: 'BUYER_TO_NOVA' },
  BUYER_TO_NOVA: { title: 'Requesting merchant offers…', direction: 'to-nova', duration: 700, next: 'NOVA_MATCHING' },
  NOVA_MATCHING: { title: 'Matching merchant catalog…', actor: 'nova', duration: 550, next: 'NOVA_APPLYING_BUDGET' },
  NOVA_APPLYING_BUDGET: { title: 'Applying ₹500 budget…', actor: 'nova', duration: 500, next: 'NOVA_MATCHES_FOUND' },
  NOVA_MATCHES_FOUND: { title: '3 strong matches found', actor: 'nova', duration: 350, next: 'PRODUCT_RESULTS' },
  PRODUCT_RESULTS: { title: 'Three offers. One hard budget.', detail: 'All products under ₹500', view: 'products', duration: 950, next: 'NOVA_TO_BUYER' },
  NOVA_TO_BUYER: { title: 'Evaluating offers…', view: 'products', direction: 'to-buyer', duration: 700, next: 'BUYER_EVALUATING_PRODUCTS' },
  BUYER_EVALUATING_PRODUCTS: { title: 'Evaluating offers…', actor: 'buyer', view: 'products', duration: 1000, next: 'PRODUCT_SELECTED' },
  PRODUCT_SELECTED: { title: 'Best fit selected — ₹387', view: 'selected', duration: 850, next: 'BUYER_SELECTION_TO_NOVA' },
  BUYER_SELECTION_TO_NOVA: { title: 'Sharing the best match', view: 'selected', direction: 'to-nova', duration: 700, next: 'NOVA_BASKET_ANALYSIS' },
  NOVA_BASKET_ANALYSIS: { title: 'A closer look at your basket', view: 'basket', actor: 'nova', duration: 1200, next: 'NOVA_ADDON_OFFER' },
  NOVA_ADDON_OFFER: { title: 'Complete your sun protection', view: 'offer', duration: 1400, next: 'NOVA_OFFER_TO_BUYER' },
  NOVA_OFFER_TO_BUYER: { title: 'Evaluating Nova’s offer…', view: 'offer', direction: 'to-buyer', duration: 700, next: 'BUYER_EVALUATING_OFFER' },
  BUYER_EVALUATING_OFFER: { title: 'Evaluating Nova’s offer…', view: 'offer', actor: 'buyer', duration: 1050, next: 'OFFER_ACCEPTED' },
  OFFER_ACCEPTED: { title: 'Accepted', detail: '₹486 merchandise · within budget', view: 'offer', success: true, duration: 600, next: 'ORDER_READY' },
  ORDER_READY: { title: 'Your order', detail: '2 items · Free delivery', view: 'order', duration: 650, next: 'AUTHORIZE' },
  AWAITING_APPROVAL: { title: 'Payment ready', detail: 'Approval required', view: 'approval' },
  VERIFYING_APPROVAL: { title: 'Enter PIN', detail: 'Simulated authorization', view: 'verification' },
  AUTONOMOUS_AUTHORIZATION: { title: 'Checking authorization…', view: 'order', duration: 600, next: 'AUTHORIZED' },
  AUTHORIZED: { title: 'Within authorized limit', view: 'order', success: true, duration: 550, next: 'PAYMENT_PREPARING' },
  PAYMENT_PREPARING: { title: 'Preparing payment…', view: 'payment', duration: 550, next: 'PAYMENT_PROCESSING' },
  PAYMENT_PROCESSING: { title: 'Executing payment…', view: 'payment' },
  PAYMENT_SUCCESS: { title: 'Payment successful', view: 'success', success: true },
  PAYMENT_FAILED: { title: 'Payment could not be completed', detail: 'No money was charged.', view: 'stopped' },
  DECLINED: { title: 'Payment declined', detail: 'No payment was made.', view: 'stopped' },
};

export const lockedStates = new Set(['AWAITING_APPROVAL', 'VERIFYING_APPROVAL', 'AUTONOMOUS_AUTHORIZATION', 'AUTHORIZED', 'PAYMENT_PREPARING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'DECLINED']);
export const initialFlow = { state: 'IDLE', mode: persona1.authorizationMode, runId: 0, approved: false, paused: false, error: '' };

export function flowReducer(flow, event) {
  const move = state => ({ ...flow, state, error: '' });
  switch (event.type) {
    case 'RESET': return { ...initialFlow, mode: flow.mode, runId: flow.runId + 1 };
    case 'START': return flow.state === 'IDLE' || ['PAYMENT_SUCCESS', 'DECLINED', 'PAYMENT_FAILED'].includes(flow.state)
      ? { ...initialFlow, mode: flow.mode, state: 'BUYER_RECEIVING_INTENT', runId: flow.runId + 1 } : flow;
    case 'SET_MODE': return !lockedStates.has(flow.state) && ['approval', 'full'].includes(event.mode) ? { ...flow, mode: event.mode } : flow;
    case 'JUMP': return import.meta.env.DEV && scenes[event.state] ? { ...flow, state: event.state, paused: true, approved: false, error: '', runId: flow.runId + 1 } : flow;
    case 'ELAPSED': {
      if (event.from !== flow.state || event.runId !== flow.runId || flow.paused) return flow;
      const next = scenes[flow.state].next;
      if (next === 'OFFER_ACCEPTED' && !canAcceptOffer(persona1)) return move('PAYMENT_FAILED');
      if (next === 'AUTHORIZE') return move(flow.mode === 'approval' ? 'AWAITING_APPROVAL' : 'AUTONOMOUS_AUTHORIZATION');
      if (next === 'AUTHORIZED' && calculateOrder(persona1).total > persona1.payment.authorizedLimit) return move('PAYMENT_FAILED');
      return next ? move(next) : flow;
    }
    case 'APPROVE': return flow.state === 'AWAITING_APPROVAL' ? move('VERIFYING_APPROVAL') : flow;
    case 'DECLINE': return ['AWAITING_APPROVAL', 'VERIFYING_APPROVAL'].includes(flow.state) ? move('DECLINED') : flow;
    case 'VERIFY': return flow.state !== 'VERIFYING_APPROVAL' ? flow : event.pin === persona1.payment.demoPin
      ? { ...move('PAYMENT_PREPARING'), approved: true, paused: false }
      : { ...flow, error: 'Use the demo PIN 1234. No real PIN is needed.' };
    case 'PAYMENT_RESOLVED': return flow.state === 'PAYMENT_PROCESSING' && event.runId === flow.runId
      && (flow.approved || flow.mode === 'full') ? move(event.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED') : flow;
    default: return flow;
  }
}
