'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Sun, Moon, Menu, X, Zap, Trophy, Flame } from 'lucide-react';
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

const S = {
  sidebarBg:   '#1e1b4b',
  sidebarItem: '#2d2a5e',
  sidebarText: '#c4c2e8',
  activeBg:    'linear-gradient(135deg, #6366f1, #8b5cf6)',
  mainBg:      '#f0f4ff',
  mainBgDark:  '#0f0e1a',
  cardBg:      '#ffffff',
  cardBgDark:  '#1e1c35',
  border:      '#dde1f5',
  borderDark:  '#2e2b50',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [dark, setDark]             = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const { stats, xpPercent, justLeveledUp } = useGameStats();
  const { play } = useSound();

  useEffect(() => {
    const t = localStorage.getItem('sayfasayfa-theme') || 'light';
    setDark(t === 'dark');
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    localStorage.setItem('sayfasayfa-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    setDark(!dark);
    play('click');
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  useKeyboardShortcuts({ '?': () => setHelpOpen(h => !h) });

  const SidebarContent = ({ mobile }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/library" onClick={() => { setMobileOpen(false); play('click'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 15, lineHeight: 1 }}>SayfaSayfa</div>
            <div style={{ color: S.sidebarText, fontSize: 11, marginTop: 3 }}>Turkish Reader</div>
          </div>
        </Link>
        {/* X button — only on mobile sidebar */}
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4 }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* XP bar */}
      <div style={{ margin: '0 12px 12px', padding: 12, borderRadius: 16, background: S.sidebarItem }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} /> Level {stats.level}
          </span>
          <span style={{ color: S.sidebarText, fontSize: 11 }}>{stats.xp % 100}/100 XP</span>
        </div>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpPercent}%`, background: 'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius: 4, transition: 'width 0.6s', boxShadow: '0 0 8px #f59e0b88' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><Flame size={11} /> {stats.currentStreak} streak</span>
          <span style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><Trophy size={11} /> {stats.wordsLearned} learned</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        <p style={{ color: S.sidebarText, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6, opacity: 0.5 }}>Menu</p>
        {NAV_ITEMS.map(({ href, label, emoji }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => { setMobileOpen(false); play('click'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 14, marginBottom: 3, textDecoration: 'none', fontWeight: 700, fontSize: 14, background: active ? S.activeBg : 'transparent', color: active ? 'white' : S.sidebarText, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = S.sidebarItem; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span>{label}</span>
              {active && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'white', opacity: 0.8 }} />}
            </Link>
          );
        })}

        {/* Highlights legend */}
        <div style={{ padding: '14px 10px 0' }}>
          <p style={{ color: S.sidebarText, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, opacity: 0.5 }}>Highlights</p>
          {[
            { color: '#f59e0b', label: 'Known but forgot' },
            { color: '#ef4444', label: 'Unknown' },
            { color: '#10b981', label: 'Personal note' },
          ].map(c => (
            <div key={c.color} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}88`, flexShrink: 0 }} />
              <span style={{ color: S.sidebarText, fontSize: 12 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom buttons */}
      <div style={{ padding: '8px 8px 16px' }}>
        {[
          { label: dark ? 'Light Mode' : 'Dark Mode', icon: dark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#93c5fd" />, onClick: toggleTheme, hoverBg: S.sidebarItem, hoverColor: S.sidebarText },
          { label: 'Sign Out', icon: <LogOut size={16} />, onClick: signOut, hoverBg: 'rgba(239,68,68,0.15)', hoverColor: '#f87171' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.onClick}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'none', border: 'none', cursor: 'pointer', color: S.sidebarText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
            onMouseEnter={e => { (e.currentTarget.style.background = btn.hoverBg); (e.currentTarget.style.color = btn.hoverColor); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = S.sidebarText); }}
          >
            {btn.icon}<span>{btn.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: dark ? S.mainBgDark : S.mainBg }}>

      {/* ── DESKTOP sidebar — no X button ── */}
      {!isMobile && (
        <aside style={{ width: 240, minWidth: 240, flexShrink: 0, background: S.sidebarBg, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
          <SidebarContent mobile={false} />
        </aside>
      )}

      {/* ── MOBILE sidebar overlay — with X button ── */}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, background: S.sidebarBg, display: 'flex', flexDirection: 'column', zIndex: 50, overflowY: 'auto' }}>
            <SidebarContent mobile={true} />
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: dark ? S.cardBgDark : S.cardBg, borderBottom: `1px solid ${dark ? S.borderDark : S.border}`, flexShrink: 0 }}>
            <button onClick={() => { setMobileOpen(true); play('click'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#a8a5d0' : '#4c4980', padding: 4 }}>
              <Menu size={22} />
            </button>
            <span style={{ fontWeight: 900, fontSize: 16, color: dark ? '#e8e6ff' : '#1e1b4b' }}>SayfaSayfa 📚</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>Lv.{stats.level}</span>
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>

      <LevelUpBanner level={stats.level} visible={justLeveledUp} />
      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
