'use client';
import { useState } from 'react';
import { X, Pencil, Trash2, Star, StarOff, ExternalLink } from 'lucide-react';
import { HighlightedWord, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';

interface WordPanelProps {
  word: HighlightedWord | null;
  storyTitle: string;
  onClose: () => void;
  onUpdate: (word: HighlightedWord) => void;
  onDelete: (id: string) => void;
}

export function WordPanel({ word, storyTitle, onClose, onUpdate, onDelete }: WordPanelProps) {
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState(word?.user_meaning || '');
  const [translation, setTranslation] = useState(word?.user_translation || '');
  const [note, setNote] = useState(word?.user_note || '');
  const [saving, setSaving] = useState(false);

  if (!word) return null;

  const color = CATEGORY_COLORS[word.category];

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('highlighted_words')
      .update({ user_meaning: meaning, user_translation: translation, user_note: note, updated_at: new Date().toISOString() })
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
    setEditing(false);
    setSaving(false);
  };

  const handleFavorite = async () => {
    const supabase = createClient();
    const newVal = !word.is_favorite;
    const { data } = await supabase
      .from('highlighted_words')
      .update({ is_favorite: newVal })
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
  };

  const handleDelete = async () => {
    if (!confirm('Remove this word from your vocabulary?')) return;
    const supabase = createClient();
    await supabase.from('highlighted_words').delete().eq('id', word.id);
    onDelete(word.id);
    onClose();
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl z-40 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
          {CATEGORY_LABELS[word.category]}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleFavorite} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            {word.is_favorite ? <Star size={15} className="fill-yellow-400 text-yellow-400" /> : <StarOff size={15} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Word */}
        <div>
          <div
            className="text-3xl font-bold pb-2 border-b-2"
            style={{ color, borderColor: color, fontFamily: 'Playfair Display, serif' }}
          >
            {word.word}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Added {formatDate(word.created_at)}</p>
        </div>

        {/* Story & sentence */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">From: {storyTitle}</p>
          {word.sentence && (
            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
              "…{word.sentence}…"
            </p>
          )}
        </div>

        {/* Meaning/note */}
        {editing ? (
          <div className="space-y-3">
            <Textarea
              label="Meaning"
              value={meaning}
              onChange={e => setMeaning(e.target.value)}
              placeholder="Turkish meaning or definition…"
              rows={2}
            />
            <Textarea
              label="Translation"
              value={translation}
              onChange={e => setTranslation(e.target.value)}
              placeholder="Translation in your language…"
              rows={2}
            />
            <Textarea
              label="Personal Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Your notes, memory tricks, usage…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {word.user_meaning && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">Meaning</p>
                <p className="text-sm text-[var(--text-primary)]">{word.user_meaning}</p>
              </div>
            )}
            {word.user_translation && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">Translation</p>
                <p className="text-sm text-[var(--text-primary)]">{word.user_translation}</p>
              </div>
            )}
            {word.user_note && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">Note</p>
                <p className="text-sm text-[var(--text-secondary)] italic">{word.user_note}</p>
              </div>
            )}
            {!word.user_meaning && !word.user_translation && !word.user_note && (
              <p className="text-sm text-[var(--text-muted)] italic">No notes yet. Click Edit to add meaning or notes.</p>
            )}
            <Button size="sm" variant="outline" onClick={() => { setMeaning(word.user_meaning || ''); setTranslation(word.user_translation || ''); setNote(word.user_note || ''); setEditing(true); }}>
              <Pencil size={13} /> Edit
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <Button variant="danger" size="sm" className="w-full" onClick={handleDelete}>
          <Trash2 size={13} /> Remove word
        </Button>
      </div>
    </div>
  );
}
