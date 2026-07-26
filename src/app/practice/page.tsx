'use client';
export const runtime = 'edge';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowRight, Brain, RotateCcw, Eye, EyeOff, Lightbulb,
  AlignLeft, Target, Shuffle, Type, Sparkles, CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, PracticeMode, Story } from '@/types';
import { Button } from '@/components/ui/Button';
import { useSound } from '@/hooks/useSound';
import { useGameStats } from '@/hooks/useGameStats';
import { usePronunciation } from '@/hooks/usePronunciation';
import { StoryQuiz } from '@/components/practice/StoryQuiz';

/* ────────────────────────────────────────────────────────────
   Fuzzy matching — replaces plain right/wrong string equality.
   Uses Levenshtein distance so small typos, missing accents,
   or minor spelling slips don't get marked flatly "wrong".
──────────────────────────────────────────────────────────── */
type Grade = 'exact' | 'close' | 'off';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:"'()]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function gradeAnswer(typed: string, expected: string): Grade {
  const a = normalize(typed);
  const b = normalize(expected);
  if (!a) return 'off';
  if (a === b) return 'exact';
  const dist = levenshtein(a, b);
  const tolerance = Math.max(1, Math.floor(b.length * 0.22)); // ~22% of length allowed
  if (dist <= tolerance) return 'close';
  // also accept if one contains the other substantially (e.g. multi-word meanings)
  if (b.length > 4 && (a.includes(b) || b.includes(a))) return 'close';
  return 'off';
}

