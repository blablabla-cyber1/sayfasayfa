'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Settings, Maximize, Minimize,
  Search, X, Bookmark, BookmarkCheck, ChevronUp, ChevronDown, Volume2,
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
import { usePronunciation } from '@/hooks/usePronunciation';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineSpacing: 1.85,
  darkMode: false,
  fontFamily: "'Crimson Pro', Georgia, serif",
};

function getSurroundingSentence(text: string, wordIndex: number, word: string): string {
  const before = text.substring(0, wordIndex);
  const after  = text.substring(wordIndex + word.length);
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

function buildHTML(
  raw: string,
  highlights: HighlightedWord[],
  searchTerm: string,
): string {
  const paras = raw.split(/\n+/).filter(Boolean);

  return paras.map(para => {
    let html = para
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply highlights — ALL saved words across ALL stories
    highlights.forEach(w => {
      const color   = CATEGORY_COLORS[w.category];
      const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // word boundary match, case-insensitive
      const regex   = new RegExp(`(${escaped})`, 'gi');
      html = html.replace(
        regex,
        `<mark class="highlight-${w.category}" data-word-id="${w.id}" data-word="${w.word}" ` +
        `style="background-color:${color}22;border-bottom:2px solid ${color};border-radius:3px;padding:0 2px;cursor:pointer;" ` +
        `onclick="window.__selectWord('${w.id}','${w.word.replace(/'/g, "\\'")}')"` +
        `>$1</mark>`
      );
    });

    // Search highlights
    if (searchTerm.trim().length >= 2) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(
        new RegExp(`(${escaped})`, 'gi'),
        '<mark style="background:#fbbf2488;border-radius:2px;padding:0 1px">$1</mark>'
      );
    }

    return `<p style="margin-bottom:1.5em">${html}</p>`;
  }).join('');
}

