'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, Shuffle, ChevronLeft, ChevronRight, CheckCircle, XCircle, MinusCircle, BookOpen, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, WordCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

type Difficulty = 'easy' | 'medium' | 'hard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('highlighted_words').select('*, stories(title)').eq('user_id', user.id);
      setWords((data as HighlightedWord[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleCat = (cat: WordCategory) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
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
        user_id: user.id,
        word_id: word.id,
        difficulty: diff,
      });
    }
    if (current + 1 >= deck.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setFlipped(false);
    }
  };

  const reviewStats = Object.values(reviews);
  const easyCount = reviewStats.filter(r => r === 'easy').length;
  const medCount = reviewStats.filter(r => r === 'medium').length;
  const hardCount = reviewStats.filter(r => r === 'hard').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Flashcards</h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">{words.length} words available</p>

        {/* Category selection */}
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

  const card = deck[current];
  const storyTitle = (card.stories as { title: string })?.title;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setStarted(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          ← Back
        </button>
        <div className="text-sm text-[var(--text-muted)]">
          {current + 1} / {deck.length}
        </div>
        <CategoryBadge category={card.category} />
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full mb-8">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
          style={{ width: `${((current + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="flashcard-container h-72 mb-6 cursor-pointer" onClick={() => setFlipped(!flipped)}>
        <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flashcard-front bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center p-8 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider">Turkish Word</p>
            <p
              className="text-5xl font-bold text-center"
              style={{ color: CATEGORY_COLORS[card.category], fontFamily: 'Playfair Display, serif' }}
            >
              {card.word}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-6">Click to reveal</p>
          </div>

          {/* Back */}
          <div className="flashcard-back bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col p-6 shadow-sm overflow-y-auto">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider text-center">Answer</p>
            <div className="space-y-3 flex-1">
              <div className="text-2xl font-bold text-center text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                {card.word}
              </div>
              {card.user_meaning && (
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Meaning</p>
                  <p className="text-sm text-[var(--text-primary)]">{card.user_meaning}</p>
                </div>
              )}
              {card.user_translation && (
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Translation</p>
                  <p className="text-sm text-[var(--text-primary)]">{card.user_translation}</p>
                </div>
              )}
              {card.user_note && (
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Note</p>
                  <p className="text-sm italic text-[var(--text-secondary)]">{card.user_note}</p>
                </div>
              )}
              {card.sentence && (
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Example sentence</p>
                  <p className="text-sm text-[var(--text-secondary)] italic">…{card.sentence}…</p>
                </div>
              )}
              {storyTitle && (
                <Link href={`/read/${card.story_id}`} className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline">
                  <BookOpen size={12} /> Open in {storyTitle}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty buttons - only show when flipped */}
      {flipped && (
        <div className="flex gap-3 animate-fade-in">
          <button onClick={() => markDifficulty('easy')} className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-colors group">
            <CheckCircle size={20} className="text-green-500" />
            <span className="text-xs font-medium text-green-600">Easy</span>
          </button>
          <button onClick={() => markDifficulty('medium')} className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl transition-colors">
            <MinusCircle size={20} className="text-yellow-500" />
            <span className="text-xs font-medium text-yellow-600">Medium</span>
          </button>
          <button onClick={() => markDifficulty('hard')} className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors">
            <XCircle size={20} className="text-red-500" />
            <span className="text-xs font-medium text-red-600">Hard</span>
          </button>
        </div>
      )}

      {!flipped && (
        <p className="text-center text-xs text-[var(--text-muted)] mt-2">Flip the card to rate your recall</p>
      )}
    </div>
  );
}
