import { canAcceptOffer, calculateOrder, persona1 } from './persona1.js';
import { detectConversationLanguage } from '../speech/language.js';

// Completion comes from speech end, wave arrival/settle, or visual completion.
// Holds apply only to short silent observable actions, never spoken dialogue.
export const scenes = {
  IDLE: { view: null },
  BUYER_RECEIVING_INTENT: { title: 'Understanding your request…', actor: 'buyer', hold: 100, next: 'BUYER_INTENT_READY' },
  BUYER_INTENT_READY: { title: 'Best sunscreen under ₹500', detail: 'Hard product budget detected', actor: 'buyer', message: 'intent', next: 'BUYER_TO_NOVA' },
  BUYER_TO_NOVA: { title: 'Requesting merchant offers…', direction: 'to-nova', next: 'NOVA_MATCHING' },
  NOVA_MATCHING: { title: 'Matching merchant catalog…', actor: 'nova', hold: 220, next: 'NOVA_APPLYING_BUDGET' },
  NOVA_APPLYING_BUDGET: { title: 'Applying ₹500 budget…', actor: 'nova', hold: 220, next: 'NOVA_MATCHES_FOUND' },
  NOVA_MATCHES_FOUND: { title: '3 strong matches found', actor: 'nova', hold: 200, next: 'NOVA_MATCHES_SPEAKING' },
  NOVA_MATCHES_SPEAKING: { title: 'Three options within budget', actor: 'nova', message: 'matches', next: 'PRODUCT_RESULTS' },
  PRODUCT_RESULTS: { title: 'Three offers. One hard budget.', detail: 'All products under ₹500', view: 'products', hold: 150, next: 'NOVA_TO_BUYER' },
  NOVA_TO_BUYER: { title: 'Evaluating offers…', view: 'products', direction: 'to-buyer', next: 'BUYER_EVALUATING_PRODUCTS' },
  BUYER_EVALUATING_PRODUCTS: { title: 'Evaluating offers…', actor: 'buyer', view: 'products', hold: 100, next: 'PRODUCT_SELECTED' },
  PRODUCT_SELECTED: { title: 'Best fit selected — ₹387', view: 'selected', actor: 'buyer', message: 'selection', next: 'BUYER_SELECTION_TO_NOVA' },
  BUYER_SELECTION_TO_NOVA: { title: 'Sharing the best match', view: 'selected', direction: 'to-nova', next: 'NOVA_BASKET_ANALYSIS' },
  NOVA_BASKET_ANALYSIS: { title: 'A closer look at your basket', view: 'basket', basketStep: 1, actor: 'nova', hold: 120, next: 'NOVA_BASKET_DELIVERY' },
  NOVA_BASKET_DELIVERY: { title: 'A closer look at your basket', view: 'basket', basketStep: 2, actor: 'nova', hold: 140, next: 'NOVA_BASKET_TOTAL' },
  NOVA_BASKET_TOTAL: { title: 'A closer look at your basket', view: 'basket', basketStep: 3, actor: 'nova', hold: 180, next: 'NOVA_ADDON_INTRO' },
  NOVA_ADDON_INTRO: { title: 'Complete your sun protection', view: 'offer', offerStep: 1, actor: 'nova', next: 'NOVA_MERCHANDISE' },
  NOVA_MERCHANDISE: { title: 'Complete your sun protection', view: 'offer', offerStep: 2, actor: 'nova', hold: 150, next: 'NOVA_FREE_DELIVERY' },
  NOVA_FREE_DELIVERY: { title: 'Complete your sun protection', view: 'offer', offerStep: 3, actor: 'nova', hold: 150, next: 'NOVA_ADDON_OFFER' },
  NOVA_ADDON_OFFER: { title: 'Complete your sun protection', view: 'offer', offerStep: 4, actor: 'nova', message: 'offer', next: 'NOVA_OFFER_TO_BUYER' },
  NOVA_OFFER_TO_BUYER: { title: 'Evaluating Nova’s offer…', view: 'offer', direction: 'to-buyer', next: 'BUYER_EVALUATING_OFFER' },
  BUYER_EVALUATING_OFFER: { title: 'Evaluating Nova’s offer…', view: 'offer', actor: 'buyer', hold: 100, next: 'OFFER_ACCEPTED' },
  OFFER_ACCEPTED: { title: 'Accepted', detail: '₹486 merchandise · within budget', view: 'offer', actor: 'buyer', message: 'acceptance', success: true, next: 'ORDER_READY' },
  ORDER_READY: { title: 'Your order', detail: '2 items · Free delivery', view: 'order', next: 'AUTHORIZE' },
  PAYMENT_APPROVAL_NOTICE: { title: 'Payment ready', view: 'order', actor: 'nova', message: 'approval', next: 'AWAITING_APPROVAL' },
  AWAITING_APPROVAL: { title: 'Payment ready', detail: 'Approval required', view: 'approval' },
  VERIFYING_APPROVAL: { title: 'Enter PIN', detail: 'Simulated authorization', view: 'verification' },
  AUTONOMOUS_AUTHORIZATION: { title: 'Checking authorization…', view: 'order', hold: 500, next: 'AUTHORIZED' },
  AUTHORIZED: { title: 'Within authorized limit', view: 'order', success: true, hold: 450, next: 'PAYMENT_PREPARING' },
  PAYMENT_PREPARING: { title: 'Preparing payment…', view: 'payment', hold: 400, next: 'PAYMENT_PROCESSING' },
  PAYMENT_PROCESSING: { title: 'Executing payment…', view: 'payment' },
  PAYMENT_SUCCESS: { title: 'Payment successful', view: 'success', actor: 'nova', message: 'success', success: true },
  PAYMENT_FAILED: { title: 'Payment could not be completed', detail: 'No money was charged.', view: 'stopped' },
  DECLINED: { title: 'Payment declined', detail: 'No payment was made.', view: 'stopped' },
};

