'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BookOpen, Library, BookMarked, BarChart2, CreditCard,
  PenTool, LogOut, Sun, Moon, Menu, X, ChevronRight, HelpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { KeyboardHelp } from '@/components/ui/KeyboardHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/library',    icon: Library,    label: 'Library'    },
  { href: '/vocabulary', icon: BookMarked, label: 'Vocabulary' },
  { href: '/flashcards', icon: CreditCard, label: 'Flashcards' },
  { href: '/practice',   icon: PenTool,    label: 'Practice'   },
  { href: '/analytics',  icon: BarChart2,  label: 'Analytics'  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('sayfasayfa-theme') || 'light';
    setDarkMode(theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = darkMode ? 'light' : 'dark';
    localStorage.setItem('sayfasayfa-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    setDarkMode(!darkMode);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  useKeyboardShortcuts({ '?': () => setHelpOpen(h => !h) });

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative z-30 flex flex-col h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-transform duration-300 flex-shrink-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--border-color)]">
          <Link href="/library" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center shadow-sm">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
              SayfaSayfa
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-2 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Navigate
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const isActive = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {isActive && <ChevronRight size={13} className="ml-auto opacity-60" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Vocabulary category legend */}
          <div className="mt-6 px-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Highlight Colors</p>
            <div className="space-y-1.5">
              {[
                { color: '#c7893c', label: 'Known but forgot' },
                { color: '#d55e27', label: 'Completely unknown' },
                { color: '#327874', label: 'Personal note' },
              ].map(c => (
                <div key={c.color} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-xs text-[var(--text-muted)]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-[var(--border-color)] space-y-0.5">
          <button
            onClick={() => setHelpOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            <HelpCircle size={16} />
            <span>Keyboard shortcuts</span>
            <kbd className="ml-auto font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">?</kbd>
          </button>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Menu size={20} />
          </button>
          <span
            className="text-base font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            SayfaSayfa
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
