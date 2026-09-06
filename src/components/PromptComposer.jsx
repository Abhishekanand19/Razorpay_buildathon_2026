import React, { useRef } from 'react';
import { AuthorizationSelector } from './AuthorizationSelector.jsx';
import { Icon } from './Icons.jsx';
import { useSpeechInput } from './useSpeechInput.js';

export function PromptComposer({ className = '', text, setText, authorization, setAuthorization, onSubmit, busy, modeLocked, error }) {
  const input = useRef(null);
  const speech = useSpeechInput(setText);

  function handleSubmit(event) { event.preventDefault(); if (!busy && text.trim()) onSubmit(text); }

  return (
    <form className={`prompt-composer ${className}`} onSubmit={handleSubmit} aria-label="Give your agents an instruction">
      {(error || speech.notice) && <p className="composer-notice" role="status">{error || speech.notice}</p>}
      <textarea ref={input} value={text} readOnly={busy} onChange={event => setText(event.target.value)}
        placeholder="SIR What you you like to Order" aria-label="Instruction for your agents" rows={3}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (text.trim()) event.currentTarget.form.requestSubmit();
          }
        }} />
      <div className="composer-controls">
        <div className="composer-left">
          <button type="button" className="icon-button add-button" aria-label="Add attachment (coming later)" title="Attachments will be available later" onClick={() => input.current?.focus()}><Icon name="plus" /></button>
          <AuthorizationSelector value={authorization} onChange={setAuthorization} disabled={modeLocked} />
        </div>
        <div className="composer-right">
          <button type="button" className={`icon-button microphone-button ${speech.listening ? 'is-listening' : ''}`} disabled={busy} aria-label={speech.listening ? 'Stop listening' : 'Speak your request'} aria-pressed={speech.listening} title="Speak your request" onClick={speech.toggle}><Icon name="microphone" /></button>
          <button type="submit" className="send-button" aria-label="Send instruction" disabled={!text.trim() || busy || speech.listening}><Icon name="arrow" /></button>
        </div>
      </div>
    </form>
  );
}
