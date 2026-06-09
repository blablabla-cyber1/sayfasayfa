'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Settings, Maximize, Minimize,
  Search, X, Bookmark, BookmarkCheck, ChevronUp, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Story, StoryContent, HighlightedWord,
  ReaderSettings, WordCategory, CATEGORY_COLORS,
} from '@/types';
import { SelectionMenu } from '@/components/reader/SelectionMenu';
import { WordPanel } from '@/components/reader/WordPanel';
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineSpacing: 1.85,
  darkMode: false,
  fontFamily: "'Crimson Pro', Georgia, serif",
};

function getSurroundingSentence(text: string, wordIndex: number, word: string): string {
  const before = text.substring(0, wordIndex);
  const after = text.substring(wordIndex + word.length);
  const sentStart = Math.max(
    before.lastIndexOf('.') + 1,
    before.lastIndexOf('\n') + 1,
    Math.max(0, wordIndex - 120)
  );
  const relEnd = after.search(/[.!?\n]/);
  const sentEnd = relEnd > -1
    ? Math.min(wordIndex + word.length + relEnd, wordIndex + word.length + 120)
    : Math.min(text.length, wordIndex + word.length + 120);
  return text.substring(sentStart, sentEnd).trim();
}

/* Search match highlight overlay */
function buildHighlightedHTML(
  raw: string,
  highlights: HighlightedWord[],
  searchTerm: string,
  currentMatchIndex: number,
  matchPositions: number[],
): string {
  // Split into paragraphs
  const paras = raw.split(/\n+/).filter(Boolean);

  return paras.map(para => {
    let html = para
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply vocabulary highlights
    highlights.forEach(w => {
      const color = CATEGORY_COLORS[w.category];
      const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(
        new RegExp(`(${escaped})`, 'g'),
        `<mark class="highlight-${w.category}" data-word-id="${w.id}" style="background-color:${color}22;border-bottom-color:${color}" onclick="window.__selectWord('${w.id}')">$1</mark>`
      );
    });

    // Apply search highlights
    if (searchTerm.trim().length >= 2) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(
        new RegExp(`(${escaped})`, 'gi'),
        '<mark class="search-match" style="background:#fbbf2488;border-radius:2px;padding:0 1px">$1</mark>'
      );
    }

    return `<p>${html}</p>`;
  }).join('');
}

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [story, setStory] = useState<Story | null>(null);
  const [content, setContent] = useState('');
  const [words, setWords] = useState<HighlightedWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<HighlightedWord | null>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number; position: number } | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Bookmark state
  const [bookmarks, setBookmarks] = useState<{ id: string; position: number; label: string | null }[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  /* ── Load settings ── */
  useEffect(() => {
    try {
      const s = localStorage.getItem('reader-settings');
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  /* ── Fetch story data ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const [
        { data: storyData },
        { data: contentData },
        { data: wordsData },
        { data: progressData },
        { data: bookmarkData },
      ] = await Promise.all([
        supabase.from('stories').select('*').eq('id', id).single(),
        supabase.from('story_content').select('*').eq('story_id', id).single(),
        supabase.from('highlighted_words').select('*, stories(title)').eq('story_id', id).eq('user_id', user.id),
        supabase.from('reading_progress').select('*').eq('story_id', id).eq('user_id', user.id).single(),
        supabase.from('bookmarks').select('id, position, label').eq('story_id', id).eq('user_id', user.id),
      ]);

      if (!storyData) { router.push('/library'); return; }

      setStory(storyData as Story);
      setContent((contentData as StoryContent)?.content || '');
      setWords((wordsData as HighlightedWord[]) || []);
      setBookmarks((bookmarkData as { id: string; position: number; label: string | null }[]) || []);
      if (progressData) setProgress(progressData.progress_percent ?? 0);

      // Restore scroll
      if (progressData?.scroll_position && contentRef.current) {
        setTimeout(() => {
          const el = contentRef.current;
          if (el) el.scrollTop = progressData.scroll_position * (el.scrollHeight - el.clientHeight);
        }, 150);
      }

      // Log session
      await supabase.from('analytics').insert({
        user_id: user.id, story_id: id, event_type: 'read_session',
      });

      setLoading(false);
    })();
  }, [id, router]);

  /* ── Scroll handler ── */
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const pct = Math.min((el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1)) * 100, 100);
    setProgress(pct);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('reading_progress').upsert({
        user_id: user.id,
        story_id: id,
        scroll_position: el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1),
        progress_percent: pct,
        is_completed: pct > 95,
        last_read_at: new Date().toISOString(),
      }, { onConflict: 'user_id,story_id' });
    }, 2000);
  }, [id]);

  /* ── Text selection ── */
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setSelection(null); return; }
    const text = sel.toString().trim();
    if (!text || text.length < 1 || text.length > 120) { setSelection(null); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const pos = content.toLowerCase().indexOf(text.toLowerCase());

    setSelection({ text, x: rect.left + rect.width / 2 - 75, y: rect.top, position: pos });
  }, [content]);

  /* ── Save highlight ── */
  const handleHighlight = useCallback(async (category: WordCategory) => {
    if (!selection) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sentence = getSurroundingSentence(content, selection.position, selection.text);
    const { data } = await supabase.from('highlighted_words').insert({
      user_id: user.id,
      story_id: id,
      word: selection.text,
      sentence,
      position: selection.position,
      category,
    }).select().single();

    if (data) setWords(prev => [...prev, data as HighlightedWord]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection, content, id]);

  /* ── Add bookmark at current scroll ── */
  const handleAddBookmark = useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    const pos = el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    const label = prompt('Bookmark label (optional):') || null;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('bookmarks').insert({
      user_id: user.id, story_id: id, position: pos, label,
    }).select('id, position, label').single();

    if (data) setBookmarks(prev => [...prev, data as { id: string; position: number; label: string | null }]);
  }, [id]);

  const handleGoToBookmark = (pos: number) => {
    const el = contentRef.current;
    if (!el) return;
    el.scrollTop = pos * (el.scrollHeight - el.clientHeight);
    setShowBookmarks(false);
  };

  const handleDeleteBookmark = async (bmId: string) => {
    const supabase = createClient();
    await supabase.from('bookmarks').delete().eq('id', bmId);
    setBookmarks(prev => prev.filter(b => b.id !== bmId));
  };

  /* ── Search ── */
  const handleSearchNav = useCallback((dir: 'next' | 'prev') => {
    const el = contentRef.current;
    if (!el) return;
    const marks = el.querySelectorAll<HTMLElement>('.search-match');
    if (!marks.length) return;
    const next = dir === 'next'
      ? (currentMatch + 1) % marks.length
      : (currentMatch - 1 + marks.length) % marks.length;
    setCurrentMatch(next);
    marks.forEach((m, i) => {
      m.style.background = i === next ? '#f59e0b88' : '#fbbf2488';
    });
    marks[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatch]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setMatchCount(0); return; }
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = content.match(regex);
    setMatchCount(matches?.length || 0);
    setCurrentMatch(0);
  }, [searchQuery, content]);

  /* ── Keyboard shortcuts ── */
  useKeyboardShortcuts({
    'ctrl+f': () => { setShowSearch(s => !s); setTimeout(() => searchInputRef.current?.focus(), 50); },
    'escape': () => { setShowSearch(false); setShowSettings(false); setShowBookmarks(false); setSelection(null); },
    'ctrl+b': handleAddBookmark,
    'f': () => setFullscreen(f => !f),
    'arrowright': () => handleSearchNav('next'),
    'arrowleft': () => handleSearchNav('prev'),
  });

  /* ── Word click handler ── */
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__selectWord = (wordId: string) => {
      const w = words.find(x => x.id === wordId);
      if (w) setSelectedWord(w);
    };
  }, [words]);

  /* ── Rendered content ── */
  const renderedHTML = buildHighlightedHTML(content, words, searchQuery, currentMatch, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: 'var(--reader-bg)' }}>
        <div className="w-10 h-10 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading story…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--reader-bg)' }}
    >
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-color)]">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto w-full">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/library"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1
                className="text-sm font-semibold text-[var(--text-primary)] truncate leading-none"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                {story?.title}
              </h1>
              {story?.author && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{story.author}</p>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            <span className="text-xs text-[var(--text-muted)] mr-2 hidden sm:block">
              {Math.round(progress)}%
            </span>

            {/* Search */}
            <button
              onClick={() => { setShowSearch(s => !s); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              title="Search (Ctrl+F)"
            >
              <Search size={17} />
            </button>

            {/* Bookmarks */}
            <div className="relative">
              <button
                onClick={() => setShowBookmarks(b => !b)}
                className={`p-1.5 rounded-lg transition-colors ${showBookmarks ? 'bg-[var(--accent-warm)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                title="Bookmarks (Ctrl+B to add)"
              >
                {bookmarks.length > 0 ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              </button>

              {showBookmarks && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Bookmarks</span>
                    <button
                      onClick={handleAddBookmark}
                      className="text-xs bg-[var(--accent-primary)] text-white px-2.5 py-1 rounded-lg hover:opacity-90"
                    >
                      + Add here
                    </button>
                  </div>
                  {bookmarks.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">No bookmarks yet.<br />
                      <span className="text-xs">Press Ctrl+B to add one</span>
                    </p>
                  ) : (
                    <ul className="py-1 max-h-56 overflow-y-auto">
                      {bookmarks.map(bm => (
                        <li key={bm.id} className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-secondary)] group">
                          <button
                            className="flex-1 text-left text-sm text-[var(--text-primary)]"
                            onClick={() => handleGoToBookmark(bm.position)}
                          >
                            {bm.label || `Position ${Math.round(bm.position * 100)}%`}
                          </button>
                          <button
                            onClick={() => handleDeleteBookmark(bm.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                title="Reading settings"
              >
                <Settings size={17} />
              </button>
              {showSettings && (
                <ReaderSettingsPanel
                  settings={settings}
                  onChange={setSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              title="Toggle fullscreen (F)"
            >
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="border-t border-[var(--border-color)] px-4 py-2.5 flex items-center gap-3 animate-fade-in">
            <Search size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in story…"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
            {searchQuery && (
              <>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : 'No results'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleSearchNav('prev')} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronUp size={15} /></button>
                  <button onClick={() => handleSearchNav('next')} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronDown size={15} /></button>
                </div>
                <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={15} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Reader body ── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
      >
        <div
          className={`mx-auto px-6 py-12 transition-all ${fullscreen ? 'max-w-xl' : 'max-w-2xl'}`}
        >
          {/* Vocab legend hint */}
          {words.length === 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-8 p-3 bg-[var(--bg-secondary)] rounded-xl text-xs text-[var(--text-muted)]">
              <span>Select any word to save to vocabulary →</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#c7893c] inline-block" />Forgot</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#d55e27] inline-block" />Unknown</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#327874] inline-block" />Note</span>
              </div>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="mb-8 text-right">
            <span className="text-xs text-[var(--text-muted)]">
              <kbd className="font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-xs mr-1">Ctrl+F</kbd> search
              <kbd className="font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-xs mx-1">Ctrl+B</kbd> bookmark
              <kbd className="font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-xs ml-1">F</kbd> focus
            </span>
          </div>

          {/* Story content */}
          {content ? (
            <div
              className="reader-content"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineSpacing,
                fontFamily: settings.fontFamily,
              }}
              dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-[var(--text-muted)] italic">No content available for this story.</p>
              <p className="text-sm text-[var(--text-muted)] mt-2">Edit the story to add content.</p>
            </div>
          )}

          {/* End of story */}
          {progress > 95 && content && (
            <div className="mt-16 pt-8 border-t border-[var(--border-color)] text-center animate-fade-in">
              <p className="text-2xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>✦ Son ✦</p>
              <p className="text-sm text-[var(--text-muted)] mb-6">You've finished this story!</p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/vocabulary"
                  className="text-sm text-[var(--accent-primary)] border border-[var(--accent-primary)] px-4 py-2 rounded-lg hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                >
                  Review vocabulary
                </Link>
                <Link
                  href="/library"
                  className="text-sm bg-[var(--accent-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Back to library
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Selection context menu ── */}
      {selection && (
        <SelectionMenu
          x={selection.x}
          y={selection.y}
          onSelect={handleHighlight}
          onClose={() => setSelection(null)}
        />
      )}

      {/* ── Word detail panel ── */}
      {selectedWord && (
        <WordPanel
          word={selectedWord}
          storyTitle={story?.title || ''}
          onClose={() => setSelectedWord(null)}
          onUpdate={w => setWords(prev => prev.map(x => x.id === w.id ? w : x))}
          onDelete={wid => { setWords(prev => prev.filter(x => x.id !== wid)); setSelectedWord(null); }}
        />
      )}
    </div>
  );
}
