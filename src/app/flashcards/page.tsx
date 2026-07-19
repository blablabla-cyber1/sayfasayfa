'use client';
export const runtime = 'edge';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RotateCcw, ArrowRight, CheckCircle, XCircle,
  MinusCircle, BookOpen, Pencil, X, Zap, Trophy, Flame, Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, WordCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';
import { useSound } from '@/hooks/useSound';
import { useGameStats } from '@/hooks/useGameStats';
import { usePronunciation } from '@/hooks/usePronunciation';
import { Confetti, LevelUpBanner, StreakPopup, FloatingXP } from '@/components/ui/GameEffects';

type Difficulty = 'easy' | 'medium' | 'hard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function EditMeaningModal({ word, onSave, onClose }: {
  word: HighlightedWord;
  onSave: (meaning: string, translation: string, note: string, imageUrl: string | null) => void;
  onClose: () => void;
}) {
  const [meaning, setMeaning]         = useState(word.user_meaning || '');
  const [translation, setTranslation] = useState(word.user_translation || '');
  const [note, setNote]               = useState(word.user_note || '');
  const [imagePreview, setImagePreview] = useState(word.user_image_url || '');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = 'w-full px-4 py-3 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all font-semibold';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setUploading(true);
    let imageUrl = word.user_image_url || null;

    if (imageFile) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ext = imageFile.name.split('.').pop();
        const path = `word-images/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('story-covers').upload(path, imageFile, { upsert: true });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('story-covers').getPublicUrl(path);
          imageUrl = publicUrl;
        }
      }
    }

    if (!imageFile && !imagePreview) imageUrl = null;

    setUploading(false);
    onSave(meaning, translation, note, imageUrl);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', width: '100%', maxWidth: 480, border: '2px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '2px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>✏️ Edit &ldquo;{word.word}&rdquo;</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Meaning */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📖 Meaning</label>
            <input className={inputCls} value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="Turkish meaning or definition…" />
          </div>

          {/* Translation */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>🌍 Translation</label>
            <input className={inputCls} value={translation} onChange={e => setTranslation(e.target.value)} placeholder="In your language…" />
          </div>

          {/* Note */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📝 Note</label>
            <textarea className={`${inputCls} resize-none`} value={note} onChange={e => setNote(e.target.value)} placeholder="Memory trick or usage notes…" rows={2} />
          </div>

          {/* Image upload */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>🖼️ Image (shown on card back)</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} style={{ display: 'none' }} />

            {imagePreview ? (
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '2px solid var(--border-color)' }}>
                <img src={imagePreview} alt="Card image" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, backdropFilter: 'blur(4px)' }}
                  >
                    Change
                  </button>
                  <button
                    onClick={() => { setImagePreview(''); setImageFile(null); }}
                    style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(239,68,68,0.8)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{ width: '100%', padding: '24px 16px', borderRadius: 16, border: '2px dashed var(--border-color)', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = '#6366f1'); (e.currentTarget.style.background = '#6366f108'); }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border-color)'); (e.currentTarget.style.background = 'none'); }}
              >
                <span style={{ fontSize: 28 }}>🖼️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Click to upload an image</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WebP — appears on card back</span>
              </button>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 14, fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: '2px solid var(--border-color)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              style={{ padding: '10px 24px', borderRadius: 14, fontWeight: 900, fontSize: 13, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'Uploading…' : 'Save ✓'}
            </button>
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
  const [shuffleMode, setShuffleMode] = useState(true);
  const [reviews, setReviews] = useState<Record<string, Difficulty>>({});
  const [finished, setFinished] = useState(false);
  const [editWord, setEditWord] = useState<HighlightedWord | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [floatingXP, setFloatingXP] = useState<{ id: number; amount: number; x: number; y: number } | null>(null);
  const [cardAnim, setCardAnim] = useState('');
  const [arabicTranslation, setArabicTranslation] = useState('');
  const [translating, setTranslating] = useState(false);

  const { play } = useSound();
  const { stats, recordCorrect, recordIncorrect, justLeveledUp, xpPercent } = useGameStats();
  const { speak } = usePronunciation();

  useEffect(() => {
    if (!started || !deck[current]) return;
    const word = deck[current].word;
    setArabicTranslation('');
    setTranslating(true);
    fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=tr|ar`)
      .then(r => r.json())
      .then(data => {
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          setArabicTranslation(data.responseData.translatedText);
        }
        setTranslating(false);
      })
      .catch(() => setTranslating(false));
  }, [current, started, deck]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('highlighted_words').select('*, stories(title)').eq('user_id', user.id);
      setWords((data as HighlightedWord[]) || []);
      setLoading(false);
    })();
  }, []);

  const toggleCat = (cat: WordCategory) => {
    play('click');
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const startStudy = () => {
    play('whoosh');
    let filtered = words.filter(w => selectedCats.has(w.category));
    if (shuffleMode) filtered = shuffle(filtered);
    setDeck(filtered);
    setCurrent(0);
    setFlipped(false);
    setReviews({});
    setFinished(false);
    setStarted(true);
  };

  const showXP = useCallback((amount: number) => {
    setFloatingXP({ id: Date.now(), amount, x: window.innerWidth / 2 - 30, y: window.innerHeight / 2 - 60 });
  }, []);

  const markDifficulty = async (diff: Difficulty, e: React.MouseEvent) => {
    const word = deck[current];
    setReviews(prev => ({ ...prev, [word.id]: diff }));

    if (diff === 'easy') {
      play('correct');
      recordCorrect();
      showXP(15);
      setCardAnim('animate-slide-up');
      if (stats.currentStreak > 0 && (stats.currentStreak + 1) % 3 === 0) {
        play('streak');
        setShowStreakPopup(true);
        setTimeout(() => setShowStreakPopup(false), 2000);
      }
    } else if (diff === 'medium') {
      play('flip');
      recordCorrect();
      showXP(8);
      setCardAnim('animate-fade-in');
    } else {
      play('incorrect');
      recordIncorrect();
      showXP(3);
      setCardAnim('animate-shake');
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('flashcard_reviews').insert({ user_id: user.id, word_id: word.id, difficulty: diff });
    }

    setTimeout(() => {
      setCardAnim('');
      if (current + 1 >= deck.length) {
        play('success');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
        setFinished(true);
      } else {
        setCurrent(c => c + 1);
        setFlipped(false);
      }
    }, 400);
  };

  const handleSaveMeaning = async (meaning: string, translation: string, note: string, imageUrl: string | null) => {
    if (!editWord) return;
    play('pop');
    const supabase = createClient();
    const { data } = await supabase.from('highlighted_words')
      .update({ user_meaning: meaning, user_translation: translation, user_note: note, user_image_url: imageUrl })
      .eq('id', editWord.id).select().single();
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
  const accuracy  = reviewStats.length ? Math.round(((easyCount + medCount) / reviewStats.length) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Setup screen ── */
  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float inline-block">🃏</div>
          <h1 className="text-4xl font-black text-[var(--text-primary)]">Flashcards</h1>
          <p className="text-[var(--text-muted)] font-semibold mt-1">{words.length} words in your collection</p>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {(['forgot', 'unknown', 'note'] as WordCategory[]).map(cat => {
            const count = words.filter(w => w.category === cat).length;
            const active = selectedCats.has(cat);
            const emoji = cat === 'forgot' ? '🟡' : cat === 'unknown' ? '🔴' : '🟢';
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`p-5 rounded-3xl border-3 text-left transition-all duration-200 ${active ? 'scale-105' : 'opacity-60 hover:opacity-80 hover:scale-102'}`}
                style={{
                  border: `3px solid ${active ? CATEGORY_COLORS[cat] : 'var(--border-color)'}`,
                  background: active ? `${CATEGORY_COLORS[cat]}15` : 'var(--bg-card)',
                  boxShadow: active ? `0 4px 20px ${CATEGORY_COLORS[cat]}33` : 'var(--shadow-card)',
                }}
              >
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="text-sm font-black text-[var(--text-primary)] mb-1">{CATEGORY_LABELS[cat]}</div>
                <div className="text-3xl font-black" style={{ color: CATEGORY_COLORS[cat] }}>{count}</div>
                <div className="text-xs font-bold text-[var(--text-muted)]">words</div>
              </button>
            );
          })}
        </div>

        {/* Shuffle toggle */}
        <div className="game-card p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-[var(--text-primary)]">🔀 Shuffle Mode</div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">Randomize card order</div>
          </div>
          <button
            onClick={() => { setShuffleMode(!shuffleMode); play('click'); }}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${shuffleMode ? 'shadow-lg' : ''}`}
            style={{ background: shuffleMode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--border-color)' }}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${shuffleMode ? 'translate-x-7' : ''}`} />
          </button>
        </div>

        {/* XP mini bar */}
        <div className="game-card p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Zap size={18} className="text-yellow-500" />
            <span className="font-black text-[var(--text-primary)]">Level {stats.level}</span>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, #f59e0b, #f97316)', boxShadow: '0 0 8px #f59e0b88' }} />
            </div>
          </div>
          <span className="text-xs font-bold text-yellow-500 flex-shrink-0">{stats.xp % 100}/100 XP</span>
        </div>

        <button
          onClick={startStudy}
          disabled={selectedCats.size === 0 || words.filter(w => selectedCats.has(w.category)).length === 0}
          className="w-full py-5 rounded-3xl text-white font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
        >
          <span>🚀 Start Studying</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-base">
            {words.filter(w => selectedCats.has(w.category)).length} cards
          </span>
        </button>
      </div>
    );
  }

  /* ── Finished screen ── */
  if (finished) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <Confetti active={showConfetti} />
        <div className="text-7xl mb-4 animate-bounce-in inline-block">
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '💪'}
        </div>
        <h2 className="text-3xl font-black text-[var(--text-primary)] mb-1">
          {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good job!' : 'Keep going!'}
        </h2>
        <p className="text-[var(--text-muted)] font-semibold mb-8">Session complete — {deck.length} cards reviewed</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="game-card p-4 text-center">
            <div className="text-3xl font-black text-green-500 mb-1">{easyCount}</div>
            <div className="text-xs font-bold text-green-500">✓ Easy</div>
          </div>
          <div className="game-card p-4 text-center">
            <div className="text-3xl font-black text-yellow-500 mb-1">{medCount}</div>
            <div className="text-xs font-bold text-yellow-500">~ Medium</div>
          </div>
          <div className="game-card p-4 text-center">
            <div className="text-3xl font-black text-red-500 mb-1">{hardCount}</div>
            <div className="text-xs font-bold text-red-500">✗ Hard</div>
          </div>
        </div>

        {/* Accuracy bar */}
        <div className="game-card p-5 mb-6">
          <div className="flex justify-between mb-3">
            <span className="font-black text-[var(--text-primary)]">Accuracy</span>
            <span className="font-black text-2xl" style={{ color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444' }}>
              {accuracy}%
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${accuracy}%`,
                background: accuracy >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : accuracy >= 60 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)',
              }}
            />
          </div>
        </div>

        {/* XP earned */}
        <div className="game-card p-4 mb-6 flex items-center justify-center gap-3">
          <Zap size={20} className="text-yellow-500" />
          <span className="font-black text-yellow-500 text-lg">+{(easyCount * 15) + (medCount * 8) + (hardCount * 3)} XP earned!</span>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStarted(false)} className="flex-1 py-4 rounded-2xl font-black text-sm border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all flex items-center justify-center gap-2">
            <RotateCcw size={16} /> New Session
          </button>
          <button onClick={startStudy} className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <RotateCcw size={16} /> Retry
          </button>
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
      <Confetti active={showConfetti} />
      <LevelUpBanner level={stats.level} visible={justLeveledUp} />
      <StreakPopup streak={stats.currentStreak} visible={showStreakPopup} />
      {floatingXP && (
        <FloatingXP
          amount={floatingXP.amount}
          x={floatingXP.x}
          y={floatingXP.y}
          onDone={() => setFloatingXP(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { setStarted(false); play('click'); }} className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
          ← Back
        </button>

        {/* Streak badge */}
        {stats.currentStreak >= 2 && (
          <div className="streak-badge">
            <Flame size={13} /> {stats.currentStreak}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-[var(--text-muted)]">{current + 1}/{deck.length}</span>
          <CategoryBadge category={card.category} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((current + 1) / deck.length) * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 8px rgba(99,102,241,0.5)',
          }}
        />
      </div>

      {/* Card */}
      <div
        className={`flashcard-container mb-5 cursor-pointer select-none ${cardAnim}`}
        style={{ height: 320 }}
        onClick={() => { setFlipped(!flipped); play('flip'); }}
      >
        <div className={`flashcard ${flipped ? 'flipped' : ''}`}>

          {/* Front */}
          <div className="flashcard-front rounded-3xl flex flex-col items-center justify-center p-8 border-2"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-5">🇹🇷 Turkish Word</p>
            <p className="text-6xl font-black text-center mb-4" style={{ color: CATEGORY_COLORS[card.category] }}>
              {card.word}
            </p>
            {/* 🔊 Speak button */}
            <button
              onClick={e => { e.stopPropagation(); speak(card.word); play('pop'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 20, border: `2px solid ${CATEGORY_COLORS[card.category]}55`, background: `${CATEGORY_COLORS[card.category]}15`, color: CATEGORY_COLORS[card.category], fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 8 }}
            >
              🔊 Listen
            </button>
            {card.sentence && (
              <p className="text-sm font-semibold text-[var(--text-muted)] italic text-center max-w-xs leading-relaxed">
                &ldquo;…{card.sentence}…&rdquo;
              </p>
            )}
            <p className="text-xs font-bold text-[var(--text-muted)] mt-4 opacity-50">👆 Tap to reveal</p>
          </div>

          {/* Back */}
          <div className="flashcard-back rounded-3xl flex flex-col p-6 border-2 overflow-y-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-primary)', boxShadow: '0 0 0 4px rgba(99,102,241,0.1)' }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 text-center">Answer</p>

            {hasBack ? (
              <div className="space-y-2.5 flex-1">
                <div className="text-center mb-1">
                  <span className="text-2xl font-black text-[var(--text-primary)]">{card.word}</span>
                </div>
                {/* User image — shown at bottom in square shape */}
{card.user_image_url && (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
    <div style={{
      width: 120, height: 120,
      borderRadius: 16,
      overflow: 'hidden',
      border: '2px solid var(--border-color)',
      flexShrink: 0,
    }}>
      <img
        src={card.user_image_url}
        alt={card.word}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  </div>
)}
                {/* Auto-fetched image — only shown if user hasn't uploaded their own */}
{!card.user_image_url && card.auto_image_url && (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
    <div style={{ width: 120, height: 120, borderRadius: 16, overflow: 'hidden', border: '2px solid var(--border-color)', flexShrink: 0 }}>
      <img
        src={card.auto_image_url}
        alt={card.english_meaning || card.word}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  </div>
)}

{/* English meaning */}
{card.english_meaning && (
  <div className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)' }}>
    <p className="text-xs font-black text-[var(--text-muted)] mb-1">🇬🇧 English</p>
    <p className="text-sm font-bold text-[var(--text-primary)]">{card.english_meaning}</p>
  </div>
)}

{/* Second example sentence */}
{card.example_sentence_2 && (
  <div className="rounded-2xl p-3" style={{ background: '#10b98112', border: '1.5px solid #10b98130' }}>
    <p className="text-xs font-black mb-1" style={{ color: '#10b981' }}>💬 Another example</p>
    <p className="text-sm italic text-[var(--text-secondary)]">&ldquo;{card.example_sentence_2}&rdquo;</p>
  </div>
)}
                {/* Arabic translation */}
                <div className="rounded-2xl p-3" style={{ background: 'linear-gradient(135deg,#6366f115,#8b5cf615)', border: '1.5px solid #6366f133' }}>
                  <p className="text-xs font-black mb-1" style={{ color: '#6366f1' }}>🌍 الترجمة بالعربية</p>
                  {translating ? (
                    <p className="text-sm text-[var(--text-muted)]" style={{ direction: 'rtl', textAlign: 'right' }}>جاري الترجمة…</p>
                  ) : arabicTranslation ? (
                    <p className="text-lg font-bold" style={{ direction: 'rtl', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>{arabicTranslation}</p>
                  ) : (
                    <p className="text-sm italic text-[var(--text-muted)]">—</p>
                  )}
                </div>
                {card.user_meaning && (
                  <div className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-black text-[var(--text-muted)] mb-1">📖 Meaning</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{card.user_meaning}</p>
                  </div>
                )}
                {card.user_translation && (
                  <div className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-black text-[var(--text-muted)] mb-1">🌍 Translation</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{card.user_translation}</p>
                  </div>
                )}
                {card.user_note && (
                  <div className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-black text-[var(--text-muted)] mb-1">📝 Note</p>
                    <p className="text-sm font-semibold italic text-[var(--text-secondary)]">{card.user_note}</p>
                  </div>
                )}
                {card.sentence && !card.user_meaning && (
                  <div className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-black text-[var(--text-muted)] mb-1">💬 Example</p>
                    <p className="text-sm italic text-[var(--text-secondary)]">…{card.sentence}…</p>
                  </div>
                )}
                {storyTitle && (
                  <Link href={`/read/${card.story_id}`} onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] hover:underline">
                    <BookOpen size={12} /> From &ldquo;{storyTitle}&rdquo;
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-[var(--text-primary)] mb-2">{card.word}</p>
                  <p className="text-sm font-bold text-[var(--text-muted)]">No meaning saved yet</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setEditWord(card); play('pop'); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-black text-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Pencil size={14} /> Add meaning now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit button */}
      <div className="flex justify-center mb-4">
        <button onClick={() => { setEditWord(card); play('click'); }}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors px-3 py-1.5 rounded-xl hover:bg-[var(--bg-secondary)]">
          <Pencil size={12} /> {hasBack ? 'Edit meaning' : 'Add meaning'}
        </button>
      </div>

      {/* Difficulty buttons */}
      {flipped ? (
        <div className="grid grid-cols-3 gap-3 animate-slide-up">
          <button onClick={e => markDifficulty('hard', e)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 border-2 border-red-200"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <XCircle size={24} />
            <span>Hard</span>
            <span className="text-xs opacity-70">+3 XP</span>
          </button>
          <button onClick={e => markDifficulty('medium', e)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 border-2 border-yellow-200"
            style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
            <MinusCircle size={24} />
            <span>Medium</span>
            <span className="text-xs opacity-70">+8 XP</span>
          </button>
          <button onClick={e => markDifficulty('easy', e)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 border-2 border-green-200"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <CheckCircle size={24} />
            <span>Easy</span>
            <span className="text-xs opacity-70">+15 XP</span>
          </button>
        </div>
      ) : (
        <p className="text-center text-sm font-bold text-[var(--text-muted)]">
          👆 Tap the card to reveal the answer
        </p>
      )}

      {editWord && (
        <EditMeaningModal word={editWord} onSave={handleSaveMeaning} onClose={() => setEditWord(null)} />
      )}
    </div>
  );
}
