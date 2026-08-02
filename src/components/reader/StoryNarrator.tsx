'use client';
import { useState } from 'react';
import { Headphones, Play, Pause, Square, X, ChevronDown } from 'lucide-react';
import { useStoryNarration } from '@/hooks/useStoryNarration';

interface StoryNarratorProps {
  content: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function StoryNarrator({ content }: StoryNarratorProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const {
    currentSentence, playState, rate, setRate,
    voices, selectedVoiceURI, setVoiceByURI,
    play, pause, stop, progress,
  } = useStoryNarration(content);

  const isActive = playState !== 'idle';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(p => !p)}
        title="Read story aloud"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
          background: isActive ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
          color: isActive ? 'white' : 'var(--text-muted)',
        }}
      >
        <Headphones size={16} />
        {playState === 'playing' && (
          <span style={{
            position: 'absolute', top: -1, right: -1,
            width: 7, height: 7, borderRadius: '50%',
            background: '#10b981', border: '2px solid white',
          }} />
        )}
      </button>

      {showPanel && (
        <>
          <div onClick={() => { setShowPanel(false); setShowVoicePicker(false); }} style={{ position: 'fixed', inset: 0, zIndex: 198 }} />
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 199,
            width: 300, background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg,#10b98115,#05966915)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Headphones size={14} color="#10b981" />
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>Read Aloud</span>
              </div>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <X size={14} />
              </button>
            </div>

            {/* Honest disclaimer */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                🔊 Uses your browser&apos;s free built-in voice — clear, but synthetic, not a human recording.
              </p>
            </div>

            {/* Current sentence preview */}
            <div style={{ padding: '14px', minHeight: 60, display: 'flex', alignItems: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                {isActive ? `"${currentSentence}"` : 'Press play to start reading the story aloud.'}
              </p>
            </div>

            {/* Progress bar */}
            {isActive && (
              <div style={{ padding: '0 14px 10px' }}>
                <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#10b981,#059669)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 14px 14px' }}>
              {playState === 'playing' ? (
                <button
                  onClick={pause}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}
                >
                  <Pause size={18} />
                </button>
              ) : (
                <button
                  onClick={play}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}
                >
                  <Play size={18} style={{ marginLeft: 2 }} />
                </button>
              )}
              <button
                onClick={stop}
                disabled={!isActive}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border-color)', cursor: isActive ? 'pointer' : 'not-allowed', background: 'none', color: 'var(--text-muted)', opacity: isActive ? 1 : 0.4 }}
              >
                <Square size={13} />
              </button>
            </div>

            {/* Speed control */}
            <div style={{ padding: '0 14px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Speed</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => setRate(s)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${rate === s ? '#10b981' : 'var(--border-color)'}`,
                      background: rate === s ? '#10b98115' : 'none',
                      color: rate === s ? '#10b981' : 'var(--text-muted)',
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Voice picker */}
            {voices.length > 1 && (
              <div style={{ padding: '0 14px 14px' }}>
                <button
                  onClick={() => setShowVoicePicker(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {voices.find(v => v.voice.voiceURI === selectedVoiceURI)?.label || 'Choose voice'}
                  </span>
                  <ChevronDown size={13} color="var(--text-muted)" />
                </button>
                {showVoicePicker && (
                  <div style={{ marginTop: 6, maxHeight: 140, overflowY: 'auto', border: '2px solid var(--border-color)', borderRadius: 10 }}>
                    {voices.map(v => (
                      <button
                        key={v.voice.voiceURI}
                        onClick={() => { setVoiceByURI(v.voice.voiceURI); setShowVoicePicker(false); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 600,
                          background: v.voice.voiceURI === selectedVoiceURI ? '#10b98115' : 'none',
                          color: v.voice.voiceURI === selectedVoiceURI ? '#10b981' : 'var(--text-secondary)',
                          border: 'none', cursor: 'pointer', display: 'block',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
