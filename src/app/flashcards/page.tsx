'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RotateCcw, ArrowRight, CheckCircle, XCircle,
  MinusCircle, BookOpen, Pencil, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, WordCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';

type Difficulty = 'easy' | 'medium' | 'hard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Edit meaning modal ── */
function EditMeaningModal({
  word,
  onSave,
  onClose,
}: {
  word: HighlightedWord;
  onSave: (meaning: string, translation: string, note: string) => void;
  onClose: () => void;
}) {
  const [meaning, setMeaning] = useState(word.user_meaning || '');
  const [translation, setTranslation] = useState(word.user_translation || '');
  const [note, setNote] = useState(word.user_note || '');

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Add meaning for &ldquo;{word.word}&rdquo;
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Meaning (Turkish definition)</label>
            <input className={inputCls} value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="e.g. güzel — beautiful" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Translation (your language)</label>
            <input className={inputCls} value={translation} onChange={e => setTranslation(e.target.value)} placeholder="e.g. beautiful, pretty" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Personal note</label>
            <textarea className={`${inputCls} resize-none`} value={note} onChange={e => setNote(e.target.value)} placeholder="Memory trick, usage notes…" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(meaning, translation, note)}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const [words, setWords] = useState<HighlightedWord[]>([]);
  const [deck, setDeck] = useState<HighlightedWord[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<WordCategory>>(new Set(['forgot', 'unknown', 'note']));
  const [shuffleMode, setShuffleMode] = useState(false);
  const [reviews, setReviews] = useState<Record<string, Difficulty>>({});
  const [finished, setFinished] = useState(false);
  const [editWord, setEditWord] = useState<HighlightedWord | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('highlighted_words')
        .select('*, stories(title)')
        .eq('user_id', user.id);
      setWords((data as HighlightedWord[]) || []);
      setLoading(false);
    })();
  }, []);

  const toggleCat = (cat: WordCategory) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const startStudy = () => {
    let filtered = words.filter(w => selectedCats.has(w.category));
    if (shuffleMode) filtered = shuffle(filtered);
    setDeck(filtered);
    setCurrent(0);
    setFlipped(false);
    setReviews({});
    setFinished(false);
    setStarted(true);
  };

  const markDifficulty = async (diff: Difficulty) => {
    const word = deck[current];
    setReviews(prev => ({ ...prev, [word.id]: diff }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('flashcard_reviews').insert({
        user_id: user.id, word_id: word.id, difficulty: diff,
      });
    }
    if (current + 1 >= deck.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setFlipped(false);
    }
  };

  const handleSaveMeaning = async (meaning: string, translation: string, note: string) => {
    if (!editWord) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('highlighted_words')
      .update({ user_meaning: meaning, user_translation: translation, user_note: note })
      .eq('id', editWord.id)
      .select()
      .single();
    if (data) {
      const updated = data as HighlightedWord;
      setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
      setDeck(prev => prev.map(w => w.id === updated.id ? updated : w));
    }
    setEditWord(null);
  };

  const reviewStats = Object.values(reviews);
  const easyCount = reviewStats.filter(r => r === 'easy').length;
  const medCount  = reviewStats.filter(r => r === 'medium').length;
  const hardCount = reviewStats.filter(r => r === 'hard').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Setup screen ── */
  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Flashcards</h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">{words.length} words available</p>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">Choose categories to study</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['forgot', 'unknown', 'note'] as WordCategory[]).map(cat => {
              const count = words.filter(w => w.category === cat).length;
              const color = CATEGORY_COLORS[cat];
              const active = selectedCats.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-[var(--accent-primary)]' : 'border-[var(--border-color)] opacity-60'}`}
                >
                  <div className="w-3 h-3 rounded-full mb-2" style={{ background: color }} />
                  <div className="text-sm font-medium text-[var(--text-primary)]">{CATEGORY_LABELS[cat]}</div>
                  <div className="text-2xl font-bold mt-1" style={{ color, fontFamily: 'Playfair Display, serif' }}>{count}</div>
                  <div className="text-xs text-[var(--text-muted)]">words</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Shuffle mode</div>
            <div className="text-xs text-[var(--text-muted)]">Randomize card order</div>
          </div>
          <button
            onClick={() => setShuffleMode(!shuffleMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${shuffleMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-color)]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shuffleMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <Button
          onClick={startStudy}
          size="lg"
          className="w-full"
          disabled={selectedCats.size === 0 || words.filter(w => selectedCats.has(w.category)).length === 0}
        >
          Start studying {words.filter(w => selectedCats.has(w.category)).length} cards <ArrowRight size={18} />
        </Button>
      </div>
    );
  }

  /* ── Finished screen ── */
  if (finished) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-[var(--accent-primary)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Session complete!</h2>
        <p className="text-[var(--text-muted)] mb-8">You reviewed {deck.length} flashcards</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-green-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Playfair Display, serif' }}>{easyCount}</div>
            <div className="text-xs text-green-600 mt-0.5">Easy</div>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-600" style={{ fontFamily: 'Playfair Display, serif' }}>{medCount}</div>
            <div className="text-xs text-yellow-600 mt-0.5">Medium</div>
          </div>
          <div className="bg-red-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Playfair Display, serif' }}>{hardCount}</div>
            <div className="text-xs text-red-600 mt-0.5">Hard</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setStarted(false); }} className="flex-1">
            <RotateCcw size={16} /> New session
          </Button>
          <Button onClick={startStudy} className="flex-1">
            <RotateCcw size={16} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  /* ── Active card ── */
  const card = deck[current];
  const storyTitle = (card.stories as { title: string } | null)?.title;
  const hasBack = card.user_meaning || card.user_translation || card.user_note || card.sentence;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setStarted(false)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          ← Back
        </button>
        <div className="text-sm text-[var(--text-muted)]">{current + 1} / {deck.length}</div>
        <CategoryBadge category={card.category} />
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full mb-8">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
          style={{ width: `${((current + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className="flashcard-container mb-6 cursor-pointer select-none"
        style={{ height: 300 }}
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`flashcard ${flipped ? 'flipped' : ''}`}>

          {/* Front */}
          <div className="flashcard-front bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center p-8 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-6 uppercase tracking-wider font-semibold">Turkish Word</p>
            <p
              className="text-5xl font-bold text-center mb-6"
              style={{ color: CATEGORY_COLORS[card.category], fontFamily: 'Playfair Display, serif' }}
            >
              {card.word}
            </p>
            {card.sentence && (
              <p className="text-sm text-[var(--text-muted)] italic text-center max-w-sm">
                …{card.sentence}…
              </p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-6 opacity-60">Click to reveal answer</p>
          </div>

          {/* Back */}
          <div className="flashcard-back bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col p-6 shadow-sm overflow-y-auto">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-semibold text-center">Answer</p>

            {hasBack ? (
              <div className="space-y-3 flex-1">
                {/* Word */}
                <div className="text-center mb-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {card.word}
                  </span>
                </div>

                {/* Meaning */}
                {card.user_meaning && (
                  <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                    <p className="text-xs text-[var(--text-muted)] font-semibold mb-1">📖 Meaning</p>
                    <p className="text-sm text-[var(--text-primary)]">{card.user_meaning}</p>
                  </div>
                )}

                {/* Translation */}
                {card.user_translation && (
                  <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                    <p className="text-xs text-[var(--text-muted)] font-semibold mb-1">🌍 Translation</p>
                    <p className="text-sm text-[var(--text-primary)]">{card.user_translation}</p>
                  </div>
                )}

                {/* Note */}
                {card.user_note && (
                  <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                    <p className="text-xs text-[var(--text-muted)] font-semibold mb-1">📝 Note</p>
                    <p className="text-sm italic text-[var(--text-secondary)]">{card.user_note}</p>
                  </div>
                )}

                {/* Sentence */}
                {card.sentence && (
                  <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                    <p className="text-xs text-[var(--text-muted)] font-semibold mb-1">💬 Example</p>
                    <p className="text-sm text-[var(--text-secondary)] italic">…{card.sentence}…</p>
                  </div>
                )}

                {/* Story link */}
                {storyTitle && (
                  <Link
                    href={`/read/${card.story_id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <BookOpen size={12} /> Open in &ldquo;{storyTitle}&rdquo;
                  </Link>
                )}
              </div>
            ) : (
              /* No meaning saved yet */
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {card.word}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">No meaning saved yet</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setEditWord(card); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Pencil size={14} /> Add meaning now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/edit meaning button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setEditWord(card)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Pencil size={12} />
          {hasBack ? 'Edit meaning' : 'Add meaning'}
        </button>
      </div>

      {/* Difficulty buttons — only when flipped */}
      {flipped && (
        <div className="flex gap-3 animate-fade-in">
          <button
            onClick={() => markDifficulty('easy')}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-colors"
          >
            <CheckCircle size={20} className="text-green-500" />
            <span className="text-xs font-medium text-green-600">Easy</span>
          </button>
          <button
            onClick={() => markDifficulty('medium')}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl transition-colors"
          >
            <MinusCircle size={20} className="text-yellow-500" />
            <span className="text-xs font-medium text-yellow-600">Medium</span>
          </button>
          <button
            onClick={() => markDifficulty('hard')}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors"
          >
            <XCircle size={20} className="text-red-500" />
            <span className="text-xs font-medium text-red-600">Hard</span>
          </button>
        </div>
      )}

      {!flipped && (
        <p className="text-center text-xs text-[var(--text-muted)]">
          Flip the card first, then rate your recall
        </p>
      )}

      {/* Edit meaning modal */}
      {editWord && (
        <EditMeaningModal
          word={editWord}
          onSave={handleSaveMeaning}
          onClose={() => setEditWord(null)}
        />
      )}
    </div>
  );
}
