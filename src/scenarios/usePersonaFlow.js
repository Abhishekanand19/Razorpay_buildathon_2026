import { useEffect, useReducer } from 'react';
import { flowReducer, initialFlow, scenes, lockedStates } from './flowMachine.js';
import { persona1 } from './persona1.js';
import { mockPayment } from '../services/mockPayment.js';

export function usePersonaFlow(paymentAdapter = mockPayment) {
  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const scene = scenes[flow.state];
  useEffect(() => {
    if (!scene.duration || flow.paused) return;
    const timer = setTimeout(() => dispatch({ type: 'ELAPSED', from: flow.state, runId: flow.runId }), scene.duration);
    return () => clearTimeout(timer);
  }, [flow.state, flow.runId, flow.paused, scene]);

  useEffect(() => {
    if (flow.state !== 'PAYMENT_PROCESSING' || flow.paused) return;
    const controller = new AbortController();
    paymentAdapter({ order: persona1.order, authorized: flow.approved || flow.mode === 'full', signal: controller.signal, delay: persona1.payment.delay })
      .then(result => dispatch({ type: 'PAYMENT_RESOLVED', runId: flow.runId, success: result.success }))
      .catch(error => { if (error.name !== 'AbortError') dispatch({ type: 'PAYMENT_RESOLVED', runId: flow.runId, success: false }); });
    return () => controller.abort();
  }, [flow.state, flow.runId, flow.paused, flow.approved, flow.mode, paymentAdapter]);

  return { flow, scene, dispatch, modeLocked: lockedStates.has(flow.state), busy: flow.state !== 'IDLE' && !['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'DECLINED'].includes(flow.state) };
}
