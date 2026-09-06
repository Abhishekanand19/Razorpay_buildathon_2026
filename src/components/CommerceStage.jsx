import React, { useEffect, useRef, useState } from 'react';
import { money, persona1 } from '../scenarios/persona1.js';
import { Icon } from './Icons.jsx';

export function ProductImage({ product, compact = false }) {
  if (!product.image) return <div className="addon-placeholder" aria-label="SPF Lip Balm placeholder"><span className="balm-shape" /><small>SPF</small></div>;
  const crop = product.crop;
  return <div className={`product-image ${compact ? 'is-compact' : ''}`}>
    <div className="product-crop" style={{ width: crop.width, height: crop.height }}>
      <img src={product.image} alt={product.name} draggable="false" style={{ left: -crop.x, top: -crop.y }} />
    </div>
  </div>;
}

function ProductOffers({ scenario, selected }) {
  return <div className={`product-offers ${selected ? 'has-selection' : ''}`} aria-label="Merchant product offers">
    {scenario.products.map((product, index) => <article key={product.id} className={`product-card ${product.id === scenario.selectedProductId ? 'best-product' : 'other-product'}`} style={{ '--index': index }} aria-hidden={selected && product.id !== scenario.selectedProductId ? true : undefined}>
      <ProductImage product={product} />
      <div className="product-copy"><h3>{product.shortName}</h3><p>{product.attributes.join(' · ')} <span>· {product.size}</span></p>
        <div className="product-price"><strong>{money(product.price)}</strong><span className="best-match"><Icon name="check" />Best match</span></div>
      </div>
    </article>)}
  </div>;
}

function BasketAnalysis({ scenario }) {
  const order = scenario.order;
  return <div className="basket-analysis scene-enter">
    <div className="chosen-product"><ProductImage product={order.selected} /><div><span className="eyebrow">BEST MATCH</span><h3>{order.selected.shortName}</h3><p>SPF 50 · 50 g</p><strong>{money(order.selected.price)}</strong></div></div>
    <div className="basket-totals"><span className="eyebrow">CURRENT CHECKOUT</span><PriceRows order={order} /><p className="budget-note">{money(order.headroom)} remaining in your {money(scenario.hardBudget)} product budget</p></div>
  </div>;
}

function PriceRows({ order, optimized = false }) {
  return <dl className="price-rows">
    <div><dt>Sunscreen</dt><dd>{money(order.selected.price)}</dd></div>
    {optimized && <div><dt>SPF Lip Balm</dt><dd>{money(order.items[1].price)}</dd></div>}
    <div><dt>Delivery</dt><dd className={optimized ? 'semantic-success' : ''}>{optimized && !order.shipping ? 'FREE' : money(order.initialShipping)}</dd></div>
    <div className="total-row"><dt>{optimized ? 'Pay' : 'Total'}</dt><dd>{money(optimized ? order.total : order.initialTotal)}</dd></div>
  </dl>;
}

function BasketOffer({ scenario, accepted }) {
  const order = scenario.order;
  return <div className={`basket-offer scene-enter ${accepted ? 'offer-accepted' : ''}`}>
    <div className="offer-products">
      <div className="offer-item"><ProductImage product={order.selected} compact /><div><h3>{order.selected.shortName}</h3><span>{money(order.selected.price)}</span></div></div>
      <span className="offer-plus" aria-hidden="true">+</span>
      <div className="offer-item"><ProductImage product={scenario.addon} /><div><h3>{scenario.addon.name}</h3><span>{money(scenario.addon.price)}</span><small>Complementary protection</small></div></div>
    </div>
    <div className="comparison">
      <div className="comparison-current"><span className="eyebrow">CURRENT</span><PriceRows order={order} /></div>
      <div className="comparison-nova"><span className="eyebrow">WITH NOVA</span><PriceRows order={order} optimized /></div>
    </div>
    <div className="offer-value"><span>{money(order.additionalSpend)} more · get a {money(scenario.addon.price)} add-on</span><span className="semantic-success">{money(order.merchandise)} merchandise · within {money(scenario.hardBudget)}</span></div>
  </div>;
}

