import React, { useId } from 'react';

export function AgentNode({ name, description, identity = 'buyer', active = false, className = '' }) {
  return (
    <div className={`agent agent--${identity} ${active ? 'agent-active' : ''} ${className}`}>
      <div className="agent-orb" aria-hidden="true">
        <div className="orb-interior" />
        <div className="orb-ring" />
        <div className="orb-light" />
      </div>
      <div className="agent-label">{name}</div>
      {description && <div className="agent-description">{description}</div>}
    </div>
  );
}

export function NeuralConnection({ className = '', direction }) {
  const id = useId().replaceAll(':', '');
  const paths = [
    'M 0 90 C 90 90, 98 148, 180 112 S 280 65, 360 90',
    'M 0 106 C 80 114, 113 49, 180 86 S 290 135, 360 100',
    'M 0 118 C 96 156, 115 87, 180 96 S 275 58, 360 112',
    'M 0 80 C 83 67, 117 113, 180 99 S 286 99, 360 83',
    'M 0 99 C 87 93, 118 105, 180 100 S 275 119, 360 98',
    'M 0 126 C 80 144, 132 118, 180 99 S 277 75, 360 76',
  ];
  return (
    <svg className={`neural-connection ${direction || ''} ${className}`} viewBox="0 0 360 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-thread`}>
          <stop stopColor="#9fb6d5" stopOpacity=".08" />
          <stop offset=".25" stopColor="#a2b5e0" stopOpacity=".52" />
          <stop offset=".56" stopColor="#c7b9ef" stopOpacity=".8" />
          <stop offset=".8" stopColor="#b7a1ed" stopOpacity=".6" />
          <stop offset="1" stopColor="#b8a4ed" stopOpacity=".12" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <g stroke={`url(#${id}-thread)`} className="thread-presence">
        <g filter={`url(#${id}-glow)`} strokeWidth="3" opacity=".48">
          {paths.map((d, i) => <path d={d} key={i} />)}
        </g>
        {paths.map((d, i) => <path d={d} key={i} strokeWidth={i === 4 ? '1.1' : '.8'} opacity={i === 5 ? '.4' : '.8'} />)}
      </g>
      {direction && <path key={direction} className="directional-signal" d={paths[4]} pathLength="100" strokeWidth="2" stroke="#c9c7e9" />}
    </svg>
  );
}

export function AgentStage({ actor, direction, synchronized = false }) {
  return (
    <section className={`agent-stage ${synchronized ? 'agents-synchronized' : ''}`} aria-label="Buyer Agent connected to Nova, Merchant Agent" data-direction={direction || 'idle'}>
      <NeuralConnection direction={direction} />
      <AgentNode name="Buyer Agent" identity="buyer" active={actor === 'buyer'} />
      <AgentNode name="Nova" description="Merchant Agent" identity="nova" active={actor === 'nova'} />
      {direction && <span className="communication-label">{direction === 'to-nova' ? 'Buyer → Nova' : 'Nova → Buyer'}</span>}
    </section>
  );
}
