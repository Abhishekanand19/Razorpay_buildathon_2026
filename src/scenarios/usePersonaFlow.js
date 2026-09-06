import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { flowReducer, initialFlow, scenes, lockedStates } from './flowMachine.js';
import { persona1 } from './persona1.js';
import { mockPayment } from '../services/mockPayment.js';
import { createBrowserSpeech } from '../speech/browserSpeech.js';
import { createPersona1Dialogue } from '../speech/persona1Dialogue.js';
import { transitionToNextState, waitFor } from '../motion/asyncMotion.js';

export function usePersonaFlow({ waveRef, stageRef, paymentAdapter = mockPayment, speechFactory = createBrowserSpeech }) {
  const [flow, rawDispatch] = useReducer(flowReducer, initialFlow);
  const [speech] = useState(() => speechFactory());
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return sessionStorage.getItem('nova-voice') !== 'off'; } catch { return true; }
  });
  const [narration, setNarration] = useState(null);
  const [speechFallback, setSpeechFallback] = useState(null);
  const [wavePhase, setWavePhase] = useState(null);
  const execution = useRef(null);
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const dispatch = useCallback(event => {
    if (['RESET', 'JUMP', 'DECLINE'].includes(event.type) || (event.type === 'START' && ['IDLE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'DECLINED'].includes(flowRef.current.state))) {
      execution.current?.abort(); speech.cancel(); setNarration(null); setWavePhase(null); setSpeechFallback(null);
    }
    rawDispatch(event);
  }, [speech]);
  const toggleVoice = useCallback(() => {
    const enabled = !voiceEnabled;
    speech.setEnabled(enabled);
    if (!enabled) setSpeechFallback(null);
    try { sessionStorage.setItem('nova-voice', enabled ? 'on' : 'off'); } catch { /* Storage is optional. */ }
    setVoiceEnabled(enabled);
  }, [speech, voiceEnabled]);
  useEffect(() => { speech.setEnabled(voiceEnabled); }, [voiceEnabled, speech]);
  useEffect(() => () => speech.cancel(), [speech]);
  const scene = scenes[flow.state];
  useEffect(() => {
    setNarration(null); setWavePhase(null);
    if (flow.paused || (!scene.next && !scene.message)) return;
    const controller = new AbortController();
    execution.current = controller;
    const signal = controller.signal;
    async function playScene() {
      if (scene.direction) {
        await transitionToNextState(stageRef.current, signal);
        await waveRef.current.run({ direction: scene.direction, signal, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, onPhase: phase => { if (!signal.aborted) setWavePhase(phase); } });
      } else if (scene.message) {
        // The basket builds first. Selection/acceptance animate alongside speech.
        if (scene.message === 'offer') await transitionToNextState(stageRef.current, signal);
        const message = createPersona1Dialogue(persona1, flow.conversationLanguage || 'en')[scene.message];
        setNarration({ ...message, speaking: false, fallback: null });
        await Promise.all([
          transitionToNextState(stageRef.current, signal),
          speech.speakAgentMessage({ ...message, signal,
            onActivity: speaking => { if (!signal.aborted) { setNarration(value => value ? { ...value, speaking } : null); if (speaking) setSpeechFallback(null); } },
            onFallback: fallback => { if (!signal.aborted) { setNarration(value => value ? { ...value, fallback } : null); if (fallback !== 'muted') setSpeechFallback(fallback); } },
          }),
        ]);
        if (!signal.aborted) setNarration(null);
      } else {
        await transitionToNextState(stageRef.current, signal);
        if (scene.hold) await waitFor(scene.hold, signal);
      }
      if (!signal.aborted && scene.next) dispatch({ type: 'SCENE_COMPLETED', from: flow.state, runId: flow.runId });
    }
    playScene().catch(error => {
      if (error.name !== 'AbortError' && !signal.aborted) {
        // Missing animation support must not block a valid transaction.
        setNarration(null); setWavePhase(null);
        dispatch({ type: 'SCENE_COMPLETED', from: flow.state, runId: flow.runId });
      }
    });
    return () => { controller.abort(); speech.cancel(); };
  }, [flow.state, flow.runId, flow.paused, flow.conversationLanguage, scene, speech, dispatch, stageRef, waveRef]);

  useEffect(() => {
    if (flow.state !== 'PAYMENT_PROCESSING' || flow.paused) return;
    const controller = new AbortController();
    paymentAdapter({ order: persona1.order, authorized: flow.approved || flow.mode === 'full', signal: controller.signal, delay: persona1.payment.delay })
      .then(result => dispatch({ type: 'PAYMENT_RESOLVED', runId: flow.runId, success: result.success }))
      .catch(error => { if (error.name !== 'AbortError') dispatch({ type: 'PAYMENT_RESOLVED', runId: flow.runId, success: false }); });
    return () => controller.abort();
  }, [flow.state, flow.runId, flow.paused, flow.approved, flow.mode, paymentAdapter]);

  return { flow, scene, dispatch, narration, speechFallback, wavePhase, voiceEnabled, toggleVoice, modeLocked: lockedStates.has(flow.state), busy: flow.state !== 'IDLE' && !['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'DECLINED'].includes(flow.state) };
}
