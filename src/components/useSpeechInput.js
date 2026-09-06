import { useEffect, useRef, useState } from 'react';

export function useSpeechInput(onTranscript) {
  const recognition = useRef(null);
  const onText = useRef(onTranscript);
  onText.current = onTranscript;
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => () => recognition.current?.abort(), []);
  function toggle() {
    if (recognition.current) { recognition.current.stop(); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setNotice('Voice input is unavailable in this browser. Please type your request.'); return; }
    const session = new SpeechRecognition();
    session.lang = 'en-IN';
    session.interimResults = false;
    session.onstart = () => { setListening(true); setNotice('Listening… Speak your request, then press Send.'); };
    session.onresult = event => { onText.current(event.results[0][0].transcript); setNotice('Request transcribed. Press Send when ready.'); };
    session.onerror = () => setNotice('Voice input unavailable. Check microphone permissions or type your request.');
    session.onend = () => { recognition.current = null; setListening(false); };
    recognition.current = session;
    try { session.start(); } catch { recognition.current = null; setListening(false); setNotice('Microphone unavailable. Please type your request.'); }
  }
  return { listening, notice, toggle };
}
