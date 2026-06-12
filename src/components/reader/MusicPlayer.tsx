'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, X, Play, Pause, ExternalLink, Plus, GripVertical } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'soundcloud' | 'other';
  storyId: string;
}

interface Position { x: number; y: number }

function detectType(url: string): 'youtube' | 'soundcloud' | 'other' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'other';
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(song: Song): string | null {
  if (song.type === 'youtube') {
    const id = getYouTubeId(song.url);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&modestbranding=1`;
  }
  if (song.type === 'soundcloud') {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(song.url)}&auto_play=true&color=%236366f1&show_artwork=true`;
  }
  return null;
}

const STORAGE_KEY = 'sayfasayfa-songs-v2';

interface MusicPlayerProps {
  storyId: string;
}

export function MusicPlayer({ storyId }: MusicPlayerProps) {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Floating player position (draggable)
  const [playerPos, setPlayerPos] = useState<Position>({ x: 20, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);

  // Songs for this story only
  const songs = allSongs.filter(s => s.storyId === storyId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAllSongs(JSON.parse(saved));
    } catch {}
  }, []);

  // Load saved position
  useEffect(() => {
    try {
      const pos = localStorage.getItem(`sayfasayfa-player-pos-${storyId}`);
      if (pos) setPlayerPos(JSON.parse(pos));
    } catch {}
  }, [storyId]);

  const saveSongs = (updated: Song[]) => {
    setAllSongs(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const song: Song = {
      id: Date.now().toString(),
      title: newTitle.trim() || 'Untitled Song',
      url: newUrl.trim(),
      type: detectType(newUrl),
      storyId,
    };
    saveSongs([...allSongs, song]);
    setNewUrl('');
    setNewTitle('');
    setShowAddForm(false);
    setCurrentSong(song);
  };

  const handleDelete = (id: string) => {
    saveSongs(allSongs.filter(s => s.id !== id));
    if (currentSong?.id === id) setCurrentSong(null);
  };

  // Drag logic
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - playerPos.x,
      y: clientY - playerPos.y,
    };
    setDragging(true);
  }, [playerPos]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 280, clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, clientY - dragOffset.current.y)),
      };
      setPlayerPos(newPos);
    };

    const handleUp = () => {
      setDragging(false);
      setPlayerPos(prev => {
        try { localStorage.setItem(`sayfasayfa-player-pos-${storyId}`, JSON.stringify(prev)); } catch {}
        return prev;
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, storyId]);

  const embedUrl = currentSong ? getEmbedUrl(currentSong) : null;

  return (
    <>
      {/* ── Top bar button ── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          title="Story music"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
            background: currentSong ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
            color: currentSong ? 'white' : 'var(--text-muted)',
          }}
        >
          <Music size={16} />
          {currentSong && (
            <span style={{
              position: 'absolute', top: -1, right: -1,
              width: 7, height: 7, borderRadius: '50%',
              background: '#10b981', border: '2px solid white',
            }} />
          )}
        </button>

        {/* Song list panel */}
        {showPanel && (
          <>
            <div onClick={() => setShowPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 198 }} />
            <div style={{
              position: 'absolute', right: 0, top: '110%', zIndex: 199,
              width: 280, background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
              borderRadius: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg,#6366f115,#8b5cf615)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Music size={14} color="#6366f1" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>Story Music</span>
                </div>
                <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>

              {/* Song list */}
              <div style={{ maxHeight: 180, overflowY: 'auto', padding: '4px 6px' }}>
                {songs.length === 0 && !showAddForm && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, padding: '14px 0' }}>
                    No songs for this story yet
                  </p>
                )}
                {songs.map(song => (
                  <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 10, marginBottom: 2, background: currentSong?.id === song.id ? '#6366f115' : 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { if (currentSong?.id !== song.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                    onMouseLeave={e => { if (currentSong?.id !== song.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <button onClick={() => setCurrentSong(currentSong?.id === song.id ? null : song)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, flex: 1, padding: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: currentSong?.id === song.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {currentSong?.id === song.id ? <Pause size={11} color="white" /> : <Play size={11} color="var(--text-muted)" />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: currentSong?.id === song.id ? '#6366f1' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                        {song.title}
                      </span>
                    </button>
                    <button onClick={() => handleDelete(song.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, borderRadius: 6, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add form */}
              {showAddForm ? (
                <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Song title…"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '2px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  />
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="YouTube or SoundCloud link…"
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '2px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleAdd} disabled={!newUrl.trim()}
                      style={{ flex: 1, padding: '7px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: newUrl.trim() ? 1 : 0.5 }}>
                      Add
                    </button>
                    <button onClick={() => { setShowAddForm(false); setNewUrl(''); setNewTitle(''); }}
                      style={{ padding: '7px 10px', borderRadius: 9, border: '2px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border-color)' }}>
                  <button onClick={() => setShowAddForm(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 10, border: '2px dashed var(--border-color)', background: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = '#6366f1'); (e.currentTarget.style.color = '#6366f1'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border-color)'); (e.currentTarget.style.color = 'var(--text-muted)'); }}>
                    <Plus size={13} /> Add song for this story
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Draggable floating player ── */}
      {currentSong && embedUrl && (
        <div
          ref={playerRef}
          style={{
            position: 'fixed',
            left: playerPos.x,
            top: playerPos.y,
            zIndex: 500,
            width: 260,
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            userSelect: 'none',
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GripVertical size={14} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                🎵 {currentSong.title}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <a href={currentSong.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.8)', display: 'flex' }} onClick={e => e.stopPropagation()}>
                <ExternalLink size={12} />
              </a>
              <button
                onClick={e => { e.stopPropagation(); setCurrentSong(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Embedded player */}
          <iframe
            src={embedUrl}
            width="100%"
            height={currentSong.type === 'soundcloud' ? 110 : 130}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ display: 'block' }}
          />
        </div>
      )}
    </>
  );
}
