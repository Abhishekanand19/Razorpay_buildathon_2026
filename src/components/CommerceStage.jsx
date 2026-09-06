import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { money, persona1 } from '../scenarios/persona1.js';
import { Icon } from './Icons.jsx';

export function ProductImage({ product, compact = false }) {
  if (!product.image) return <div className="addon-placeholder" data-product-visual={product.id} aria-label="SPF Lip Balm placeholder"><span className="balm-shape" /><small>SPF</small></div>;
  const crop = product.crop;
  return <div className={`product-image ${compact ? 'is-compact' : ''}`} data-product-visual={product.id}>
    {crop ? <div className="product-crop" style={{ width: crop.width, height: crop.height, clipPath: crop.mask }}>
      <img src={product.image} alt={product.name} draggable="false" style={{ left: -crop.x, top: -crop.y }} />
    </div> : <img className="uncropped-product" src={product.image} alt={product.name} draggable="false" />}
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

function BasketAnalysis({ scenario, step = 3 }) {
  const order = scenario.order;
  return <div className="basket-analysis scene-enter">
    <div className="chosen-product"><ProductImage product={order.selected} /><div><span className="eyebrow">BEST MATCH</span><h3>{order.selected.shortName}</h3><p>SPF 50 · 50 g</p><strong>{money(order.selected.price)}</strong></div></div>
    <div className="basket-totals"><span className="eyebrow">CURRENT CHECKOUT</span><PriceRows order={order} basketStep={step} /><p className={`budget-note ${step < 3 ? 'step-hidden' : ''}`}>{money(order.headroom)} remaining in your {money(scenario.hardBudget)} product budget</p></div>
  </div>;
}

function PriceRows({ order, optimized = false, basketStep = 3, offerStep = 4 }) {
  return <dl className="price-rows">
    <div><dt>Sunscreen</dt><dd>{money(order.selected.price)}</dd></div>
    {optimized && <div><dt>SPF Lip Balm</dt><dd>{money(order.items[1].price)}</dd></div>}
    <div className={basketStep < 2 ? 'step-hidden' : ''} aria-hidden={basketStep < 2}><dt>Delivery</dt><dd className={optimized && offerStep >= 3 ? 'semantic-success' : ''}>{optimized && !order.shipping && offerStep >= 3 ? <span className="delivery-changed"><s>{money(order.initialShipping)}</s> FREE</span> : money(order.initialShipping)}</dd></div>
    <div className={`total-row ${basketStep < 3 || (optimized && offerStep < 2) ? 'step-hidden' : ''}`} aria-hidden={basketStep < 3 || (optimized && offerStep < 2)}><dt>{optimized ? offerStep < 4 ? 'Merchandise' : 'Pay' : 'Total'}</dt><dd key={optimized ? offerStep >= 4 ? 'pay' : 'merchandise' : 'total'}>{money(optimized ? order.total : order.initialTotal)}</dd></div>
  </dl>;
}

function BasketOffer({ scenario, accepted, step = 4 }) {
  const order = scenario.order;
  return <div className={`basket-offer scene-enter ${accepted ? 'offer-accepted' : ''}`} data-offer-step={step}>
    <div className="offer-products">
      <div className="offer-item"><ProductImage product={order.selected} compact /><div><h3>{order.selected.shortName}</h3><span>{money(order.selected.price)}</span></div></div>
      <span className="offer-plus" aria-hidden="true">+</span>
      <div className="offer-item addon-arrival"><ProductImage product={scenario.addon} /><div><h3>{scenario.addon.name}</h3><span>{money(scenario.addon.price)}</span><small>Complementary protection</small></div></div>
    </div>
    <div className="comparison">
      <div className="comparison-current"><span className="eyebrow">CURRENT</span><PriceRows order={order} /></div>
      <div className="comparison-nova"><span className="eyebrow">WITH NOVA</span><PriceRows order={order} optimized offerStep={step} /></div>
    </div>
    <div className={`offer-value ${step < 4 ? 'step-hidden' : ''}`} aria-hidden={step < 4}><span>{money(order.additionalSpend)} more · get a {money(scenario.addon.price)} add-on</span><span className="semantic-success">{money(order.merchandise)} merchandise · within {money(scenario.hardBudget)}</span></div>
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

export function CommerceStage({ scene, flow, dispatch, narration, scenario = persona1 }) {
  const root = useRef(null);
  const previous = useRef({ view: null, positions: {} });
  useLayoutEffect(() => {
    const images = [...root.current.querySelectorAll('[data-product-visual]')];
    const positions = Object.fromEntries(images.map(image => [image.dataset.productVisual, image.getBoundingClientRect()]));
    if (previous.current.view !== scene.view && ['basket', 'offer', 'order'].includes(scene.view) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      images.forEach(image => {
        const before = previous.current.positions[image.dataset.productVisual], after = positions[image.dataset.productVisual];
        if (before) image.animate([{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px) scale(${before.width / after.width}, ${before.height / after.height})` }, { transform: 'translate(0, 0) scale(1)' }], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }
    previous.current = { view: scene.view, positions };
  });
  const productView = ['products', 'selected'].includes(scene.view);
  return <section ref={root} className={`dynamic-stage view-${scene.view || 'status'} ${narration ? 'has-subtitle' : ''}`} aria-label="Current transaction" data-state={flow.state}>
    <div className={`scene-heading ${narration ? 'agent-subtitle' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      {narration ? <><span className="subtitle-speaker">{narration.speaker === 'buyer' ? 'Buyer Agent' : 'Nova'}</span><p lang={narration.language === 'hi' ? 'hi' : narration.language === 'hinglish' ? 'hi-Latn' : 'en-IN'}>{narration.displayText}</p></>
        : <><h2 className={scene.success ? 'semantic-success' : ''}>{scene.success && <Icon name="check" />}{scene.title}</h2>{scene.detail && <p>{scene.detail}</p>}</>}
    </div>
    {productView && <ProductOffers scenario={scenario} selected={scene.view === 'selected'} />}
    {scene.view === 'basket' && <BasketAnalysis scenario={scenario} step={scene.basketStep} />}
    {scene.view === 'offer' && <BasketOffer scenario={scenario} accepted={flow.state === 'OFFER_ACCEPTED'} step={scene.offerStep} />}
    {scene.view === 'order' && <OrderSummary scenario={scenario} />}
    {['approval', 'verification', 'payment', 'success', 'stopped'].includes(scene.view) && <PaymentStage scene={scene} flow={flow} dispatch={dispatch} scenario={scenario} />}
  </section>;
}
