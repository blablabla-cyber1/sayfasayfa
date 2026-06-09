'use client';
import { CATEGORY_COLORS, WordCategory, CATEGORY_LABELS } from '@/types';

interface SelectionMenuProps {
  x: number;
  y: number;
  onSelect: (category: WordCategory) => void;
  onClose: () => void;
}

const CATEGORIES: { key: WordCategory; emoji: string }[] = [
  { key: 'forgot', emoji: '🟠' },
  { key: 'unknown', emoji: '🔴' },
  { key: 'note', emoji: '🟢' },
];

export function SelectionMenu({ x, y, onSelect, onClose }: SelectionMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="selection-menu"
        style={{ left: x, top: y - 54, zIndex: 50 }}
      >
        {CATEGORIES.map(({ key, emoji }) => (
          <button
            key={key}
            onClick={() => { onSelect(key); onClose(); }}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
            title={CATEGORY_LABELS[key]}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[key] }}
            />
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap" style={{ fontSize: 10 }}>
              {key === 'forgot' ? 'Forgot' : key === 'unknown' ? 'Unknown' : 'Note'}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
