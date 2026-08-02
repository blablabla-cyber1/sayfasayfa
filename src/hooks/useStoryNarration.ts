'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface NarrationVoice {
  voice: SpeechSynthesisVoice;
  label: string;
}

type PlayState = 'idle' | 'playing' | 'paused';

function splitIntoSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .flatMap(paragraph =>
      paragraph
        .split(/(?<=[.!?…])\s+/)
        .map(s => s.trim())
        .filter(Boolean)
    );
}

export function useStoryNarration(content: string) {
  const [sentences] = useState(() => splitIntoSentences(content));
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<NarrationVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);

  const indexRef = useRef(0);
  const rateRef  = useRef(1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const stoppedRef = useRef(false);

  // Load available Turkish voices (falls back to any voice if none found)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const turkish = all.filter(v => v.lang.toLowerCase().startsWith('tr'));
      const list = (turkish.length ? turkish : all).map(v => ({
        voice: v,
        label: `${v.name}${v.lang ? ` (${v.lang})` : ''}`,
      }));
      setVoices(list);
      if (list.length && !voiceRef.current) {
        voiceRef.current = list[0].voice;
        setSelectedVoiceURI(list[0].voice.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => { rateRef.current = rate; }, [rate]);

  const speakFrom = useCallback((index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (index >= sentences.length) {
      setPlayState('idle');
      setCurrentIndex(0);
      indexRef.current = 0;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.lang = 'tr-TR';
    utterance.rate = rateRef.current;
    utterance.pitch = 1;
    if (voiceRef.current) utterance.voice = voiceRef.current;

    utterance.onend = () => {
      if (stoppedRef.current) return;
      const next = index + 1;
      indexRef.current = next;
      setCurrentIndex(next);
      speakFrom(next);
    };

    utterance.onerror = () => {
      if (stoppedRef.current) return;
      const next = index + 1;
      indexRef.current = next;
      setCurrentIndex(next);
      speakFrom(next);
    };

    window.speechSynthesis.speak(utterance);
  }, [sentences]);

  const play = useCallback(() => {
    if (!sentences.length) return;
    stoppedRef.current = false;

    if (playState === 'paused') {
      window.speechSynthesis.resume();
      setPlayState('playing');
      return;
    }

    window.speechSynthesis.cancel();
    setPlayState('playing');
    speakFrom(indexRef.current);
  }, [playState, sentences.length, speakFrom]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setPlayState('paused');
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setPlayState('idle');
    setCurrentIndex(0);
    indexRef.current = 0;
  }, []);

  const setVoiceByURI = useCallback((uri: string) => {
    const found = voices.find(v => v.voice.voiceURI === uri);
    if (found) {
      voiceRef.current = found.voice;
      setSelectedVoiceURI(uri);
    }
  }, [voices]);

  // Stop narration if the component using this hook unmounts (e.g. leaving the page)
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    sentences,
    currentIndex,
    currentSentence: sentences[currentIndex] || '',
    playState,
    rate,
    setRate,
    voices,
    selectedVoiceURI,
    setVoiceByURI,
    play,
    pause,
    stop,
    progress: sentences.length ? Math.round((currentIndex / sentences.length) * 100) : 0,
  };
}
