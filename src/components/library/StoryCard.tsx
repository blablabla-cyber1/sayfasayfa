'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Bookmark, BookmarkCheck, MoreVertical, Pencil, Trash2, Clock } from 'lucide-react';
import { Story, LEVEL_LABELS } from '@/types';
import { estimateReadingTime, formatDate, truncate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface StoryCardProps {
  story: Story;
  onEdit: (story: Story) => void;
  onDelete: (id: string) => void;
  onBookmarkToggle: (id: string, value: boolean) => void;
  readingProgress?: number;
}

export function StoryCard({ story, onEdit, onDelete, onBookmarkToggle, readingProgress }: StoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(story.is_bookmarked);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const newVal = !bookmarked;
    setBookmarked(newVal);
    await supabase.from('stories').update({ is_bookmarked: newVal }).eq('id', story.id);
    onBookmarkToggle(story.id, newVal);
  };

  return (
    <div className="story-card bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden relative group">
      {/* Cover */}
      <Link href={`/read/${story.id}`} className="block">
        <div className="relative h-48 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--border-color)] overflow-hidden">
          {story.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.cover_image_url}
              alt={story.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={40} className="text-[var(--text-muted)]" />
            </div>
          )}
          {/* Progress bar */}
          {readingProgress !== undefined && readingProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          )}
          {/* Level badge */}
          {story.reading_level && (
            <div className="absolute top-2 left-2">
              <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                {LEVEL_LABELS[story.reading_level]}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link href={`/read/${story.id}`}>
            <h3 className="font-semibold text-[var(--text-primary)] leading-snug hover:text-[var(--accent-primary)] transition-colors" style={{ fontFamily: 'Playfair Display, serif' }}>
              {story.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleBookmark} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-warm)] transition-colors">
              {bookmarked ? <BookmarkCheck size={16} className="text-[var(--accent-warm)]" /> : <Bookmark size={16} />}
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg py-1 min-w-[130px]">
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); onEdit(story); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDelete(story.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {story.author && (
          <p className="text-xs text-[var(--text-muted)] mb-2">by {story.author}</p>
        )}

        {story.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
            {truncate(story.description, 80)}
          </p>
        )}

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {story.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {story.word_count > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {estimateReadingTime(story.word_count)}
            </span>
          )}
          <span>{formatDate(story.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
