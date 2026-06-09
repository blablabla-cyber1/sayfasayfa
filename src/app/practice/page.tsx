'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, RotateCcw, ArrowRight, Brain,
  Type, AlignLeft, Shuffle, Target
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HighlightedWord, PracticeMode, Story } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type PracticeSession = {
  mode: PracticeMode;
  words: HighlightedWord[];
  current: number;
  correct: number;
  incorrect: number;
  streak: number;
  maxStreak: number;
  answers: { wordId: string; correct: boolean }[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Mode Components ─── */

function FillBlankMode({ word, onAnswer }: { word: HighlightedWord; onAnswer: (correct: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);

  const sentence = word.sentence || '';
  const blank = sentence.replace(new RegExp(word.word, 'gi'), '______');

  const check = () => {
    const correct = typed.trim().toLowerCase() === word.word.toLowerCase();
    setRevealed(true);
    setTimeout(() => { setTyped(''); setRevealed(false); onAnswer(correct); }, 1200);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Fill in the blank</p>
      {sentence ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-lg leading-relaxed text-[var(--text-primary)]" style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>
          {blank}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-center text-[var(--text-muted)] italic">
          Type the Turkish word: <span className="font-semibold text-[var(--text-primary)]">{word.user_meaning || word.user_translation || '(no meaning saved)'}</span>
        </div>
      )}
      {word.user_meaning && (
        <p className="text-sm text-[var(--text-muted)]">Hint: {word.user_meaning}</p>
      )}
      <div className="flex gap-3">
        <Input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && typed && check()}
          placeholder="Type the missing word…"
          className="flex-1"
          autoFocus
        />
        <Button onClick={check} disabled={!typed || revealed}>Check</Button>
      </div>
      {revealed && (
        <div className={`rounded-xl p-3 text-center font-semibold animate-fade-in ${
          typed.trim().toLowerCase() === word.word.toLowerCase()
            ? 'bg-green-500/15 text-green-600'
            : 'bg-red-500/15 text-red-600'
        }`}>
          {typed.trim().toLowerCase() === word.word.toLowerCase() ? '✓ Correct!' : `✗ Answer: ${word.word}`}
        </div>
      )}
    </div>
  );
}

function MultipleChoiceMode({
  word, allWords, onAnswer
}: { word: HighlightedWord; allWords: HighlightedWord[]; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const distractors = shuffle(allWords.filter(w => w.id !== word.id)).slice(0, 3);
  const options = shuffle([word, ...distractors]);

  const pick = (w: HighlightedWord) => {
    if (selected) return;
    setSelected(w.id);
    const correct = w.id === word.id;
    setTimeout(() => { setSelected(null); onAnswer(correct); }, 900);
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

function MatchMode({
  words, onFinish
}: { words: HighlightedWord[]; onFinish: (correct: number, total: number) => void }) {
  const pool = words.filter(w => w.user_meaning || w.user_translation).slice(0, 6);
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [correct, setCorrect] = useState(0);

  const rights = shuffle(pool.map(w => ({ id: w.id, label: w.word })));
  const lefts = shuffle(pool.map(w => ({ id: w.id, label: w.user_meaning || w.user_translation || w.word })));

  const handleRight = (id: string) => {
    if (matched.has(id)) return;
    if (!leftSel) return;
    if (leftSel === id) {
      setMatched(prev => { const n = new Set(prev); n.add(id); return n; });
      setCorrect(c => c + 1);
      setLeftSel(null);
      if (matched.size + 1 >= pool.length) setTimeout(() => onFinish(correct + 1, pool.length), 500);
    } else {
      setWrong(new Set([leftSel, id]));
      setTimeout(() => { setWrong(new Set()); setLeftSel(null); }, 700);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Match the word to its meaning</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {lefts.map(l => (
            <button
              key={l.id}
              onClick={() => !matched.has(l.id) && setLeftSel(leftSel === l.id ? null : l.id)}
              className={`w-full p-3 rounded-xl border-2 text-sm text-left transition-all ${
                matched.has(l.id) ? 'border-green-400 bg-green-500/10 text-green-700 line-through opacity-60'
                : wrong.has(l.id) ? 'border-red-400 bg-red-500/10'
                : leftSel === l.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map(r => (
            <button
              key={r.id}
              onClick={() => handleRight(r.id)}
              disabled={!leftSel}
              className={`w-full p-3 rounded-xl border-2 font-semibold text-left transition-all ${
                matched.has(r.id) ? 'border-green-400 bg-green-500/10 text-green-700 line-through opacity-60'
                : wrong.has(r.id) ? 'border-red-400 bg-red-500/10'
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
      <p className="text-xs text-[var(--text-muted)] text-center">Select a meaning on the left, then its word on the right</p>
    </div>
  );
}

function TypingMode({ word, onAnswer }: { word: HighlightedWord; onAnswer: (correct: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    if (!typed.trim()) return;
    const expected = (word.user_meaning || word.user_translation || '').toLowerCase().trim();
    const actual = typed.toLowerCase().trim();
    const correct = actual === expected || word.word.toLowerCase() === actual;
    setRevealed(true);
    setTimeout(() => { setTyped(''); setRevealed(false); onAnswer(correct); }, 1400);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Type the meaning</p>
      <div className="text-center py-6">
        <p className="text-5xl font-bold text-[var(--accent-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {word.word}
        </p>
        {word.sentence && (
          <p className="text-sm text-[var(--text-muted)] italic mt-3">…{word.sentence}…</p>
        )}
      </div>
      <div className="flex gap-3">
        <Input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Type the meaning…"
          className="flex-1"
          autoFocus
        />
        <Button onClick={check} disabled={!typed || revealed}>Check</Button>
      </div>
      {revealed && (
        <div className={`rounded-xl p-3 text-center animate-fade-in ${
          typed.toLowerCase().trim() === (word.user_meaning || word.user_translation || '').toLowerCase().trim()
            ? 'bg-green-500/15 text-green-600 font-semibold'
            : 'bg-red-500/15 text-red-600'
        }`}>
          {typed.toLowerCase().trim() === (word.user_meaning || word.user_translation || '').toLowerCase().trim()
            ? '✓ Correct!'
            : `Answer: ${word.user_meaning || word.user_translation || word.word}`}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

const MODES: { key: PracticeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'fill_blank', label: 'Fill in the Blank', desc: 'Complete the sentence with the missing word', icon: AlignLeft },
  { key: 'multiple_choice', label: 'Multiple Choice', desc: 'Pick the correct word from four options', icon: Target },
  { key: 'match', label: 'Word Match', desc: 'Connect words to their meanings', icon: Shuffle },
  { key: 'typing', label: 'Typing Practice', desc: 'Type the meaning from memory', icon: Type },
];

export default function PracticePage() {
  const [words, setWords] = useState<HighlightedWord[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [mode, setMode] = useState<PracticeMode>('multiple_choice');
  const [filterStory, setFilterStory] = useState('all');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [finished, setFinished] = useState(false);

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
    .filter(w => mode === 'typing' ? !!(w.user_meaning || w.user_translation) : true);

  const startSession = () => {
    const deck = shuffle(filteredWords);
    setSession({ mode, words: deck, current: 0, correct: 0, incorrect: 0, streak: 0, maxStreak: 0, answers: [] });
    setFeedback(null);
    setFinished(false);
  };

  const recordResult = useCallback(async (correct: boolean) => {
    if (!session) return;
    const word = session.words[session.current];

    setFeedback(correct ? 'correct' : 'incorrect');
    setTimeout(() => setFeedback(null), 600);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('practice_results').insert({
        user_id: user.id, word_id: word.id, practice_mode: session.mode, is_correct: correct,
      });
    }

    const newStreak = correct ? session.streak + 1 : 0;
    const isLast = session.current + 1 >= session.words.length;

    setSession(prev => prev ? {
      ...prev,
      current: prev.current + 1,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
      streak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak),
      answers: [...prev.answers, { wordId: word.id, correct }],
    } : null);

    if (isLast) setTimeout(() => setFinished(true), 700);
  }, [session]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* Finished screen */
  if (finished && session) {
    const acc = Math.round((session.correct / session.words.length) * 100);
    return (
      <div className="p-6 max-w-md mx-auto text-center animate-fade-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${acc >= 70 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {acc >= 70 ? <CheckCircle size={40} className="text-green-500" /> : <Brain size={40} className="text-[var(--accent-primary)]" />}
        </div>
        <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          {acc >= 90 ? 'Excellent!' : acc >= 70 ? 'Good work!' : 'Keep practicing!'}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-8">{session.words.length} questions completed</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'Playfair Display, serif' }}>{session.correct}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Correct</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-3xl font-bold text-red-500" style={{ fontFamily: 'Playfair Display, serif' }}>{session.incorrect}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Incorrect</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="text-3xl font-bold text-[var(--accent-warm)]" style={{ fontFamily: 'Playfair Display, serif' }}>{session.maxStreak}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Best streak</div>
          </div>
        </div>

        {/* Accuracy meter */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">Accuracy</span>
            <span className="font-bold text-[var(--text-primary)]">{acc}%</span>
          </div>
          <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${acc}%`, background: acc >= 70 ? '#22c55e' : '#ef4444' }}
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

  /* Active session */
  if (session && !finished) {
    const card = session.words[session.current];
    if (!card) return null;

    return (
      <div className={`p-6 max-w-2xl mx-auto transition-all ${feedback === 'correct' ? 'bg-green-500/5' : feedback === 'incorrect' ? 'bg-red-500/5' : ''}`}>
        {/* Session header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSession(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Exit</button>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 font-semibold">✓ {session.correct}</span>
            <span className="text-red-500 font-semibold">✗ {session.incorrect}</span>
            {session.streak >= 3 && <span className="text-[var(--accent-warm)]">🔥 {session.streak}</span>}
          </div>
          <span className="text-xs text-[var(--text-muted)]">{session.current + 1}/{session.words.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--border-color)] rounded-full mb-8">
          <div
            className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
            style={{ width: `${(session.current / session.words.length) * 100}%` }}
          />
        </div>

        {/* Mode content */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 min-h-64">
          {session.mode === 'fill_blank' && (
            <FillBlankMode key={card.id} word={card} onAnswer={recordResult} />
          )}
          {session.mode === 'multiple_choice' && (
            <MultipleChoiceMode key={card.id} word={card} allWords={session.words} onAnswer={recordResult} />
          )}
          {session.mode === 'match' && (
            <MatchMode key={`match-${session.current}`} words={session.words.slice(session.current)} onFinish={(c, t) => {
              for (let i = 0; i < t; i++) recordResult(i < c);
            }} />
          )}
          {session.mode === 'typing' && (
            <TypingMode key={card.id} word={card} onAnswer={recordResult} />
          )}
        </div>
      </div>
    );
  }

  /* Setup screen */
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Practice</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">{filteredWords.length} words available to practice</p>

      {/* Mode selection */}
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

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Filter words</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStory}
            onChange={e => setFilterStory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="all">All stories</option>
            {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <div className="text-sm text-[var(--text-muted)] self-center">
            {filteredWords.length} words
            {mode === 'typing' && words.length !== filteredWords.length && (
              <span className="ml-1 text-xs">(typing requires saved meanings)</span>
            )}
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={startSession}
        disabled={filteredWords.length === 0}
      >
        Start practicing <ArrowRight size={18} />
      </Button>

      {filteredWords.length === 0 && (
        <p className="text-sm text-center text-[var(--text-muted)] mt-3">
          {words.length === 0 ? 'Highlight words while reading to practice them here.' : 'No words match these filters.'}
        </p>
      )}
    </div>
  );
}
