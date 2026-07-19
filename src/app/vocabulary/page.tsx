'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { Search, Download, Star, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, WordCategory, CATEGORY_COLORS, CATEGORY_LABELS, Story } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { formatDate, exportToCSV, exportToAnki } from '@/lib/utils';

type SortKey = 'newest' | 'oldest' | 'alpha';
const CATEGORIES: WordCategory[] = ['forgot', 'unknown', 'note'];

export default function VocabularyPage() {
  const [words, setWords] = useState<HighlightedWord[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<WordCategory | 'all'>('all');
  const [filterStory, setFilterStory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [editWord, setEditWord] = useState<HighlightedWord | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: wordsData }, { data: storiesData }] = await Promise.all([
        supabase.from('highlighted_words').select('*, stories(title)').eq('user_id', user.id),
        supabase.from('stories').select('id, title').eq('user_id', user.id),
      ]);
      setWords((wordsData as HighlightedWord[]) || []);
      setStories((storiesData as Story[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = words
    .filter(w => {
      if (filterCategory !== 'all' && w.category !== filterCategory) return false;
      if (filterStory !== 'all' && w.story_id !== filterStory) return false;
      if (search && !w.word.toLowerCase().includes(search.toLowerCase()) &&
          !w.user_note?.toLowerCase().includes(search.toLowerCase()) &&
          !w.user_meaning?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.word.localeCompare(b.word, 'tr');
    });

  const stats = {
    total: words.length,
    unknown: words.filter(w => w.category === 'unknown').length,
    forgot: words.filter(w => w.category === 'forgot').length,
    note: words.filter(w => w.category === 'note').length,
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this word?')) return;
    const supabase = createClient();
    await supabase.from('highlighted_words').delete().eq('id', id);
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const handleFavorite = async (word: HighlightedWord) => {
    const supabase = createClient();
    const newVal = !word.is_favorite;
    await supabase.from('highlighted_words').update({ is_favorite: newVal }).eq('id', word.id);
    setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_favorite: newVal } : w));
  };

  const handleSaveEdit = async () => {
    if (!editWord) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('highlighted_words')
      .update({ user_meaning: editMeaning, user_note: editNote, updated_at: new Date().toISOString() })
      .eq('id', editWord.id).select().single();
    if (data) setWords(prev => prev.map(w => w.id === editWord.id ? data as HighlightedWord : w));
    setEditWord(null);
    setSaving(false);
  };

  const handleExportCSV = () => {
    exportToCSV(filtered.map(w => ({
      word: w.word,
      category: CATEGORY_LABELS[w.category],
      meaning: w.user_meaning || '',
      translation: w.user_translation || '',
      note: w.user_note || '',
      sentence: w.sentence || '',
      story: (w.stories as {title: string})?.title || '',
      added: formatDate(w.created_at),
    })), 'sayfasayfa-vocabulary.csv');
  };

  const handleExportAnki = () => {
    exportToAnki(filtered.map(w => ({
      word: w.word,
      meaning: `${w.user_meaning || ''} ${w.user_translation || ''}`.trim(),
      sentence: w.sentence || '',
    })), 'sayfasayfa-anki.txt');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Vocabulary</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Your saved Turkish words</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} /> CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportAnki}><Download size={14} /> Anki</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Words', value: stats.total, color: 'var(--accent-primary)' },
          { label: 'Unknown', value: stats.unknown, color: '#d55e27' },
          { label: 'Forgot Meaning', value: stats.forgot, color: '#c7893c' },
          { label: 'Notes', value: stats.note, color: '#327874' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Playfair Display, serif' }}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="min-w-[200px] flex-1 max-w-xs">
          <Input placeholder="Search words…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as WordCategory | 'all')}
          className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        <select
          value={filterStory}
          onChange={e => setFilterStory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Stories</option>
          {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      {/* Word list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-lg font-medium mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>No words found</p>
          <p className="text-sm">Start reading and highlight words to build your vocabulary</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(w => {
            const color = CATEGORY_COLORS[w.category];
            return (
              <div key={w.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex gap-4 animate-fade-in hover:border-[var(--border-focus)] transition-colors">
                <div className="w-1 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif', color }}>
                      {w.word}
                    </span>
                    <CategoryBadge category={w.category} />
                    {w.is_favorite && <Star size={13} className="fill-yellow-400 text-yellow-400" />}
                  </div>
                  {w.user_meaning && <p className="text-sm text-[var(--text-secondary)]">{w.user_meaning}</p>}
                  {w.sentence && <p className="text-xs text-[var(--text-muted)] italic mt-1 truncate">"…{w.sentence}…"</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                    <span>{(w.stories as {title: string})?.title}</span>
                    <span>{formatDate(w.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleFavorite(w)} className="p-1.5 text-[var(--text-muted)] hover:text-yellow-400 transition-colors rounded-lg hover:bg-[var(--bg-secondary)]">
                    {w.is_favorite ? <Star size={15} className="fill-yellow-400 text-yellow-400" /> : <Star size={15} />}
                  </button>
                  <button onClick={() => { setEditWord(w); setEditMeaning(w.user_meaning || ''); setEditNote(w.user_note || ''); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-secondary)]">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(w.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-[var(--bg-secondary)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Modal isOpen={!!editWord} onClose={() => setEditWord(null)} title={`Edit: ${editWord?.word}`} size="sm">
        <div className="p-5 space-y-4">
          <Textarea label="Meaning" value={editMeaning} onChange={e => setEditMeaning(e.target.value)} rows={2} placeholder="Meaning or definition…" />
          <Textarea label="Personal Note" value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} placeholder="Your notes…" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditWord(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
