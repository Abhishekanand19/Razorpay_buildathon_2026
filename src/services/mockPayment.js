// Deliberately local: this adapter never sends financial data or charges money.
// A future test-mode payment adapter can implement the same contract.
export function mockPayment({ order, authorized, signal, delay = 1100 }) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    if (!authorized || !order.withinBudget) return resolve({ success: false });
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve({ success: true, simulated: true });
    }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}