export const lockedStates = new Set(['PAYMENT_APPROVAL_NOTICE', 'AWAITING_APPROVAL', 'VERIFYING_APPROVAL', 'AUTONOMOUS_AUTHORIZATION', 'AUTHORIZED', 'PAYMENT_PREPARING', 'PAYMENT_PROCESSING']);
export const initialFlow = { state: 'IDLE', mode: persona1.authorizationMode, runId: 0, approved: false, paused: false, error: '', conversationLanguage: null, originalQuery: '' };

export function flowReducer(flow, event) {
  const move = state => ({ ...flow, state, error: '' });
  switch (event.type) {
    case 'RESET': return { ...initialFlow, mode: flow.mode, runId: flow.runId + 1 };
    case 'START': return flow.state === 'IDLE' || ['PAYMENT_SUCCESS', 'DECLINED', 'PAYMENT_FAILED'].includes(flow.state)
      ? { ...initialFlow, mode: flow.mode, state: 'BUYER_RECEIVING_INTENT', runId: flow.runId + 1, originalQuery: event.query || persona1.query, conversationLanguage: detectConversationLanguage(event.query || persona1.query) } : flow;
    case 'SET_MODE': return !lockedStates.has(flow.state) && ['approval', 'full'].includes(event.mode) ? { ...flow, mode: event.mode } : flow;
    case 'JUMP': return import.meta.env.DEV && scenes[event.state] ? { ...flow, state: event.state, paused: true, approved: false, error: '', runId: flow.runId + 1 } : flow;
    case 'SCENE_COMPLETED': {
      if (event.from !== flow.state || event.runId !== flow.runId || flow.paused) return flow;
      const next = scenes[flow.state].next;
      if (next === 'OFFER_ACCEPTED' && !canAcceptOffer(persona1)) return move('PAYMENT_FAILED');
      if (next === 'AUTHORIZE') return move(flow.mode === 'approval' ? 'PAYMENT_APPROVAL_NOTICE' : 'AUTONOMOUS_AUTHORIZATION');
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
