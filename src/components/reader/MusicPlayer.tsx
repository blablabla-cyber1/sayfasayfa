'use client';
import { useState, useRef, useEffect } from 'react';
import { Music, X, Play, Pause, Volume2, VolumeX, ExternalLink, Plus } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'soundcloud' | 'other';
}

function detectType(url: string): 'youtube' | 'soundcloud' | 'other' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'other';
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&modestbranding=1`;
}

function getSoundCloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&color=%236366f1&show_artwork=true`;
}

const STORAGE_KEY = 'sayfasayfa-songs';

export function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [muted, setMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load songs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSongs(JSON.parse(saved));
    } catch {}
  }, []);

  const saveSongs = (updated: Song[]) => {
    setSongs(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const type = detectType(newUrl);
    const song: Song = {
      id: Date.now().toString(),
      title: newTitle.trim() || 'Untitled Song',
      url: newUrl.trim(),
      type,
    };
    saveSongs([...songs, song]);
    setNewUrl('');
    setNewTitle('');
    setShowAddForm(false);
    setCurrentSong(song);
  };

  const handleDelete = (id: string) => {
    const updated = songs.filter(s => s.id !== id);
    saveSongs(updated);
    if (currentSong?.id === id) setCurrentSong(null);
  };

  const getEmbedUrl = (song: Song) => {
    if (song.type === 'youtube') return getYouTubeEmbedUrl(song.url);
    if (song.type === 'soundcloud') return getSoundCloudEmbedUrl(song.url);
    return null;
  };

  const embedUrl = currentSong ? getEmbedUrl(currentSong) : null;

  return (
    <>
      {/* Floating music button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          title="Music player"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s',
            background: currentSong ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
            color: currentSong ? 'white' : 'var(--text-muted)',
          }}
        >
          <Music size={17} />
          {currentSong && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 8, height: 8, borderRadius: '50%',
              background: '#10b981',
              border: '2px solid var(--bg-card)',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </button>

        {/* Panel */}
        {showPanel && (
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 200,
            width: 300, background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg,#6366f115,#8b5cf615)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#6366f1" />
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Music Player</span>
              </div>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={15} />
              </button>
            </div>

            {/* Embedded player */}
            {currentSong && embedUrl && (
              <div style={{ padding: '12px 12px 0' }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    width="100%"
                    height={currentSong.type === 'soundcloud' ? 120 : 140}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    🎵 {currentSong.title}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={currentSong.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                      <ExternalLink size={13} />
                    </a>
                    <button onClick={() => setCurrentSong(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Song list */}
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 8px' }}>
              {songs.length === 0 && !showAddForm && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, padding: '16px 0' }}>
                  No songs yet. Add one below!
                </p>
              )}
              {songs.map(song => (
                <div
                  key={song.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 8px', borderRadius: 12, marginBottom: 2,
                    background: currentSong?.id === song.id ? '#6366f115' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (currentSong?.id !== song.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (currentSong?.id !== song.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <button
                    onClick={() => setCurrentSong(currentSong?.id === song.id ? null : song)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: 0, textAlign: 'left' }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: currentSong?.id === song.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {currentSong?.id === song.id
                        ? <Pause size={12} color="white" />
                        : <Play size={12} color="var(--text-muted)" />
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: currentSong?.id === song.id ? '#6366f1' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {song.title}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {song.type}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(song.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add form */}
            {showAddForm ? (
              <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Song title…"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                />
                <input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="YouTube or SoundCloud link…"
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAdd}
                    disabled={!newUrl.trim()}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: newUrl.trim() ? 1 : 0.5 }}
                  >
                    Add Song
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewUrl(''); setNewTitle(''); }}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 12, border: '2px dashed var(--border-color)', background: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget.style.borderColor = '#6366f1'); (e.currentTarget.style.color = '#6366f1'); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border-color)'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
                >
                  <Plus size={14} /> Add Song
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </>
  );
}
