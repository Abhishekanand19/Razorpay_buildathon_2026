import React from 'react';

export function VoiceToggle({ enabled, onToggle, fallback }) {
  return <div className="voice-controls">
    <button className="voice-toggle" type="button" aria-label={enabled ? 'Turn voice off' : 'Turn voice on'} aria-pressed={enabled} onClick={onToggle}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {enabled ? <><path d="M17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14" /></> : <path d="m17 9 5 6m0-6-5 6" />}
      </svg><span>Voice {enabled ? 'On' : 'Off'}</span>
    </button>
    {enabled && fallback && fallback !== 'muted' && <span className="voice-fallback" role="status">Audio unavailable · subtitles on</span>}
  </div>;
}
