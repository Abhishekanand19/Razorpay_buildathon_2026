import React, { useLayoutEffect, useRef, useState } from 'react';
import { AgentStage } from './components/AgentStage.jsx';
import { PromptComposer } from './components/PromptComposer.jsx';
import { CommerceStage } from './components/CommerceStage.jsx';
import { DevControls } from './components/DevControls.jsx';
import { usePersonaFlow } from './scenarios/usePersonaFlow.js';
import { matchesPersona1, persona1 } from './scenarios/persona1.js';
import './commerce.css';

export function NourNovaPage() {
  const { flow, scene, dispatch, busy, modeLocked } = usePersonaFlow();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const root = useRef(null);
  const oldPositions = useRef(null);
  const executing = flow.state !== 'IDLE';
  // FLIP the two persistent elements only when entering/leaving execution mode.
  useLayoutEffect(() => {
    const elements = [...root.current.querySelectorAll('.agent-stage, .prompt-composer')];
    const next = elements.map(element => element.getBoundingClientRect());
    if (oldPositions.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element, index) => {
        const before = oldPositions.current[index], after = next[index];
        element.animate([{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` }, { transform: 'translate(0, 0)' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }
    oldPositions.current = next;
  }, [executing]);

  function submit(query) {
    if (!matchesPersona1(query)) { setError(`This demo supports: “${persona1.query}”.`); return; }
    setError('');
    dispatch({ type: 'START' });
  }
  function reset() { dispatch({ type: 'RESET' }); setText(''); setError(''); }
  function replay(mode) {
    dispatch({ type: 'RESET' }); dispatch({ type: 'SET_MODE', mode });
    setText(persona1.query); setError(''); dispatch({ type: 'START' });
  }
  return (
    <div ref={root} className={`nova-page ${executing ? 'is-executing' : ''}`}>
      <header className="brand" aria-label="Nova, Agentic Commerce">
        <span className="brand-symbol" aria-hidden="true"><i /><i /></span>
        <span className="wordmark">Nova</span>
        <span className="brand-divider" aria-hidden="true" />
        <span className="brand-descriptor">Agentic Commerce</span>
      </header>
      <main className="command-surface" aria-label="Agentic commerce">
        <AgentStage actor={scene.actor} direction={scene.direction} synchronized={flow.state === 'PAYMENT_SUCCESS'} />
        {executing && <CommerceStage scene={scene} flow={flow} dispatch={dispatch} />}
        <PromptComposer text={text} setText={value => { setText(value); setError(''); }} authorization={flow.mode}
          setAuthorization={mode => dispatch({ type: 'SET_MODE', mode })} onSubmit={submit} busy={busy} modeLocked={modeLocked} error={error} />
      </main>
      {import.meta.env.DEV && <DevControls flow={flow} dispatch={dispatch} onReset={reset} onReplay={replay} />}
    </div>
  );
}
