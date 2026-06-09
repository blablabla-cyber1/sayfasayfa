'use client';
import { useCallback } from 'react';

type SoundType =
  | 'correct'
  | 'incorrect'
  | 'flip'
  | 'levelUp'
  | 'click'
  | 'success'
  | 'streak'
  | 'whoosh'
  | 'pop';

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.3,
  startDelay = 0,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
  oscillator.type = type;
  gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
  oscillator.start(ctx.currentTime + startDelay);
  oscillator.stop(ctx.currentTime + startDelay + duration);
}

const SOUNDS: Record<SoundType, (ctx: AudioContext) => void> = {
  correct: (ctx) => {
    playTone(ctx, 523, 0.12, 'sine', 0.25);       // C5
    playTone(ctx, 659, 0.12, 'sine', 0.25, 0.1);  // E5
    playTone(ctx, 784, 0.2,  'sine', 0.25, 0.2);  // G5
  },
  incorrect: (ctx) => {
    playTone(ctx, 300, 0.1, 'sawtooth', 0.15);
    playTone(ctx, 250, 0.2, 'sawtooth', 0.15, 0.1);
  },
  flip: (ctx) => {
    playTone(ctx, 440, 0.08, 'sine', 0.1);
    playTone(ctx, 554, 0.08, 'sine', 0.1, 0.06);
  },
  levelUp: (ctx) => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(ctx, freq, 0.2, 'sine', 0.2, i * 0.12);
    });
  },
  click: (ctx) => {
    playTone(ctx, 800, 0.05, 'sine', 0.08);
  },
  success: (ctx) => {
    [523, 659, 784, 659, 784, 1047].forEach((freq, i) => {
      playTone(ctx, freq, 0.15, 'sine', 0.2, i * 0.08);
    });
  },
  streak: (ctx) => {
    playTone(ctx, 880, 0.1, 'sine', 0.2);
    playTone(ctx, 1047, 0.15, 'sine', 0.25, 0.08);
  },
  whoosh: (ctx) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  },
  pop: (ctx) => {
    playTone(ctx, 600, 0.06, 'sine', 0.15);
  },
};

let sharedCtx: AudioContext | null = null;

export function useSound() {
  const play = useCallback((type: SoundType) => {
    try {
      if (!sharedCtx) sharedCtx = createAudioContext();
      if (!sharedCtx) return;
      if (sharedCtx.state === 'suspended') sharedCtx.resume();
      SOUNDS[type](sharedCtx);
    } catch {
      // Silently fail — audio is enhancement only
    }
  }, []);

  return { play };
}
