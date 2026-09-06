import React, { forwardRef, useId, useImperativeHandle, useRef } from 'react';
import { runCommunicationWave, threadPath } from '../motion/communicationWave.js';

export function AgentNode({ name, description, identity = 'buyer', active = false, speaking = false, receiving = false, className = '' }) {
  return <div className={`agent agent--${identity} ${active ? 'agent-active' : ''} ${speaking ? 'agent-speaking' : ''} ${receiving ? 'agent-receiving' : ''} ${className}`}>
    <div className="agent-orb" aria-hidden="true"><div className="orb-interior" /><div className="orb-ring" /><div className="orb-light" /></div>
    <div className="agent-label">{name}{speaking && <span className="speaker-indicator" aria-label="Speaking"><i /><i /><i /></span>}</div>
    {description && <div className="agent-description">{description}</div>}
  </div>;
}

export const NeuralConnection = forwardRef(function NeuralConnection({ direction }, ref) {
  const id = useId().replaceAll(':', '');
  const svg = useRef(null);
  useImperativeHandle(ref, () => ({ run: options => runCommunicationWave({ ...options, svg: svg.current }) }), []);
  return <svg ref={svg} className={`neural-connection ${direction || ''}`} viewBox="0 0 360 200" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-packet`} data-packet-gradient gradientUnits="userSpaceOnUse" cx="0" cy="100" r="70">
        <stop stopColor="currentColor" stopOpacity=".9" /><stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g className="thread-presence" stroke="rgba(190,195,205,.23)">
      {Array.from({ length: 6 }, (_, index) => <path data-wave-thread key={index} d={threadPath(index)} strokeWidth={index === 2 ? '1.1' : '.8'} />)}
    </g>
    <path data-wave-accent d={threadPath(2)} stroke={`url(#${id}-packet)`} strokeWidth="2.4" opacity="0" />
    <circle data-wave-packet cx="0" cy="100" r="2.5" fill="currentColor" opacity="0" />
  </svg>;
});

export function AgentStage({ actor, direction, waveRef, wavePhase, speaking, synchronized = false }) {
  const sender = direction === 'to-nova' ? 'buyer' : 'nova';
  const receiver = direction === 'to-nova' ? 'nova' : 'buyer';
  return <section className={`agent-stage ${synchronized ? 'agents-synchronized' : ''}`} aria-label="Buyer Agent connected to Nova, Merchant Agent" data-direction={direction || 'idle'} data-wave-phase={wavePhase || 'idle'}>
    <NeuralConnection ref={waveRef} direction={direction} />
    <AgentNode name="Buyer Agent" identity="buyer" active={actor === 'buyer' || (wavePhase === 'build' && sender === 'buyer')} speaking={speaking === 'buyer'} receiving={wavePhase === 'receive' && receiver === 'buyer'} />
    <AgentNode name="Nova" description="Merchant Agent" identity="nova" active={actor === 'nova' || (wavePhase === 'build' && sender === 'nova')} speaking={speaking === 'nova'} receiving={wavePhase === 'receive' && receiver === 'nova'} />
    {direction && <span className="communication-label">{direction === 'to-nova' ? 'Buyer → Nova' : 'Nova → Buyer'}</span>}
  </section>;
}
