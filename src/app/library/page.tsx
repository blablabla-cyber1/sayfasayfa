'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, SlidersHorizontal, BookOpen, Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Story } from '@/types';
import { StoryCard } from '@/components/library/StoryCard';
import { UploadStoryModal } from '@/components/library/UploadStoryModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LibraryPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editStory, setEditStory] = useState<Story | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const fetchStories = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    const { data: progressData } = await supabase
      .from('reading_progress')
      .select('story_id, progress_percent')
      .eq('user_id', user.id);

    setStories((storyData as Story[]) || []);
    const prog: Record<string, number> = {};
    progressData?.forEach(p => { prog[p.story_id] = p.progress_percent; });
    setProgress(prog);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story?')) return;
    const supabase = createClient();
    await supabase.from('stories').delete().eq('id', id);
    setStories(prev => prev.filter(s => s.id !== id));
  };

  const filteredStories = stories.filter(s => {
    if (filterBookmarked && !s.is_bookmarked) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
        !s.author?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            My Library
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} in your collection
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} size="lg">
          <Plus size={18} /> Add Story
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search stories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <Button
          variant={filterBookmarked ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilterBookmarked(!filterBookmarked)}
        >
          <Bookmark size={14} /> Bookmarked
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-[var(--border-color)]">
              <div className="skeleton h-48" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-12" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
            <BookOpen size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {search || filterBookmarked ? 'No stories found' : 'Your library is empty'}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {search || filterBookmarked ? 'Try different filters' : 'Upload your first Turkish story to get started'}
          </p>
          {!search && !filterBookmarked && (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus size={16} /> Add your first story
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {filteredStories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={(s) => { setEditStory(s); setUploadOpen(true); }}
              onDelete={handleDelete}
              onBookmarkToggle={(id, val) => setStories(prev => prev.map(s => s.id === id ? { ...s, is_bookmarked: val } : s))}
              readingProgress={progress[story.id]}
            />
          ))}
        </div>
      )}

      <UploadStoryModal
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); setEditStory(null); }}
        onSuccess={(story) => {
          if (editStory) {
            setStories(prev => prev.map(s => s.id === story.id ? story : s));
          } else {
            setStories(prev => [story, ...prev]);
          }
        }}
        editStory={editStory}
      />
    </div>
  );
}
