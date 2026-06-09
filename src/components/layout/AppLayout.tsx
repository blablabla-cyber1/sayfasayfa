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
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/library',    icon: Library,    label: 'Library',    emoji: '📚' },
  { href: '/vocabulary', icon: BookMarked, label: 'Vocabulary', emoji: '🔤' },
  { href: '/flashcards', icon: CreditCard, label: 'Flashcards', emoji: '🃏' },
  { href: '/practice',   icon: PenTool,    label: 'Practice',   emoji: '🧠' },
  { href: '/analytics',  icon: BarChart2,  label: 'Analytics',  emoji: '📊' },
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed lg:sticky lg:top-0 z-20 flex flex-col h-screen w-64 transition-transform duration-300 flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            href="/library"
            className="flex items-center gap-3"
            onClick={() => { setSidebarOpen(false); play('click'); }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-black text-base leading-none">SayfaSayfa</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-sidebar)' }}>Turkish Reader</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* XP / Level bar */}
        <div className="mx-4 mb-4 p-3 rounded-2xl" style={{ background: 'var(--bg-sidebar-item)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">Level {stats.level}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-sidebar)' }}>
              {stats.xp % 100}/100 XP
            </span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Flame size={12} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">{stats.currentStreak} streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={12} className="text-purple-400" />
              <span className="text-xs font-bold text-purple-400">{stats.wordsLearned} learned</span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}>
            Menu
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label, emoji }) => {
              const isActive = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => { setSidebarOpen(false); play('click'); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-150',
                      isActive
                        ? 'text-white shadow-lg'
                        : 'hover:text-white'
                    )}
                    style={isActive
                      ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }
                      : { color: 'var(--text-sidebar)', background: 'transparent' }
                    }
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sidebar-item)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span className="text-lg">{emoji}</span>
                    <span>{label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-white opacity-80" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Highlight color legend */}
          <div className="mt-5 px-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}>
              Highlights
            </p>
            <div className="space-y-2">
              {[
                { color: '#f59e0b', label: 'Known but forgot' },
                { color: '#ef4444', label: 'Unknown' },
                { color: '#10b981', label: 'Personal note' },
              ].map(c => (
                <div key={c.color} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}88` }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-sidebar)' }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ color: 'var(--text-sidebar)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-item)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-400" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ color: 'var(--text-sidebar)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(239,68,68,0.15)'); (e.currentTarget.style.color = '#ef4444'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-sidebar)'); }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => { setSidebarOpen(true); play('click'); }}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={22} />
          </button>
          <span className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            SayfaSayfa 📚
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Zap size={14} className="text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">Lv.{stats.level}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <LevelUpBanner level={stats.level} visible={justLeveledUp} />
      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
