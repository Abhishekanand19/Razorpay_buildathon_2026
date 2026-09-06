import React, { useEffect, useState } from 'react';
import { scenes } from '../scenarios/flowMachine.js';
import { persona1 } from '../scenarios/persona1.js';

// This module is only mounted in Vite development builds.
export function DevControls({ flow, dispatch, onReplay, onReset }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const shortcut = event => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') { event.preventDefault(); setOpen(value => !value); }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    window.__novaDemo = {
      reset: onReset,
      replay: (mode = flow.mode, query = persona1.query) => onReplay(mode, query),
      jump: state => dispatch({ type: 'JUMP', state }),
      snapshot: () => ({ ...flow, order: persona1.order }),
    };
    return () => { delete window.__novaDemo; };
  }, [flow, dispatch, onReplay, onReset]);
  if (!open) return null;
  return <aside className="dev-controls" aria-label="Development controls">
    <div><strong>Persona 1 · Development</strong><button onClick={() => setOpen(false)} aria-label="Close development controls">×</button></div>
    <select aria-label="Jump to scene" value={flow.state} onChange={event => dispatch({ type: 'JUMP', state: event.target.value })}>{Object.keys(scenes).map(state => <option key={state}>{state}</option>)}</select>
    <p>Jump pauses the scene for inspection.</p>
    <button onClick={onReset}>Reset Persona 1</button><button onClick={() => onReplay(flow.mode)}>Replay Persona 1</button>
    <button onClick={() => onReplay('approval')}>Test Ask for approval</button><button onClick={() => onReplay('full')}>Test Full access</button>
  </aside>;
}
