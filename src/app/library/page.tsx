'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Search, Bookmark, BookOpen, Clock,
  MoreVertical, Pencil, Trash2, BookmarkCheck, CheckCircle, Circle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Story, LEVEL_LABELS } from '@/types';
import { UploadStoryModal } from '@/components/library/UploadStoryModal';
import { estimateReadingTime, formatDate, truncate } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { useGameStats } from '@/hooks/useGameStats';

export default function LibraryPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editStory, setEditStory] = useState<Story | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { play } = useSound();
  const { addXP } = useGameStats();

  const fetchStories = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const [{ data: storyData }, { data: progressData }] = await Promise.all([
      supabase.from('stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('reading_progress').select('story_id, progress_percent, is_completed').eq('user_id', user.id),
    ]);

    setStories((storyData as Story[]) || []);
    const prog: Record<string, number> = {};
    const comp: Record<string, boolean> = {};
    progressData?.forEach(p => {
      prog[p.story_id] = p.progress_percent;
      comp[p.story_id] = p.is_completed;
    });
    setProgress(prog);
    setCompleted(comp);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story? This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.from('stories').delete().eq('id', id);
    setStories(prev => prev.filter(s => s.id !== id));
    play('pop');
    setMenuOpen(null);
  };

  const handleBookmark = async (story: Story) => {
    const supabase = createClient();
    const newVal = !story.is_bookmarked;
    await supabase.from('stories').update({ is_bookmarked: newVal }).eq('id', story.id);
    setStories(prev => prev.map(s => s.id === story.id ? { ...s, is_bookmarked: newVal } : s));
    play('click');
  };

  const handleMarkCompleted = async (storyId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isNowCompleted = !completed[storyId];
    await supabase.from('reading_progress').upsert({
      user_id: user.id,
      story_id: storyId,
      is_completed: isNowCompleted,
      progress_percent: isNowCompleted ? 100 : (progress[storyId] || 0),
      last_read_at: new Date().toISOString(),
    }, { onConflict: 'user_id,story_id' });

    setCompleted(prev => ({ ...prev, [storyId]: isNowCompleted }));
    if (isNowCompleted) {
      play('success');
      addXP(50);
    } else {
      play('click');
    }
    setMenuOpen(null);
  };

  const filtered = stories.filter(s => {
    if (filterBookmarked && !s.is_bookmarked) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
        !s.author?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
            My Library 📚
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, marginTop: 6 }}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} · {Object.values(completed).filter(Boolean).length} completed
          </p>
        </div>
        <button
          onClick={() => { setUploadOpen(true); play('click'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={18} /> Add Story
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stories…"
            style={{ width: '100%', paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 14, border: '2px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          />
        </div>
        <button
          onClick={() => setFilterBookmarked(!filterBookmarked)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 14, border: '2px solid', borderColor: filterBookmarked ? '#6366f1' : 'var(--border-color)', background: filterBookmarked ? '#6366f115' : 'var(--bg-card)', color: filterBookmarked ? '#6366f1' : 'var(--text-secondary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <Bookmark size={14} /> Bookmarked
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 20, overflow: 'hidden', background: 'var(--bg-card)', border: '2px solid var(--border-color)' }}>
              <div className="skeleton" style={{ height: 180 }} />
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 20, width: '75%' }} />
                <div className="skeleton" style={{ height: 14, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search || filterBookmarked ? 'No stories found' : 'Your library is empty'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
            {search || filterBookmarked ? 'Try different filters' : 'Upload your first Turkish story to get started'}
          </p>
          {!search && !filterBookmarked && (
            <button
              onClick={() => { setUploadOpen(true); play('click'); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}
            >
              <Plus size={18} /> Add your first story
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {filtered.map(story => {
            const prog = progress[story.id] || 0;
            const isCompleted = completed[story.id];

            return (
              <div
                key={story.id}
                className="story-card"
                style={{
                  background: 'var(--bg-card)',
                  border: `2px solid ${isCompleted ? '#10b98133' : 'var(--border-color)'}`,
                  borderRadius: 20,
                  position: 'relative',
transition: 'all 0.2s',
                }}
              >
                {/* Cover */}
                <Link href={`/read/${story.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ height: 180, background: 'linear-gradient(135deg,#6366f122,#8b5cf622)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {story.cover_image_url ? (
                      <img
                        src={story.cover_image_url}
                        alt={story.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <BookOpen size={48} color="#6366f144" />
                    )}

                    {/* Progress bar */}
                    {prog > 0 && !isCompleted && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                      </div>
                    )}

                    {/* Level badge */}
                    {story.reading_level && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                        {LEVEL_LABELS[story.reading_level]}
                      </div>
                    )}

                    {/* Completed badge */}
                    {isCompleted && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#10b981', color: 'white', fontSize: 13, fontWeight: 900, padding: '6px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={14} /> Completed
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <Link href={`/read/${story.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>
                        {story.title}
                      </h3>
                    </Link>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleBookmark(story)}
                        title={story.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: story.is_bookmarked ? '#f59e0b' : 'var(--text-muted)', transition: 'color 0.15s' }}
                      >
                        {story.is_bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>

                      {/* More menu */}
<div style={{ position: 'relative' }}>
  <button
    onClick={() => setMenuOpen(menuOpen === story.id ? null : story.id)}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: 'var(--text-muted)' }}
  >
    <MoreVertical size={16} />
  </button>

  {menuOpen === story.id && (
    <>
      {/* Invisible bridge to prevent gap */}
      <div style={{ position: 'absolute', right: 0, top: '100%', height: 8, width: '100%', zIndex: 101 }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 101,
          background: 'var(--bg-card)',
          border: '2px solid var(--border-color)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: 6,
          minWidth: 170,
        }}
      >
        <button
          onClick={() => handleMarkCompleted(story.id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: isCompleted ? '#f59e0b' : '#10b981', fontSize: 13, fontWeight: 700 }}
          onMouseEnter={e => (e.currentTarget.style.background = isCompleted ? '#f59e0b15' : '#10b98115')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {isCompleted ? <><Circle size={14} /> Mark as unread</> : <><CheckCircle size={14} /> Mark as completed</>}
        </button>
        <button
          onClick={() => { setMenuOpen(null); setEditStory(story); setUploadOpen(true); play('click'); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Pencil size={14} /> Edit story
        </button>
        <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
        <button
          onClick={() => handleDelete(story.id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Trash2 size={14} /> Delete story
        </button>
      </div>
      {/* Click outside to close */}
      <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
    </>
  )}
</div>

                             
                              {/* Divider */}
                              <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(story.id)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700 }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={14} /> Delete story
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {story.author && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>by {story.author}</p>
                  )}

                  {story.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5, fontWeight: 500 }}>
                      {truncate(story.description, 70)}
                    </p>
                  )}

                  {/* Tags */}
                  {story.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {story.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#6366f115', color: '#6366f1' }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {story.word_count > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {estimateReadingTime(story.word_count)}
                        </span>
                      )}
                      <span>{formatDate(story.created_at)}</span>
                    </div>

                    {/* Progress % */}
                    {prog > 0 && !isCompleted && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>{Math.round(prog)}%</span>
                    )}
                    {isCompleted && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={11} /> Done
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

     <UploadStoryModal
  key={editStory?.id || 'new'}
  isOpen={uploadOpen}
  onClose={() => { setUploadOpen(false); setEditStory(null); }}
        onSuccess={story => {
          if (editStory) {
            setStories(prev => prev.map(s => s.id === story.id ? story : s));
          } else {
            setStories(prev => [story, ...prev]);
            addXP(20);
            play('success');
          }
        }}
        editStory={editStory}
      />
    </div>
  );
}
