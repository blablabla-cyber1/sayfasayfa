'use client';
import { useState } from 'react';
import { X, Pencil, Trash2, Star, StarOff, Volume2 } from 'lucide-react';
import { HighlightedWord, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { usePronunciation } from '@/hooks/usePronunciation';

interface WordPanelProps {
  word: HighlightedWord | null;
  storyTitle: string;
  onClose: () => void;
  onUpdate: (word: HighlightedWord) => void;
  onDelete: (id: string) => void;
}

export function WordPanel({ word, storyTitle, onClose, onUpdate, onDelete }: WordPanelProps) {
  const [editing, setEditing]       = useState(false);
  const [meaning, setMeaning]       = useState(word?.user_meaning || '');
  const [translation, setTranslation] = useState(word?.user_translation || '');
  const [note, setNote]             = useState(word?.user_note || '');
  const [saving, setSaving]         = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const { speak } = usePronunciation();

  if (!word) return null;

  const color = CATEGORY_COLORS[word.category];

  const handleSpeak = () => {
    setSpeaking(true);
    speak(word.word);
    setTimeout(() => setSpeaking(false), 1200);
  };

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
    const { data } = await supabase.from('highlighted_words').update({ is_favorite: newVal }).eq('id', word.id).select().single();
    if (data) onUpdate(data as HighlightedWord);
  };

  const handleDelete = async () => {
    if (!confirm('Remove this word from your vocabulary?')) return;
    await createClient().from('highlighted_words').delete().eq('id', word.id);
    onDelete(word.id);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 320,
      background: 'var(--bg-card)',
      borderLeft: '2px solid var(--border-color)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      zIndex: 40,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{CATEGORY_LABELS[word.category]}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={handleFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            {word.is_favorite ? <Star size={15} style={{ fill: '#fbbf24', color: '#fbbf24' }} /> : <StarOff size={15} style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Word + speak button */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `2px solid ${color}` }}>
            <span style={{ fontSize: 32, fontWeight: 900, color, fontFamily: 'Playfair Display, serif', flex: 1 }}>
              {word.word}
            </span>
            {/* 🔊 Speak button */}
            <button
              onClick={handleSpeak}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: speaking ? color : `${color}22`,
                color: speaking ? 'white' : color,
                transition: 'all 0.2s',
                flexShrink: 0,
                transform: speaking ? 'scale(1.1)' : 'scale(1)',
              }}
              title="Listen to pronunciation"
            >
              <Volume2 size={18} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 6 }}>Added {formatDate(word.created_at)}</p>
        </div>

        {/* Story & sentence */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>From: {storyTitle}</p>
          {word.sentence && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
              &ldquo;…{word.sentence}…&rdquo;
            </p>
          )}
        </div>

        {/* Meaning / edit */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Textarea label="Meaning" value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="Turkish meaning…" rows={2} />
            <Textarea label="Translation" value={translation} onChange={e => setTranslation(e.target.value)} placeholder="In your language…" rows={2} />
            <Textarea label="Personal Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Memory tricks, usage…" rows={3} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {word.user_meaning && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>📖 Meaning</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{word.user_meaning}</p>
              </div>
            )}
            {word.user_translation && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>🌍 Translation</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{word.user_translation}</p>
              </div>
            )}
            {word.user_note && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>📝 Note</p>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)' }}>{word.user_note}</p>
              </div>
            )}
            {!word.user_meaning && !word.user_translation && !word.user_note && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet. Click Edit to add meaning.</p>
            )}
            <Button size="sm" variant="outline" onClick={() => { setMeaning(word.user_meaning || ''); setTranslation(word.user_translation || ''); setNote(word.user_note || ''); setEditing(true); }}>
              <Pencil size={13} /> Edit
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        <Button variant="danger" size="sm" className="w-full" onClick={handleDelete}>
          <Trash2 size={13} /> Remove word
        </Button>
      </div>
    </div>
  );
}
