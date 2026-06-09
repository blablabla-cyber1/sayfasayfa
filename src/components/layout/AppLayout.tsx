'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BookOpen, Library, BookMarked, BarChart2, CreditCard,
  PenTool, LogOut, Sun, Moon, Menu, X, Zap, Trophy, Flame,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useGameStats } from '@/hooks/useGameStats';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSound } from '@/hooks/useSound';
import { KeyboardHelp } from '@/components/ui/KeyboardHelp';
import { LevelUpBanner } from '@/components/ui/GameEffects';

const NAV_ITEMS = [
  { href: '/library',    label: 'Library',    emoji: '📚' },
  { href: '/vocabulary', label: 'Vocabulary', emoji: '🔤' },
  { href: '/flashcards', label: 'Flashcards', emoji: '🃏' },
  { href: '/practice',   label: 'Practice',   emoji: '🧠' },
  { href: '/analytics',  label: 'Analytics',  emoji: '📊' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { stats, xpPercent, justLeveledUp } = useGameStats();
  const { play } = useSound();

  useEffect(() => {
    const theme = localStorage.getItem('sayfasayfa-theme') || 'light';
    setDarkMode(theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = darkMode ? 'light' : 'dark';
    localStorage.setItem('sayfasayfa-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    setDarkMode(!darkMode);
    play('click');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  useKeyboardShortcuts({ '?': () => setHelpOpen(h => !h) });

  const sidebarBg = '#1e1b4b';
  const sidebarItemBg = '#2d2a5e';
  const sidebarText = '#c4c2e8';
  const activeBg = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: darkMode ? '#0f0e1a' : '#f0f4ff' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 240,
        background: sidebarBg,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        flexShrink: 0,
      }}
      className="lg:translate-x-0 lg:relative lg:z-auto"
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/library"
            onClick={() => { setSidebarOpen(false); play('click'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 15, lineHeight: 1 }}>SayfaSayfa</div>
              <div style={{ color: sidebarText, fontSize: 11, marginTop: 3 }}>Turkish Reader</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* XP Bar */}
        <div style={{ margin: '0 12px 12px', padding: '12px', borderRadius: 16, background: sidebarItemBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} color="#fbbf24" />
              <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800 }}>Level {stats.level}</span>
            </div>
            <span style={{ color: sidebarText, fontSize: 11 }}>{stats.xp % 100}/100 XP</span>
          </div>
          <div style={{ height: 7, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${xpPercent}%`,
              background: 'linear-gradient(90deg, #f59e0b, #f97316)',
              borderRadius: 4,
              transition: 'width 0.6s ease',
              boxShadow: '0 0 8px #f59e0b88',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={11} /> {stats.currentStreak} streak
            </span>
            <span style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trophy size={11} /> {stats.wordsLearned} learned
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
          <p style={{ color: sidebarText, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6, opacity: 0.5 }}>
            Menu
          </p>
          {NAV_ITEMS.map(({ href, label, emoji }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => { setSidebarOpen(false); play('click'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 14, marginBottom: 3,
                  textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? 'white' : sidebarText,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = sidebarItemBg; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <span>{label}</span>
                {isActive && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'white', opacity: 0.8 }} />}
              </Link>
            );
          })}

          {/* Highlight legend */}
          <div style={{ padding: '16px 10px 0' }}>
            <p style={{ color: sidebarText, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, opacity: 0.5 }}>
              Highlights
            </p>
            {[
              { color: '#f59e0b', label: 'Known but forgot' },
              { color: '#ef4444', label: 'Unknown' },
              { color: '#10b981', label: 'Personal note' },
            ].map(c => (
              <div key={c.color} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}88`, flexShrink: 0 }} />
                <span style={{ color: sidebarText, fontSize: 12 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div style={{ padding: '8px 8px 16px' }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 14, background: 'none',
              border: 'none', cursor: 'pointer', color: sidebarText,
              fontSize: 13, fontWeight: 700, marginBottom: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = sidebarItemBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {darkMode ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#93c5fd" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 14, background: 'none',
              border: 'none', cursor: 'pointer', color: sidebarText,
              fontSize: 13, fontWeight: 700,
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(239,68,68,0.15)'); (e.currentTarget.style.color = '#f87171'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = sidebarText); }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        marginLeft: 0,
      }}
      className="lg:ml-[240px]"
      >
        {/* Mobile top bar */}
        <div
          className="lg:hidden"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: darkMode ? '#1e1c35' : '#ffffff',
            borderBottom: `1px solid ${darkMode ? '#2e2b50' : '#dde1f5'}`,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { setSidebarOpen(true); play('click'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: darkMode ? '#a8a5d0' : '#4c4980', padding: 4 }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: 900, fontSize: 16, color: darkMode ? '#e8e6ff' : '#1e1b4b' }}>
            SayfaSayfa 📚
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#f59e0b" />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>Lv.{stats.level}</span>
          </div>
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <LevelUpBanner level={stats.level} visible={justLeveledUp} />
      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
