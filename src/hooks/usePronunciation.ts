'use client';
import { useCallback } from 'react';

export function usePronunciation() {
  const speak = useCallback((word: string) => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // Try to find a Turkish voice
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v =>
      v.lang.startsWith('tr') || v.lang.includes('TR')
    );
    if (turkishVoice) utterance.voice = turkishVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
