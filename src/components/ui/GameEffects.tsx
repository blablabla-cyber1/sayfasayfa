'use client';
import { useEffect, useState } from 'react';

/* ── Floating +XP indicator ── */
export function FloatingXP({ amount, x, y, onDone }: { amount: number; x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed pointer-events-none font-black text-lg z-[9999]"
      style={{
        left: x,
        top: y,
        color: '#f59e0b',
        textShadow: '0 2px 8px rgba(245,158,11,0.5)',
        animation: 'floatUp 0.9s ease forwards',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      +{amount} XP
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Confetti burst ── */
const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#f97316', '#06b6d4'];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const ps: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.x,
            top: -10,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/* ── Level up banner ── */
export function LevelUpBanner({ level, visible }: { level: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="level-up-banner">
      ⚡ Level Up! You&apos;re now Level {level}!
    </div>
  );
}

/* ── Streak popup ── */
export function StreakPopup({ streak, visible }: { streak: number; visible: boolean }) {
  if (!visible || streak < 3) return null;
  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] animate-bounce-in"
      style={{ fontFamily: 'Nunito, sans-serif' }}
    >
      <div className="streak-badge text-base px-5 py-2">
        🔥 {streak} streak!
      </div>
    </div>
  );
}
