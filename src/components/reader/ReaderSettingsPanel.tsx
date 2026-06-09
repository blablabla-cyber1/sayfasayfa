'use client';
import { Settings, X } from 'lucide-react';
import { ReaderSettings } from '@/types';

interface ReaderSettingsPanelProps {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
  onClose: () => void;
}

const FONTS = [
  { label: 'Crimson Pro', value: "'Crimson Pro', Georgia, serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'System', value: 'system-ui, sans-serif' },
];

export function ReaderSettingsPanel({ settings, onChange, onClose }: ReaderSettingsPanelProps) {
  const update = (key: keyof ReaderSettings, value: unknown) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    localStorage.setItem('reader-settings', JSON.stringify(next));
  };

  return (
    <div className="absolute right-4 top-14 z-50 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Reading Settings</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={16} />
        </button>
      </div>

      {/* Font size */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">Font Size</label>
          <span className="text-xs text-[var(--text-muted)]">{settings.fontSize}px</span>
        </div>
        <input
          type="range"
          min={14} max={28} step={1}
          value={settings.fontSize}
          onChange={e => update('fontSize', Number(e.target.value))}
          className="w-full accent-[var(--accent-primary)]"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-0.5">
          <span>A</span><span className="text-lg">A</span>
        </div>
      </div>

      {/* Line spacing */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">Line Spacing</label>
          <span className="text-xs text-[var(--text-muted)]">{settings.lineSpacing}x</span>
        </div>
        <input
          type="range"
          min={1.3} max={2.5} step={0.1}
          value={settings.lineSpacing}
          onChange={e => update('lineSpacing', Number(e.target.value))}
          className="w-full accent-[var(--accent-primary)]"
        />
      </div>

      {/* Font family */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text-muted)] block mb-2">Font</label>
        <div className="space-y-1">
          {FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => update('fontFamily', f.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${settings.fontFamily === f.value ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
              style={{ fontFamily: f.value }}
            >
              {f.label} — Türkçe metin
            </button>
          ))}
        </div>
      </div>

      {/* Dark mode */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--text-muted)]">Dark Mode</label>
        <button
          onClick={() => {
            const next = !settings.darkMode;
            update('darkMode', next);
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
            localStorage.setItem('sayfasayfa-theme', next ? 'dark' : 'light');
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-color)]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.darkMode ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </div>
  );
}
