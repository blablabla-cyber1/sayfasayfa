'use client';
import { useState, useEffect, useCallback } from 'react';

export interface GameStats {
  xp: number;
  level: number;
  totalCorrect: number;
  totalCards: number;
  currentStreak: number;
  bestStreak: number;
  wordsLearned: number;
}

const XP_PER_LEVEL = 100;

function xpForLevel(level: number) {
  return level * XP_PER_LEVEL;
}

function levelFromXP(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

const DEFAULT: GameStats = {
  xp: 0, level: 1, totalCorrect: 0,
  totalCards: 0, currentStreak: 0,
  bestStreak: 0, wordsLearned: 0,
};

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(DEFAULT);
  const [justLeveledUp, setJustLeveledUp] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sayfasayfa-gamestats');
      if (saved) setStats(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (next: GameStats) => {
    setStats(next);
    try { localStorage.setItem('sayfasayfa-gamestats', JSON.stringify(next)); } catch {}
  };

  const addXP = useCallback((amount: number) => {
    setStats(prev => {
      const newXP = prev.xp + amount;
      const newLevel = levelFromXP(newXP);
      const leveledUp = newLevel > prev.level;
      if (leveledUp) {
        setJustLeveledUp(true);
        setTimeout(() => setJustLeveledUp(false), 3000);
      }
      const next = { ...prev, xp: newXP, level: newLevel };
      try { localStorage.setItem('sayfasayfa-gamestats', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const recordCorrect = useCallback(() => {
    setStats(prev => {
      const newStreak = prev.currentStreak + 1;
      const next = {
        ...prev,
        totalCorrect: prev.totalCorrect + 1,
        totalCards: prev.totalCards + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
      try { localStorage.setItem('sayfasayfa-gamestats', JSON.stringify(next)); } catch {}
      return next;
    });
    addXP(10);
  }, [addXP]);

  const recordIncorrect = useCallback(() => {
    setStats(prev => {
      const next = {
        ...prev,
        totalCards: prev.totalCards + 1,
        currentStreak: 0,
      };
      try { localStorage.setItem('sayfasayfa-gamestats', JSON.stringify(next)); } catch {}
      return next;
    });
    addXP(2); // small XP even for wrong answers
  }, [addXP]);

  const recordWordLearned = useCallback(() => {
    setStats(prev => {
      const next = { ...prev, wordsLearned: prev.wordsLearned + 1 };
      try { localStorage.setItem('sayfasayfa-gamestats', JSON.stringify(next)); } catch {}
      return next;
    });
    addXP(5);
  }, [addXP]);

  const xpInCurrentLevel = stats.xp % XP_PER_LEVEL;
  const xpPercent = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  return {
    stats, addXP, recordCorrect, recordIncorrect,
    recordWordLearned, justLeveledUp, xpPercent,
  };
}
