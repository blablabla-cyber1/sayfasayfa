export const runtime = 'edge';
'use client';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { BookOpen, BookMarked, CreditCard, Target, Flame, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AnalyticsData {
  storiesCompleted: number;
  totalWordsRead: number;
  totalVocab: number;
  flashcardsReviewed: number;
  practiceAccuracy: number;
  currentStreak: number;
  vocabByCategory: { name: string; value: number; color: string }[];
  weeklyReads: { day: string; words: number }[];
  monthlyVocab: { month: string; words: number }[];
  practiceHistory: { date: string; correct: number; total: number }[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
}

const CHART_COLORS = {
  primary: '#327874',
  warm: '#c7893c',
  hot: '#d55e27',
  grid: 'var(--border-color)',
  text: 'var(--text-muted)',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

function getDayName(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - (6 - offset));
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getMonthName(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - offset));
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: stories },
        { data: progress },
        { data: vocab },
        { data: flashcards },
        { data: practice },
        { data: analytics },
      ] = await Promise.all([
        supabase.from('stories').select('id, word_count').eq('user_id', user.id),
        supabase.from('reading_progress').select('is_completed, last_read_at, words_read:story_id').eq('user_id', user.id),
        supabase.from('highlighted_words').select('category, created_at').eq('user_id', user.id),
        supabase.from('flashcard_reviews').select('reviewed_at').eq('user_id', user.id),
        supabase.from('practice_results').select('is_correct, practiced_at').eq('user_id', user.id),
        supabase.from('analytics').select('recorded_at, event_type').eq('user_id', user.id),
      ]);

      const completed = progress?.filter(p => p.is_completed).length || 0;
      const storyMap = Object.fromEntries((stories || []).map(s => [s.id, s.word_count]));
      const totalWords = (progress || []).reduce((acc, p) => acc + (storyMap[p.words_read as unknown as string] || 0), 0);

      const forgot = vocab?.filter(v => v.category === 'forgot').length || 0;
      const unknown = vocab?.filter(v => v.category === 'unknown').length || 0;
      const note = vocab?.filter(v => v.category === 'note').length || 0;

      const totalPractice = practice?.length || 0;
      const correctPractice = practice?.filter(p => p.is_correct).length || 0;
      const accuracy = totalPractice ? Math.round((correctPractice / totalPractice) * 100) : 0;

      // Weekly reading data (last 7 days)
      const weeklyReads = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().slice(0, 10);
        const sessionCount = (analytics || []).filter(a =>
          a.recorded_at.slice(0, 10) === dateStr && a.event_type === 'read_session'
        ).length;
        return { day: getDayName(i), words: sessionCount * 500 };
      });

      // Monthly vocab growth (last 6 months)
      const monthlyVocab = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthStr = d.toISOString().slice(0, 7);
        const count = (vocab || []).filter(v => v.created_at.slice(0, 7) === monthStr).length;
        return { month: getMonthName(i), words: count };
      });

      // Practice history (last 7 days)
      const practiceHistory = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().slice(0, 10);
        const dayPractice = (practice || []).filter(p => p.practiced_at.slice(0, 10) === dateStr);
        return {
          date: getDayName(i),
          correct: dayPractice.filter(p => p.is_correct).length,
          total: dayPractice.length,
        };
      });

      // Streak calculation
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i <= 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const hasActivity = (analytics || []).some(a => a.recorded_at.slice(0, 10) === ds);
        if (hasActivity) streak++;
        else if (i > 0) break;
      }

      setData({
        storiesCompleted: completed,
        totalWordsRead: totalWords,
        totalVocab: vocab?.length || 0,
        flashcardsReviewed: flashcards?.length || 0,
        practiceAccuracy: accuracy,
        currentStreak: streak,
        vocabByCategory: [
          { name: 'Forgot Meaning', value: forgot, color: '#c7893c' },
          { name: 'Unknown', value: unknown, color: '#d55e27' },
          { name: 'Personal Notes', value: note, color: '#327874' },
        ],
        weeklyReads,
        monthlyVocab,
        practiceHistory,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="h-8 skeleton w-48 mb-6 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Track your Turkish learning progress</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard icon={BookOpen} label="Stories completed" value={data.storiesCompleted} color="#327874" />
        <StatCard icon={TrendingUp} label="Words read (est.)" value={data.totalWordsRead.toLocaleString()} color="#c7893c" />
        <StatCard icon={Flame} label="Day streak" value={data.currentStreak} color="#d55e27" />
        <StatCard icon={BookMarked} label="Words saved" value={data.totalVocab} color="#327874" />
        <StatCard icon={CreditCard} label="Cards reviewed" value={data.flashcardsReviewed} color="#c7893c" />
        <StatCard icon={Target} label="Practice accuracy" value={`${data.practiceAccuracy}%`} color="#d55e27" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly reading activity */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Weekly Reading Activity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.weeklyReads}>
              <defs>
                <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="words" name="Est. words" stroke={CHART_COLORS.primary} fill="url(#readGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly vocabulary growth */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Vocabulary Growth (6 months)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyVocab}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="words" name="New words" fill={CHART_COLORS.warm} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Practice accuracy over time */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Practice Sessions (This Week)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.practiceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="correct" name="Correct" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="total" name="Total" fill={CHART_COLORS.grid} radius={[2, 2, 0, 0]} stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vocabulary breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Vocabulary Breakdown
          </h3>
          {data.totalVocab === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
              No vocabulary saved yet
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={data.vocabByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {data.vocabByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {data.vocabByCategory.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <div className="flex-1">
                      <div className="text-xs text-[var(--text-muted)]">{cat.name}</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{cat.value} words</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streak reminder */}
      {data.currentStreak > 0 && (
        <div className="mt-5 bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {data.currentStreak} day streak!
            </p>
            <p className="text-xs text-[var(--text-muted)]">Keep reading every day to maintain your streak.</p>
          </div>
        </div>
      )}
    </div>
  );
}