const GRADE_META: Record<Grade, { label: string; color: string; bg: string; icon: string }> = {
  exact: { label: 'Exact match!', color: '#10b981', bg: '#10b98115', icon: '✓' },
  close: { label: 'Close enough — accepted', color: '#f59e0b', bg: '#f59e0b15', icon: '≈' },
  off:   { label: 'Not quite', color: '#ef4444', bg: '#ef444415', icon: '✗' },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ────────────────────────────────────────────────────────────
   Fill in the Blank — with optional translation reveal
──────────────────────────────────────────────────────────── */
function FillBlankMode({
  word, onGrade,
}: { word: HighlightedWord; onGrade: (grade: Grade) => void }) {
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);

  const sentence = word.sentence || '';
  const escapedWord = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blank = sentence
    ? sentence.replace(new RegExp(escapedWord, 'gi'), '______')
    : '';

  const hasTranslation = !!(word.user_translation || word.user_meaning);

  const check = () => {
    if (!typed.trim() || revealed) return;
    const g = gradeAnswer(typed, word.word);
    setGrade(g);
    setRevealed(true);
    setTimeout(() => {
      setTyped(''); setRevealed(false); setShowTranslation(false); setGrade(null);
      onGrade(g);
    }, g === 'off' ? 1900 : 1100);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Fill in the blank</p>
        {hasTranslation && (
          <button
            type="button"
            onClick={() => setShowTranslation(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 700,
              color: showTranslation ? '#6366f1' : 'var(--text-muted)',
              background: showTranslation ? '#6366f115' : 'transparent',
              border: '1.5px solid', borderColor: showTranslation ? '#6366f1' : 'var(--border-color)',
              borderRadius: 20, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {showTranslation ? <EyeOff size={12} /> : <Eye size={12} />}
            {showTranslation ? 'Hide meaning' : 'Show meaning'}
          </button>
        )}
      </div>

      {sentence ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-lg leading-relaxed text-[var(--text-primary)]" style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>
          {blank}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-center text-[var(--text-muted)] italic">
          Type the Turkish word for: <span className="font-semibold text-[var(--text-primary)]">{word.user_meaning || word.user_translation || '(no meaning saved)'}</span>
        </div>
      )}

      {showTranslation && hasTranslation && (
        <div style={{ background: '#6366f110', border: '1.5px solid #6366f130', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Lightbulb size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13 }}>
            {word.user_meaning && <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>{word.user_meaning}</p>}
            {word.user_translation && <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>{word.user_translation}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Type the missing word…"
          disabled={revealed}
          className="flex-1"
          style={{ padding: '10px 14px', borderRadius: 12, border: '2px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none' }}
          autoFocus
        />
        <Button onClick={check} disabled={!typed || revealed}>Check</Button>
      </div>

      {revealed && grade && (
        <div className="rounded-xl p-3 text-center font-semibold animate-fade-in" style={{ background: GRADE_META[grade].bg, color: GRADE_META[grade].color }}>
          {GRADE_META[grade].icon} {GRADE_META[grade].label}
          {grade !== 'exact' && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, opacity: 0.85 }}>Correct word: <strong>{word.word}</strong></div>}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Multiple Choice
──────────────────────────────────────────────────────────── */
function MultipleChoiceMode({
  word, allWords, onGrade,
}: { word: HighlightedWord; allWords: HighlightedWord[]; onGrade: (grade: Grade) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const pool = allWords.filter(w => w.id !== word.id && (w.user_meaning || w.user_translation));
  const distractors = shuffle(pool).slice(0, 3);
  const options = shuffle([word, ...distractors]);

  const pick = (w: HighlightedWord) => {
    if (selected) return;
    setSelected(w.id);
    const g: Grade = w.id === word.id ? 'exact' : 'off';
    setTimeout(() => { setSelected(null); onGrade(g); }, 900);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Which word matches this meaning?</p>
      <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-center">
        <p className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {word.user_meaning || word.user_translation || word.sentence || '—'}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(opt => {
          let cls = 'border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5';
          if (selected) {
            if (opt.id === word.id) cls = 'border-green-400 bg-green-500/10 text-green-700';
            else if (opt.id === selected) cls = 'border-red-400 bg-red-500/10 text-red-600';
            else cls = 'border-[var(--border-color)] opacity-40';
          }
          return (
            <button
              key={opt.id}
              onClick={() => pick(opt)}
              className={`p-4 rounded-xl border-2 text-left font-semibold transition-all ${cls}`}
              style={{ fontFamily: 'Playfair Display, serif', fontSize: 20 }}
            >
              {opt.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Word Match
──────────────────────────────────────────────────────────── */
function MatchMode({
  words, onFinish,
}: { words: HighlightedWord[]; onFinish: (correct: number, total: number) => void }) {
  const { speak } = usePronunciation();
  const pool = shuffle(words.filter(w => w.user_meaning || w.user_translation)).slice(0, 6);
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const [rights] = useState(() => shuffle(pool.map(w => ({ id: w.id, label: w.word }))));
  const [lefts]  = useState(() => shuffle(pool.map(w => ({ id: w.id, label: w.user_meaning || w.user_translation || w.word }))));

  const handleRight = (id: string) => {
    if (matched.has(id) || !leftSel) return;
    setAttempts(a => a + 1);
    if (leftSel === id) {
      const next = new Set(matched); next.add(id);
      setMatched(next);
      setCorrectCount(c => c + 1);
      setLeftSel(null);
      const w = pool.find(p => p.id === id);
      if (w) speak(w.word);
      if (next.size >= pool.length) {
        setTimeout(() => onFinish(correctCount + 1, pool.length), 600);
      }
    } else {
      setWrong(new Set([leftSel, id]));
      setTimeout(() => { setWrong(new Set()); setLeftSel(null); }, 650);
    }
  };

  const accuracy = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 100;

  if (pool.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[var(--text-muted)] font-semibold">Not enough words with saved meanings to play Match mode.</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Add meanings to your vocabulary first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Match the word to its meaning</p>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1' }}>
          {matched.size}/{pool.length} matched
        </span>
      </div>

      <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(matched.size / pool.length) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.4s' }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Meaning</p>
          {lefts.map(l => (
            <button
              key={l.id}
              onClick={() => !matched.has(l.id) && setLeftSel(leftSel === l.id ? null : l.id)}
              disabled={matched.has(l.id)}
              className={`w-full p-3 rounded-xl border-2 text-sm text-left transition-all ${
                matched.has(l.id) ? 'border-green-400 bg-green-500/10 text-green-700 line-through opacity-60'
                : wrong.has(l.id) ? 'border-red-400 bg-red-500/10 animate-shake'
                : leftSel === l.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Turkish word</p>
          {rights.map(r => (
            <button
              key={r.id}
              onClick={() => handleRight(r.id)}
              disabled={!leftSel || matched.has(r.id)}
              className={`w-full p-3 rounded-xl border-2 font-semibold text-left transition-all ${
                matched.has(r.id) ? 'border-green-400 bg-green-500/10 text-green-700 line-through opacity-60'
                : wrong.has(r.id) ? 'border-red-400 bg-red-500/10 animate-shake'
                : leftSel ? 'border-[var(--border-color)] hover:border-[var(--accent-primary)] cursor-pointer'
                : 'border-[var(--border-color)] opacity-60 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center">
        Select a meaning on the left, then its matching word on the right · Accuracy so far: <strong>{accuracy}%</strong>
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Typing Practice
──────────────────────────────────────────────────────────── */
function TypingMode({
  word, onGrade,
}: { word: HighlightedWord; onGrade: (grade: Grade) => void }) {
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  const expected = word.user_meaning || word.user_translation || '';

  const check = () => {
    if (!typed.trim() || revealed) return;
    let g = gradeAnswer(typed, expected);
    if (g === 'off') g = gradeAnswer(typed, word.word);
    setGrade(g);
    setRevealed(true);
    setTimeout(() => {
      setTyped(''); setRevealed(false); setGrade(null); setHintUsed(false);
      onGrade(g);
    }, g === 'off' ? 1900 : 1100);
  };

  return (
    <div className="space-y-5">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Type the meaning</p>
      <div className="text-center py-5">
        <p className="text-5xl font-bold text-[var(--accent-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {word.word}
        </p>
        {word.sentence && (
          <p className="text-sm text-[var(--text-muted)] italic mt-3">…{word.sentence}…</p>
        )}
      </div>

      {!hintUsed && !revealed && (
        <button
          type="button"
          onClick={() => setHintUsed(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 auto', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: '1.5px dashed var(--border-color)', borderRadius: 20, padding: '5px 12px', cursor: 'pointer' }}
        >
          <Lightbulb size={12} /> Show first letter
        </button>
      )}
      {hintUsed && expected && !revealed && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          Starts with: <strong style={{ color: '#6366f1' }}>{expected.trim()[0]?.toUpperCase()}</strong>…
        </p>
      )}

      <div className="flex gap-3">
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Type the meaning…"
          disabled={revealed}
          className="flex-1"
          style={{ padding: '10px 14px', borderRadius: 12, border: '2px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none' }}
          autoFocus
        />
        <Button onClick={check} disabled={!typed || revealed}>Check</Button>
      </div>

      {revealed && grade && (
        <div className="rounded-xl p-3 text-center animate-fade-in" style={{ background: GRADE_META[grade].bg, color: GRADE_META[grade].color, fontWeight: 600 }}>
          {GRADE_META[grade].icon} {GRADE_META[grade].label}
          {grade !== 'exact' && (
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, opacity: 0.85 }}>
              Expected: <strong>{expected || word.word}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Tab switcher — shared header shown above every screen
──────────────────────────────────────────────────────────── */
function TabSwitcher({ activeTab, setActiveTab }: { activeTab: 'vocabulary' | 'quiz'; setActiveTab: (t: 'vocabulary' | 'quiz') => void }) {
  return (
    <div className="flex gap-2 mb-6 max-w-2xl mx-auto px-6 pt-6">
      <button
        onClick={() => setActiveTab('vocabulary')}
        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'vocabulary'
            ? 'bg-[var(--accent-primary)] text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
        }`}
      >
        🧠 Vocabulary Practice
      </button>
      <button
        onClick={() => setActiveTab('quiz')}
        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'quiz'
            ? 'bg-[var(--accent-primary)] text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
        }`}
      >
        📖 Story Quiz
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Vocabulary Practice — all the original logic, now returned
   as a component so it can sit inside the shared tab shell.
──────────────────────────────────────────────────────────── */
interface PracticeSession {
  mode: PracticeMode;
  words: HighlightedWord[];
  current: number;
  exact: number;
  close: number;
  off: number;
  streak: number;
  maxStreak: number;
}

const MODES: { key: PracticeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'fill_blank', label: 'Fill in the Blank', desc: 'Complete the sentence — reveal the meaning if stuck', icon: AlignLeft },
  { key: 'multiple_choice', label: 'Multiple Choice', desc: 'Pick the correct word from four options', icon: Target },
  { key: 'match', label: 'Word Match', desc: 'Pair words with their meanings', icon: Shuffle },
  { key: 'typing', label: 'Typing Practice', desc: 'Type the meaning — graded with tolerance for typos', icon: Type },
];

function VocabularyPractice() {
  const [words, setWords] = useState<HighlightedWord[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [mode, setMode] = useState<PracticeMode>('multiple_choice');
  const [filterStory, setFilterStory] = useState('all');
  const [finished, setFinished] = useState(false);

  const { play } = useSound();
  const { recordCorrect, recordIncorrect } = useGameStats();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, { data: s }] = await Promise.all([
        supabase.from('highlighted_words').select('*, stories(title)').eq('user_id', user.id),
        supabase.from('stories').select('id,title').eq('user_id', user.id),
      ]);
      setWords((w as HighlightedWord[]) || []);
      setStories((s as Story[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredWords = words
    .filter(w => filterStory === 'all' || w.story_id === filterStory)
    .filter(w => (mode === 'typing' || mode === 'multiple_choice' || mode === 'match') ? !!(w.user_meaning || w.user_translation) : true);

  const startSession = () => {
    const deck = shuffle(filteredWords);
    setSession({ mode, words: deck, current: 0, exact: 0, close: 0, off: 0, streak: 0, maxStreak: 0 });
    setFinished(false);
  };

  const recordGrade = useCallback(async (grade: Grade) => {
    if (!session) return;
    const word = session.words[session.current];

    play(grade === 'exact' ? 'correct' : grade === 'close' ? 'flip' : 'incorrect');

    const isCorrectish = grade !== 'off';
    if (isCorrectish) recordCorrect(); else recordIncorrect();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('practice_results').insert({
        user_id: user.id, word_id: word.id, practice_mode: session.mode, is_correct: isCorrectish,
      });
    }

    const newStreak = isCorrectish ? session.streak + 1 : 0;
    const isLast = session.current + 1 >= session.words.length;

    setSession(prev => prev ? {
      ...prev,
      current: prev.current + 1,
      exact: prev.exact + (grade === 'exact' ? 1 : 0),
      close: prev.close + (grade === 'close' ? 1 : 0),
      off: prev.off + (grade === 'off' ? 1 : 0),
      streak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak),
    } : null);

    if (isLast) setTimeout(() => setFinished(true), 500);
  }, [session, play, recordCorrect, recordIncorrect]);

  const handleMatchFinish = useCallback(async (correct: number, total: number) => {
    if (!session) return;
    play(correct === total ? 'success' : 'flip');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (let i = 0; i < total; i++) {
        const isCorrect = i < correct;
        if (isCorrect) recordCorrect(); else recordIncorrect();
        await supabase.from('practice_results').insert({
          user_id: user.id, word_id: session.words[i]?.id, practice_mode: 'match', is_correct: isCorrect,
        });
      }
    }
    setSession(prev => prev ? { ...prev, exact: correct, off: total - correct, current: total } : null);
    setFinished(true);
  }, [session, play, recordCorrect, recordIncorrect]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Finished screen ── */
  if (finished && session) {
    const total = session.words.length;
    const scored = session.exact + session.close;
    const acc = total > 0 ? Math.round((scored / total) * 100) : 0;

    return (
      <div className="p-6 max-w-md mx-auto text-center animate-fade-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${acc >= 70 ? 'bg-green-500/10' : 'bg-[var(--accent-primary)]/10'}`}>
          {acc >= 70 ? <CheckCircle2 size={40} className="text-green-500" /> : <Brain size={40} className="text-[var(--accent-primary)]" />}
        </div>
        <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          {acc >= 90 ? 'Excellent!' : acc >= 70 ? 'Good work!' : 'Keep practicing!'}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-8">{total} {total === 1 ? 'question' : 'questions'} completed</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: GRADE_META.exact.color, fontFamily: 'Playfair Display, serif' }}>{session.exact}</div>
            <div className="text-xs mt-0.5" style={{ color: GRADE_META.exact.color }}>Exact</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: GRADE_META.close.color, fontFamily: 'Playfair Display, serif' }}>{session.close}</div>
            <div className="text-xs mt-0.5" style={{ color: GRADE_META.close.color }}>Close</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: GRADE_META.off.color, fontFamily: 'Playfair Display, serif' }}>{session.off}</div>
            <div className="text-xs mt-0.5" style={{ color: GRADE_META.off.color }}>Missed</div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">Accuracy</span>
            <span className="font-bold text-[var(--text-primary)]">{acc}%</span>
          </div>
          <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${acc}%`, background: acc >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#f97316)' }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setSession(null); setFinished(false); }} className="flex-1">
            <RotateCcw size={16} /> New session
          </Button>
          <Button onClick={startSession} className="flex-1">
            <RotateCcw size={16} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  /* ── Active session ── */
  if (session && !finished) {
    if (session.mode === 'match') {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setSession(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Exit</button>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Sparkles size={12} /> Match mode</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
            <MatchMode words={session.words} onFinish={handleMatchFinish} />
          </div>
        </div>
      );
    }

    const card = session.words[session.current];
    if (!card) return null;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSession(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Exit</button>
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: GRADE_META.exact.color, fontWeight: 700 }}>✓ {session.exact}</span>
            <span style={{ color: GRADE_META.close.color, fontWeight: 700 }}>≈ {session.close}</span>
            <span style={{ color: GRADE_META.off.color, fontWeight: 700 }}>✗ {session.off}</span>
            {session.streak >= 3 && <span className="text-[var(--accent-warm)]">🔥 {session.streak}</span>}
          </div>
          <span className="text-xs text-[var(--text-muted)]">{session.current + 1}/{session.words.length}</span>
        </div>

        <div className="h-1.5 bg-[var(--border-color)] rounded-full mb-8">
          <div
            className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
            style={{ width: `${(session.current / session.words.length) * 100}%` }}
          />
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 min-h-64">
          {session.mode === 'fill_blank' && (
            <FillBlankMode key={card.id} word={card} onGrade={recordGrade} />
          )}
          {session.mode === 'multiple_choice' && (
            <MultipleChoiceMode key={card.id} word={card} allWords={session.words} onGrade={recordGrade} />
          )}
          {session.mode === 'typing' && (
            <TypingMode key={card.id} word={card} onGrade={recordGrade} />
          )}
        </div>
      </div>
    );
  }

  /* ── Setup screen ── */
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Practice</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">{filteredWords.length} words available to practice</p>

      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Choose a mode</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {MODES.map(({ key, label, desc, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === key
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/40'
            }`}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div className={`p-1.5 rounded-lg ${mode === key ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                <Icon size={15} />
              </div>
              <span className={`text-sm font-semibold ${mode === key ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>{label}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] ml-9">{desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Filter words</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterStory}
            onChange={e => setFilterStory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="all">All stories</option>
            {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <div className="text-sm text-[var(--text-muted)]">
            {filteredWords.length} words
            {(mode === 'typing' || mode === 'multiple_choice' || mode === 'match') && words.length !== filteredWords.length && (
              <span className="ml-1 text-xs">(this mode requires saved meanings)</span>
            )}
          </div>
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={startSession} disabled={filteredWords.length === 0}>
        Start practicing <ArrowRight size={18} />
      </Button>

      {filteredWords.length === 0 && (
        <p className="text-sm text-center text-[var(--text-muted)] mt-3">
          {words.length === 0 ? 'Highlight words while reading to practice them here.' : 'No words match these filters — try adding meanings to your vocabulary.'}
        </p>
      )}

      <p className="text-xs text-center text-[var(--text-muted)] mt-6" style={{ opacity: 0.8 }}>
        Answers are graded with tolerance for small typos and accent differences —
        you&apos;ll see &ldquo;Close enough&rdquo; instead of a flat wrong for near-misses.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Page root — always shows the tab switcher, then renders
   either the quiz or the vocabulary practice flow underneath.
──────────────────────────────────────────────────────────── */
export default function PracticePage() {
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'quiz'>('vocabulary');

  return (
    <div>
      <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'quiz' ? (
        <div className="max-w-2xl mx-auto px-6 pb-6"><StoryQuiz /></div>
      ) : (
        <VocabularyPractice />
      )}
    </div>
  );
}