function OrderSummary({ scenario }) {
  return <div className="order-summary scene-enter">
    {scenario.order.items.map(item => <div className="order-item" key={item.id}><ProductImage product={item} compact /><span>{item.orderName || item.name}</span><strong>{money(item.price)}</strong></div>)}
    <div className="order-delivery"><span>Delivery</span><span className="semantic-success">FREE</span></div>
    <div className="order-total"><span>Total <small>2 items</small></span><strong>{money(scenario.order.total)}</strong></div>
  </div>;
}

function Verification({ dispatch, error, scenario }) {
  const [pin, setPin] = useState('');
  const pinInput = useRef(null);
  useEffect(() => { pinInput.current?.focus({ preventScroll: true }); }, []);
  return <form className="verification scene-enter" onSubmit={event => { event.preventDefault(); dispatch({ type: 'VERIFY', pin }); setPin(''); }}>
    <strong className="payment-amount">{money(scenario.order.total)}</strong>
    <label htmlFor="demo-pin">4-digit demo PIN</label>
    <input ref={pinInput} id="demo-pin" className="pin-input" type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} pattern="[0-9]{4}" onChange={event => setPin(event.target.value.replace(/\D/g, ''))} aria-describedby="pin-help pin-error" />
    <p id="pin-help">Demo PIN: <strong>{scenario.payment.demoPin}</strong> · Do not use a real PIN.</p>
    <p className="pin-error" id="pin-error" role="alert">{error}</p>
    <div className="payment-actions"><button className="primary-action" type="submit" disabled={pin.length !== 4}>Verify & pay {money(scenario.order.total)}</button><button className="secondary-action" type="button" onClick={() => dispatch({ type: 'DECLINE' })}>Cancel</button></div>
  </form>;
}

function PaymentStage({ scene, flow, dispatch, scenario }) {
  const approve = useRef(null);
  useEffect(() => { if (scene.view === 'approval') approve.current?.focus({ preventScroll: true }); }, [scene.view]);
  if (scene.view === 'verification') return <Verification dispatch={dispatch} error={flow.error} scenario={scenario} />;
  const success = scene.view === 'success';
  const stopped = scene.view === 'stopped';
  return <div className={`payment-stage scene-enter ${success ? 'payment-complete' : ''}`}>
    {success && <div className="confirmation-mark"><Icon name="check" /></div>}
    {!stopped && <strong className="payment-amount">{money(scenario.order.total)}</strong>}
    {success ? <><p>{scenario.order.selected.orderName}<br />{scenario.addon.name}</p><span className="semantic-success">Free delivery · Order confirmed</span></>
      : !stopped && <p>2 items · Free delivery</p>}
    {scene.view === 'approval' && <div className="payment-actions"><button ref={approve} className="primary-action" onClick={() => dispatch({ type: 'APPROVE' })}>Approve {money(scenario.order.total)}</button><button className="secondary-action" onClick={() => dispatch({ type: 'DECLINE' })}>Decline</button></div>}
    {scene.view === 'payment' && <span className="processing-label"><i aria-hidden="true" />Processing…</span>}
    <small className="mock-disclosure">Simulated payment · No money is charged</small>
  </div>;
}

export function CommerceStage({ scene, flow, dispatch, scenario = persona1 }) {
  const productView = ['products', 'selected'].includes(scene.view);
  return <section className={`dynamic-stage view-${scene.view || 'status'}`} aria-label="Current transaction" data-state={flow.state}>
    <div className="scene-heading" role="status" aria-live="polite" aria-atomic="true">
      <h2 className={scene.success ? 'semantic-success' : ''}>{scene.success && <Icon name="check" />}{scene.title}</h2>
      {scene.detail && <p>{scene.detail}</p>}
    </div>
    {productView && <ProductOffers scenario={scenario} selected={scene.view === 'selected'} />}
    {scene.view === 'basket' && <BasketAnalysis scenario={scenario} />}
    {scene.view === 'offer' && <BasketOffer scenario={scenario} accepted={flow.state === 'OFFER_ACCEPTED'} />}
    {scene.view === 'order' && <OrderSummary scenario={scenario} />}
    {['approval', 'verification', 'payment', 'success', 'stopped'].includes(scene.view) && <PaymentStage scene={scene} flow={flow} dispatch={dispatch} scenario={scenario} />}
  </section>;
}
