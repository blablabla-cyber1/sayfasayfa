'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Story, ReadingLevel, LEVEL_LABELS } from '@/types';
import { countWords } from '@/lib/utils';

interface UploadStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (story: Story) => void;
  editStory?: Story | null;
}

const LEVELS: ReadingLevel[] = ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced'];

export function UploadStoryModal({ isOpen, onClose, onSuccess, editStory }: UploadStoryModalProps) {
  const [title, setTitle] = useState(editStory?.title || '');
  const [author, setAuthor] = useState(editStory?.author || '');
  const [description, setDescription] = useState(editStory?.description || '');
  const [tags, setTags] = useState(editStory?.tags.join(', ') || '');
  const [level, setLevel] = useState<ReadingLevel | ''>(editStory?.reading_level || '');
  const [content, setContent] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(editStory?.cover_image_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'text' | 'file'>('text');
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (file.type === 'text/plain') {
      const text = await file.text();
      setContent(text);
    } else {
      setError('Only TXT files supported for direct upload. Paste content manually for PDF/EPUB.');
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    try {
      let coverUrl = editStory?.cover_image_url || null;

      // Upload cover image
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `covers/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('story-covers')
          .upload(path, coverFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('story-covers').getPublicUrl(path);
          coverUrl = publicUrl;
        }
      }

      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const wordCount = countWords(content || '');

      if (editStory) {
        // Update
        const { data, error: err } = await supabase
          .from('stories')
          .update({ title, author: author || null, description: description || null, tags: tagList, reading_level: level || null, cover_image_url: coverUrl, word_count: wordCount, updated_at: new Date().toISOString() })
          .eq('id', editStory.id)
          .select()
          .single();
        if (err) throw err;
        if (content) {
          await supabase.from('story_content').upsert({ story_id: editStory.id, content, content_format: 'text' }, { onConflict: 'story_id' });
        }
        onSuccess(data as Story);
      } else {
        // Insert story
        const { data, error: err } = await supabase
          .from('stories')
          .insert({ user_id: user.id, title, author: author || null, description: description || null, tags: tagList, reading_level: level || null, cover_image_url: coverUrl, word_count: wordCount })
          .select()
          .single();
        if (err) throw err;
        // Insert content
        if (content) {
          await supabase.from('story_content').insert({ story_id: (data as Story).id, content, content_format: 'text' });
        }
        onSuccess(data as Story);
      }

      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editStory ? 'Edit Story' : 'Upload Story'} size="lg">
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="Story title" required />
          <Input label="Author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" />
        </div>

        <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" rows={3} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} placeholder="novel, short-story, folklore" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Reading Level</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value as ReadingLevel)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="">Select level…</option>
              {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
        </div>

        {/* Cover image */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Cover Image</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-24 rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <FileText size={24} className="text-[var(--text-muted)]" />
              )}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => coverRef.current?.click()}>
                <Upload size={14} /> Choose Image
              </Button>
              {coverPreview && (
                <button type="button" onClick={() => { setCoverPreview(''); setCoverFile(null); }} className="ml-2 text-xs text-red-500 hover:underline">
                  Remove
                </button>
              )}
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              <p className="text-xs text-[var(--text-muted)] mt-1">JPG, PNG, WebP</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setTab('text')} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${tab === 'text' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              Manual Input
            </button>
            <button type="button" onClick={() => setTab('file')} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${tab === 'file' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              Upload File
            </button>
          </div>

          {tab === 'text' ? (
            <Textarea
              label="Story Content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste or type your Turkish story here…"
              rows={10}
            />
          ) : (
            <div
              className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">Click to upload TXT file</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">TXT files supported</p>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
              {content && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--accent-primary)]">
                  <FileText size={14} />
                  <span>File loaded — {countWords(content).toLocaleString()} words</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setContent(''); }}>
                    <X size={14} className="text-[var(--text-muted)]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : (editStory ? 'Save Changes' : 'Upload Story')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
