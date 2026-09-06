import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

const options = [
  { value: 'approval', symbol: '✋', label: 'Ask for approval', description: 'Ask before making a payment' },
  { value: 'full', symbol: '⚠️', label: 'Full access', description: 'AI can pay on your behalf' },
];

export function AuthorizationSelector({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const items = useRef([]);
  const menuId = useId();
  const selected = options.find(option => option.value === value);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  useEffect(() => {
    if (!open) return;
    items.current[options.findIndex(option => option.value === value)]?.focus();
    const dismiss = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, value]);

  function select(option) {
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function handleKeys(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = items.current.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + 2) % 2;
      items.current[next]?.focus();
    }
  }

  return (
    <div className="authorization" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button className={`authorization-trigger ${open ? 'is-open' : ''}`} ref={trigger} type="button"
        disabled={disabled} title={disabled ? 'Authorization is fixed for this payment' : undefined}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)} onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        }}>
        <span className="permission-symbol" aria-hidden="true">{selected.symbol}</span>
        <span>{selected.label}</span>
        <Icon name="chevron" className="selector-chevron" />
      </button>
      {open && <div className="authorization-popover" id={menuId} role="menu" aria-label="Payment autonomy" onKeyDown={handleKeys}>
        {options.map((option, index) => <button key={option.value} ref={element => { items.current[index] = element; }}
          className={`authorization-option ${value === option.value ? 'is-selected' : ''}`}
          role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} type="button" onClick={() => select(option)}>
          <span className="permission-symbol" aria-hidden="true">{option.symbol}</span>
          <span className="option-copy"><span>{option.label}</span><small>{option.description}</small></span>
          {value === option.value && <Icon name="check" className="selected-check" />}
        </button>)}
      </div>}
    </div>
  );
}
