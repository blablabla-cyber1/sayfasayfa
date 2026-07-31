'use client';
import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, Star, StarOff, Volume2, Languages, Loader2, ImageOff, RefreshCw, BookOpenText, MessageSquare } from 'lucide-react';
import { HighlightedWord, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { usePronunciation } from '@/hooks/usePronunciation';
import { useWordEnrichment } from '@/hooks/useWordEnrichment';

interface WordPanelProps {
  word: HighlightedWord | null;
  storyTitle: string;
  onClose: () => void;
  onUpdate: (word: HighlightedWord) => void;
  onDelete: (id: string) => void;
}

async function translateToArabic(word: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=tr|ar`
    );
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return '';
  } catch {
    return '';
  }
}

export function WordPanel({ word, storyTitle, onClose, onUpdate, onDelete }: WordPanelProps) {
  const [editing, setEditing]         = useState(false);
  const [meaning, setMeaning]         = useState(word?.user_meaning || '');
  const [translation, setTranslation] = useState(word?.user_translation || '');
  const [note, setNote]               = useState(word?.user_note || '');
  const [saving, setSaving]           = useState(false);
  const [speaking, setSpeaking]       = useState(false);

  const [arabicTranslation, setArabicTranslation] = useState('');
  const [translating, setTranslating] = useState(false);

  // Auto-enrichment: English meaning + image + second example sentence
  const [enriching, setEnriching] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const { speak } = usePronunciation();
  const { enrich } = useWordEnrichment();

  // A "note" is a grammar/personal annotation, not a vocabulary word —
  // it gets a simpler panel: just Arabic translation + the note itself.
  const isNote = word?.category === 'note';

  // Arabic translation — always re-fetches per word (applies to every category)
  useEffect(() => {
    if (!word) return;
    setArabicTranslation('');
    setTranslating(true);
    translateToArabic(word.word).then(result => {
      setArabicTranslation(result);
      setTranslating(false);
    });
  }, [word?.word]);

  // English meaning + image + second sentence — skipped entirely for notes,
  // fetched once and cached on the row for vocabulary words (forgot/unknown).
  useEffect(() => {
    if (!word) return;
    if (isNote) return; // notes don't need photo/enrichment at all
    setImgFailed(false);

    const alreadyEnriched = word.english_meaning || word.auto_image_url || word.example_sentence_2;
    if (alreadyEnriched) return;

    let cancelled = false;
    setEnriching(true);

    enrich(word.word, word.sentence).then(async result => {
      if (cancelled) return;
      setEnriching(false);

      const patch: Record<string, string | null> = {};
      if (result.englishMeaning) patch.english_meaning = result.englishMeaning;
      if (result.imageUrl) patch.auto_image_url = result.imageUrl;
      if (result.exampleSentence) patch.example_sentence_2 = result.exampleSentence;

      if (Object.keys(patch).length === 0) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('highlighted_words')
        .update(patch)
        .eq('id', word.id)
        .select()
        .single();
      if (data && !cancelled) onUpdate(data as HighlightedWord);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, isNote]);

  const handleRefreshEnrichment = async () => {
    if (!word) return;
    setEnriching(true);
    setImgFailed(false);
    const result = await enrich(word.word, word.sentence);
    setEnriching(false);

    const patch: Record<string, string | null> = {
      english_meaning: result.englishMeaning ?? word.english_meaning,
      auto_image_url: result.imageUrl ?? word.auto_image_url,
      example_sentence_2: result.exampleSentence ?? word.example_sentence_2,
    };

    const supabase = createClient();
    const { data } = await supabase
      .from('highlighted_words')
      .update(patch)
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
  };

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
      .update({
        user_meaning: meaning,
        user_translation: translation,
        user_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
    setEditing(false);
    setSaving(false);
  };

  const handleFavorite = async () => {
    const newVal = !word.is_favorite;
    const { data } = await createClient()
      .from('highlighted_words')
      .update({ is_favorite: newVal })
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
  };

  const handleDelete = async () => {
    if (!confirm('Remove this word from your vocabulary?')) return;
    await createClient().from('highlighted_words').delete().eq('id', word.id);
    onDelete(word.id);
    onClose();
  };

  const handleSaveArabic = async () => {
    if (!arabicTranslation) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('highlighted_words')
      .update({ user_translation: arabicTranslation })
      .eq('id', word.id)
      .select()
      .single();
    if (data) onUpdate(data as HighlightedWord);
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
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, display: 'flex', alignItems: 'center', gap: 5 }}>
          {isNote && <MessageSquare size={12} />}
          {CATEGORY_LABELS[word.category]}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={handleFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            {word.is_favorite
              ? <Star size={15} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              : <StarOff size={15} style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Word + speak */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `2px solid ${color}` }}>
            <span style={{ fontSize: 32, fontWeight: 900, color, fontFamily: 'Playfair Display, serif', flex: 1 }}>
              {word.word}
            </span>
            <button
              onClick={handleSpeak}
              title="Listen to pronunciation"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: speaking ? color : `${color}22`,
                color: speaking ? 'white' : color,
                transition: 'all 0.2s',
                flexShrink: 0,
                transform: speaking ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <Volume2 size={18} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 6 }}>
            Added {formatDate(word.created_at)}
          </p>
        </div>

        {/* ── Vocabulary-only extras: photo + English meaning ── */}
        {!isNote && (
          <>
            <div style={{ marginBottom: 14 }}>
              {enriching && !word.auto_image_url ? (
                <div style={{ height: 140, borderRadius: 16, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={16} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Finding a picture…</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : word.auto_image_url && !imgFailed ? (
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '2px solid var(--border-color)' }}>
                  <img
                    src={word.auto_image_url}
                    alt={word.english_meaning || word.word}
                    onError={() => setImgFailed(true)}
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={handleRefreshEnrichment}
                    title="Find a different picture"
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 10, padding: 6, cursor: 'pointer', display: 'flex', backdropFilter: 'blur(4px)' }}
                  >
                    <RefreshCw size={13} color="white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRefreshEnrichment}
                  style={{ width: '100%', height: 80, borderRadius: 16, border: '2px dashed var(--border-color)', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <ImageOff size={18} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>No picture found — tap to retry</span>
                </button>
              )}
            </div>

            {(enriching && !word.english_meaning) ? null : word.english_meaning && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🇬🇧</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{word.english_meaning}</span>
              </div>
            )}
          </>
        )}

        {/* 🌍 Arabic translation box — shown for every category, including notes */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f115, #8b5cf615)',
          border: '2px solid #6366f133',
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Languages size={14} color="#6366f1" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              الترجمة إلى العربية
            </span>
          </div>

          {translating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>جاري الترجمة…</span>
            </div>
          ) : arabicTranslation ? (
            <div>
              <p style={{
                fontSize: isNote ? 26 : 22,
                fontWeight: 800,
                color: 'var(--text-primary)',
                direction: 'rtl',
                textAlign: 'right',
                lineHeight: 1.5,
                marginBottom: 8,
                fontFamily: 'system-ui, sans-serif',
              }}>
                {arabicTranslation}
              </p>
              {!word.user_translation && (
                <button
                  onClick={handleSaveArabic}
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#6366f1',
                    background: '#6366f115', border: '1px solid #6366f133',
                    borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  💾 حفظ الترجمة
                </button>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              لم يتم العثور على ترجمة
            </p>
          )}
        </div>

        {/* Story & original sentence — kept for both, gives context for the note */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
            From: {storyTitle}
          </p>
          {word.sentence && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
              &ldquo;…{word.sentence}…&rdquo;
            </p>
          )}
        </div>

        {/* Second example sentence — vocabulary only */}
        {!isNote && word.example_sentence_2 && (
          <div style={{ background: '#10b98110', border: '1.5px solid #10b98130', borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BookOpenText size={13} color="#10b981" />
              <p style={{ fontSize: 11, fontWeight: 800, color: '#10b981', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Another example
              </p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
              &ldquo;{word.example_sentence_2}&rdquo;
            </p>
          </div>
        )}

        {/* Meaning / edit */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!isNote && (
              <>
                <Textarea
                  label="Meaning"
                  value={meaning}
                  onChange={e => setMeaning(e.target.value)}
                  placeholder="Turkish meaning…"
                  rows={2}
                />
                <Textarea
                  label="Translation"
                  value={translation}
                  onChange={e => setTranslation(e.target.value)}
                  placeholder="ترجمتك الخاصة…"
                  rows={2}
                />
              </>
            )}
            <Textarea
              label="Personal Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isNote ? 'Grammar explanation, usage tip…' : 'ملاحظاتك…'}
              rows={isNote ? 5 : 3}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isNote && word.user_meaning && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>📖 Meaning</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{word.user_meaning}</p>
              </div>
            )}
            {!isNote && word.user_translation && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>🌍 Translation</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', direction: 'rtl', textAlign: 'right' }}>
                  {word.user_translation}
                </p>
              </div>
            )}
            {word.user_note && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: isNote ? 5 : 3 }}>
                  {isNote ? '💬 Grammar Note' : '📝 Note'}
                </p>
                <p style={{ fontSize: isNote ? 17 : 13, fontWeight: isNote ? 600 : 400, fontStyle: isNote ? 'normal' : 'italic', lineHeight: 1.6, color: isNote ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {word.user_note}
                </p>
              </div>
            )}
            {!word.user_meaning && !word.user_translation && !word.user_note && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {isNote ? 'No note yet. Click Edit to write your grammar note.' : 'No notes yet. Click Edit to add meaning.'}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMeaning(word.user_meaning || '');
                setTranslation(word.user_translation || arabicTranslation || '');
                setNote(word.user_note || '');
                setEditing(true);
              }}
            >
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
