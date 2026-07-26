'use client';
import { useEffect, useState, useCallback } from 'react';
import { BookOpenCheck, ArrowRight, RotateCcw, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSound } from '@/hooks/useSound';
import { useGameStats } from '@/hooks/useGameStats';

/* ── Local types — kept self-contained so this drops in without
   needing edits to the shared types file ── */
interface QuizStory {
  id: string;
  title: string;
  cover_image_url: string | null;
  reading_level: string | null;
}

interface QuizQuestion {
  id: string;
  story_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

interface QuizResultRow {
  story_id: string;
  score: number;
  total: number;
  taken_at: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StoryQuiz() {
  const [stories, setStories] = useState<QuizStory[]>([]);
  const [questionsByStory, setQuestionsByStory] = useState<Record<string, QuizQuestion[]>>({});
  const [bestScores, setBestScores] = useState<Record<string, { score: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  const [activeStory, setActiveStory] = useState<QuizStory | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const { play } = useSound();
  const { addXP } = useGameStats();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, title, cover_image_url, reading_level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const storyIds = (storiesData || []).map(s => s.id);

      const [{ data: questionsData }, { data: resultsData }] = await Promise.all([
        storyIds.length
          ? supabase.from('quiz_questions').select('*').in('story_id', storyIds).order('sort_order')
          : Promise.resolve({ data: [] as QuizQuestion[] }),
        storyIds.length
          ? supabase.from('quiz_results').select('story_id, score, total, taken_at').eq('user_id', user.id)
          : Promise.resolve({ data: [] as QuizResultRow[] }),
      ]);

      const grouped: Record<string, QuizQuestion[]> = {};
      (questionsData || []).forEach((q: QuizQuestion) => {
        if (!grouped[q.story_id]) grouped[q.story_id] = [];
        grouped[q.story_id].push(q);
      });

      const best: Record<string, { score: number; total: number }> = {};
      (resultsData || []).forEach((r: QuizResultRow) => {
        const pct = r.total > 0 ? r.score / r.total : 0;
        const existing = best[r.story_id];
        const existingPct = existing ? existing.score / existing.total : -1;
        if (pct > existingPct) best[r.story_id] = { score: r.score, total: r.total };
      });

      setStories((storiesData as QuizStory[]) || []);
      setQuestionsByStory(grouped);
      setBestScores(best);
      setLoading(false);
    })();
  }, []);

  const startQuiz = (story: QuizStory) => {
    play('whoosh');
    setActiveStory(story);
    setCurrent(0);
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
  };

  const questions = activeStory ? (questionsByStory[activeStory.id] || []) : [];
  const question = questions[current];

  const pickAnswer = useCallback((index: number) => {
    if (selected !== null || !question) return;
    setSelected(index);
    const isCorrect = index === question.correct_index;
    play(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setCorrectCount(c => c + 1);

    setTimeout(async () => {
      if (current + 1 >= questions.length) {
        const finalCorrect = correctCount + (isCorrect ? 1 : 0);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && activeStory) {
          await supabase.from('quiz_results').insert({
            user_id: user.id,
            story_id: activeStory.id,
            score: finalCorrect,
            total: questions.length,
          });
          addXP(finalCorrect * 10);
          setBestScores(prev => {
            const existingPct = prev[activeStory.id] ? prev[activeStory.id].score / prev[activeStory.id].total : -1;
            const newPct = finalCorrect / questions.length;
            if (newPct > existingPct) {
              return { ...prev, [activeStory.id]: { score: finalCorrect, total: questions.length } };
            }
            return prev;
          });
        }
        play('success');
        setFinished(true);
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1400);
  }, [selected, question, current, questions.length, correctCount, activeStory, play, addXP]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const storiesWithQuiz = stories.filter(s => (questionsByStory[s.id] || []).length > 0);

  /* ── Story picker ── */
  if (!activeStory) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpenCheck size={20} className="text-[var(--accent-primary)]" />
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Story Quizzes</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">Test how well you understood each story</p>

        {storiesWithQuiz.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p className="font-medium mb-1">No quizzes available yet</p>
            <p className="text-sm">Quizzes appear here once questions are added for a story.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {storiesWithQuiz.map(story => {
              const qCount = (questionsByStory[story.id] || []).length;
              const best = bestScores[story.id];
              return (
                <button
                  key={story.id}
                  onClick={() => startQuiz(story)}
                  className="text-left rounded-xl border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all overflow-hidden bg-[var(--bg-card)]"
                >
                  <div style={{ height: 90, background: 'linear-gradient(135deg,#6366f122,#8b5cf622)', position: 'relative', overflow: 'hidden' }}>
                    {story.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.cover_image_url} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">{story.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-muted)]">{qCount} questions</span>
                      {best && (
                        <span className="text-xs font-bold" style={{ color: best.score === best.total ? '#10b981' : '#f59e0b' }}>
                          Best: {best.score}/{best.total}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Finished screen ── */
  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto text-center py-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${pct >= 70 ? 'bg-green-500/10' : 'bg-[var(--accent-primary)]/10'}`}>
          <Trophy size={36} className={pct >= 70 ? 'text-green-500' : 'text-[var(--accent-primary)]'} />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          {pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Well done!' : 'Keep reading!'}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">{activeStory.title}</p>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mb-6">
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: pct >= 70 ? '#10b981' : '#f59e0b' }}>
            {correctCount}/{questions.length}
          </div>
          <div className="h-2.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: pct >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveStory(null)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-center gap-2"
          >
            Choose another story
          </button>
          <button
            onClick={() => startQuiz(activeStory)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent-primary)' }}
          >
            <RotateCcw size={15} /> Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── Active quiz ── */
  if (!question) return null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setActiveStory(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Exit</button>
        <span className="text-xs text-[var(--text-muted)]">{activeStory.title}</span>
        <span className="text-xs text-[var(--text-muted)]">{current + 1}/{questions.length}</span>
      </div>

      <div className="h-1.5 bg-[var(--border-color)] rounded-full mb-6">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
          style={{ width: `${(current / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-5" style={{ fontFamily: 'Playfair Display, serif' }}>
          {question.question}
        </p>

        <div className="space-y-2.5">
          {question.options.map((opt, i) => {
            let style = 'border-[var(--border-color)] hover:border-[var(--accent-primary)]';
            let icon = null;
            if (selected !== null) {
              if (i === question.correct_index) {
                style = 'border-green-400 bg-green-500/10 text-green-700';
                icon = <CheckCircle2 size={16} className="text-green-500" />;
              } else if (i === selected) {
                style = 'border-red-400 bg-red-500/10 text-red-600';
                icon = <XCircle size={16} className="text-red-500" />;
              } else {
                style = 'border-[var(--border-color)] opacity-40';
              }
            }
            return (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={selected !== null}
                className={`w-full flex items-center justify-between gap-2 p-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all ${style}`}
              >
                <span>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {selected !== null && question.explanation && (
          <p className="text-xs text-[var(--text-muted)] mt-4 italic">{question.explanation}</p>
        )}
      </div>
    </div>
  );
}