export default function ReadPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [story, setStory]           = useState<Story | null>(null);
  const [content, setContent]       = useState('');
  // ALL user's highlighted words (across all stories)
  const [allWords, setAllWords]     = useState<HighlightedWord[]>([]);
  // Words for THIS story (for the panel)
  const [storyWords, setStoryWords] = useState<HighlightedWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<HighlightedWord | null>(null);
  const [selection, setSelection]   = useState<{ text: string; x: number; y: number; position: number } | null>(null);
  const [settings, setSettings]     = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [loading, setLoading]       = useState(true);

  const [showSearch, setShowSearch]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [matchCount, setMatchCount]     = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const [bookmarks, setBookmarks]       = useState<{ id: string; position: number; label: string | null }[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const contentRef    = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout   = useRef<ReturnType<typeof setTimeout>>(null);

  const { speak } = usePronunciation();

  /* ── Load settings ── */
  useEffect(() => {
    try {
      const s = localStorage.getItem('reader-settings');
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  /* ── Fetch story + ALL user words ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const [
        { data: storyData },
        { data: contentData },
        { data: allWordsData },   // ALL words from ALL stories
        { data: progressData },
        { data: bookmarkData },
      ] = await Promise.all([
        supabase.from('stories').select('*').eq('id', id).single(),
        supabase.from('story_content').select('*').eq('story_id', id).single(),
        supabase.from('highlighted_words').select('*, stories(title)').eq('user_id', user.id),
        supabase.from('reading_progress').select('*').eq('story_id', id).eq('user_id', user.id).single(),
        supabase.from('bookmarks').select('id,position,label').eq('story_id', id).eq('user_id', user.id),
      ]);

      if (!storyData) { router.push('/library'); return; }

      setStory(storyData as Story);
      setContent((contentData as StoryContent)?.content || '');

      const words = (allWordsData as HighlightedWord[]) || [];
      setAllWords(words);
      setStoryWords(words.filter(w => w.story_id === id));
      setBookmarks((bookmarkData as { id: string; position: number; label: string | null }[]) || []);
      if (progressData) setProgress(progressData.progress_percent ?? 0);

      if (progressData?.scroll_position && contentRef.current) {
        setTimeout(() => {
          const el = contentRef.current;
          if (el) el.scrollTop = progressData.scroll_position * (el.scrollHeight - el.clientHeight);
        }, 150);
      }

      await supabase.from('analytics').insert({ user_id: user.id, story_id: id, event_type: 'read_session' });
      setLoading(false);
    })();
  }, [id, router]);

  /* ── Scroll / progress ── */
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
        user_id: user.id, story_id: id,
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
    const rect  = range.getBoundingClientRect();
    const pos   = content.toLowerCase().indexOf(text.toLowerCase());
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
      user_id: user.id, story_id: id,
      word: selection.text, sentence,
      position: selection.position, category,
    }).select('*, stories(title)').single();

    if (data) {
      const newWord = data as HighlightedWord;
      setAllWords(prev => [...prev, newWord]);
      setStoryWords(prev => [...prev, newWord]);
      // Auto-speak the word on highlight
      speak(selection.text);
    }
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection, content, id, speak]);

  /* ── Bookmarks ── */
  const handleAddBookmark = useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    const pos   = el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    const label = prompt('Bookmark label (optional):') || null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('bookmarks').insert({
      user_id: user.id, story_id: id, position: pos, label,
    }).select('id,position,label').single();
    if (data) setBookmarks(prev => [...prev, data as { id: string; position: number; label: string | null }]);
  }, [id]);

  const handleGoToBookmark = (pos: number) => {
    const el = contentRef.current;
    if (el) el.scrollTop = pos * (el.scrollHeight - el.clientHeight);
    setShowBookmarks(false);
  };

  const handleDeleteBookmark = async (bmId: string) => {
    await createClient().from('bookmarks').delete().eq('id', bmId);
    setBookmarks(prev => prev.filter(b => b.id !== bmId));
  };

  /* ── Search ── */
  const handleSearchNav = useCallback((dir: 'next' | 'prev') => {
    const el = contentRef.current;
    if (!el) return;
    const marks = el.querySelectorAll<HTMLElement>('.search-match, [style*="fbbf24"]');
    if (!marks.length) return;
    const next = dir === 'next'
      ? (currentMatch + 1) % marks.length
      : (currentMatch - 1 + marks.length) % marks.length;
    setCurrentMatch(next);
    marks[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatch]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setMatchCount(0); return; }
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = content.match(new RegExp(escaped, 'gi'));
    setMatchCount(matches?.length || 0);
    setCurrentMatch(0);
  }, [searchQuery, content]);

  /* ── Keyboard shortcuts ── */
  useKeyboardShortcuts({
    'ctrl+f': () => { setShowSearch(s => !s); setTimeout(() => searchInputRef.current?.focus(), 50); },
    'escape': () => { setShowSearch(false); setShowSettings(false); setShowBookmarks(false); setSelection(null); },
    'ctrl+b': handleAddBookmark,
    'f': () => setFullscreen(f => !f),
  });

  /* ── Word click handler (called from dangerouslySetInnerHTML) ── */
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__selectWord = (wordId: string, wordText: string) => {
      const w = allWords.find(x => x.id === wordId);
      if (w) {
        setSelectedWord(w);
        speak(wordText || w.word);
      }
    };
  }, [allWords, speak]);

  const renderedHTML = buildHTML(content, allWords, searchQuery);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, background: 'var(--reader-bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Loading story…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--reader-bg)' }}>

      {/* ── Top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>
        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--border-color)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.5s' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Link href="/library" style={{ display: 'flex', padding: 6, borderRadius: 8, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }}>
              <ArrowLeft size={18} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story?.title}</div>
              {story?.author && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{story.author}</div>}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginRight: 4 }}>{Math.round(progress)}%</span>

            {/* Search */}
            <button onClick={() => { setShowSearch(s => !s); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              style={{ padding: 6, borderRadius: 8, border: 'none', background: showSearch ? '#6366f1' : 'transparent', color: showSearch ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
              <Search size={17} />
            </button>

            {/* Bookmarks */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowBookmarks(b => !b)}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: showBookmarks ? '#f59e0b' : 'transparent', color: showBookmarks ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                {bookmarks.length > 0 ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              </button>
              {showBookmarks && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 260, background: 'var(--bg-card)', border: '2px solid var(--border-color)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Bookmarks</span>
                    <button onClick={handleAddBookmark} style={{ fontSize: 12, background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>+ Add</button>
                  </div>
                  {bookmarks.length === 0 ? (
                    <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No bookmarks yet</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0, maxHeight: 200, overflowY: 'auto' }}>
                      {bookmarks.map(bm => (
                        <li key={bm.id} style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                          <button onClick={() => handleGoToBookmark(bm.position)} style={{ flex: 1, textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                            {bm.label || `Position ${Math.round(bm.position * 100)}%`}
                          </button>
                          <button onClick={() => handleDeleteBookmark(bm.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Settings */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowSettings(s => !s)}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: showSettings ? '#6366f1' : 'transparent', color: showSettings ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                <Settings size={17} />
              </button>
              {showSettings && <ReaderSettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
            </div>

            {/* Fullscreen */}
            <button onClick={() => setFullscreen(f => !f)}
              style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in story…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}
            />
            {searchQuery && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : 'No results'}
                </span>
                <button onClick={() => handleSearchNav('prev')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><ChevronUp size={15} /></button>
                <button onClick={() => handleSearchNav('next')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><ChevronDown size={15} /></button>
                <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Reader body ── */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto' }} onScroll={handleScroll} onMouseUp={handleMouseUp}>
        <div style={{ maxWidth: fullscreen ? 620 : 720, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Hint bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 28, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            <span>🖱️ Select any word to save</span>
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              {[{ color: '#f59e0b', label: 'Forgot' }, { color: '#ef4444', label: 'Unknown' }, { color: '#10b981', label: 'Note' }].map(c => (
                <span key={c.color} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  {c.label}
                </span>
              ))}
            </div>
            <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>🔊 Click highlighted words to hear pronunciation</span>
          </div>

          {/* Content */}
          {content ? (
            <div
              style={{
                fontFamily: settings.fontFamily,
                fontSize: settings.fontSize,
                lineHeight: settings.lineSpacing,
                color: 'var(--reader-text)',
              }}
              dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontStyle: 'italic' }}>No content available for this story.</p>
            </div>
          )}

          {/* End of story */}
          {progress > 95 && content && (
            <div style={{ marginTop: 60, paddingTop: 32, borderTop: '2px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 8, fontWeight: 900 }}>✦ Son ✦</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, marginBottom: 24 }}>You&apos;ve finished this story! 🎉</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Link href="/vocabulary" style={{ fontSize: 14, color: '#6366f1', border: '2px solid #6366f1', padding: '10px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700 }}>Review vocabulary</Link>
                <Link href="/library" style={{ fontSize: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', padding: '10px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700 }}>Back to library</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Selection menu ── */}
      {selection && (
        <SelectionMenu x={selection.x} y={selection.y} onSelect={handleHighlight} onClose={() => setSelection(null)} />
      )}

      {/* ── Word panel ── */}
      {selectedWord && (
        <WordPanel
          word={selectedWord}
          storyTitle={story?.title || ''}
          onClose={() => setSelectedWord(null)}
          onUpdate={w => {
            setAllWords(prev => prev.map(x => x.id === w.id ? w : x));
            setStoryWords(prev => prev.map(x => x.id === w.id ? w : x));
          }}
          onDelete={wid => {
            setAllWords(prev => prev.filter(x => x.id !== wid));
            setStoryWords(prev => prev.filter(x => x.id !== wid));
            setSelectedWord(null);
          }}
        />
      )}
    </div>
  );
}
