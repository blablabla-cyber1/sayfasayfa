'use client';
import { Modal } from '@/components/ui/Modal';

const SHORTCUTS = [
  { section: 'Library' },
  { key: 'Ctrl + N', desc: 'Upload a new story' },
  { key: 'Ctrl + /', desc: 'Focus search' },

  { section: 'Reader' },
  { key: 'Ctrl + F', desc: 'Search in story' },
  { key: 'Ctrl + B', desc: 'Add bookmark at current position' },
  { key: 'F', desc: 'Toggle focus / fullscreen mode' },
  { key: '← / →', desc: 'Previous / next search result' },
  { key: 'Escape', desc: 'Close panels & menus' },

  { section: 'Flashcards' },
  { key: 'Space', desc: 'Flip card' },
  { key: '1', desc: 'Mark Easy' },
  { key: '2', desc: 'Mark Medium' },
  { key: '3', desc: 'Mark Hard' },
  { key: '← / →', desc: 'Previous / next card' },

  { section: 'Global' },
  { key: '?', desc: 'Show this help' },
];

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="p-5 space-y-1">
        {SHORTCUTS.map((item, i) =>
          'section' in item && !('key' in item) ? (
            <p key={i} className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] pt-3 pb-1 first:pt-0">
              {item.section}
            </p>
          ) : (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border-color)] last:border-0">
              <span className="text-sm text-[var(--text-secondary)]">{'desc' in item ? item.desc : ''}</span>
              <kbd className="font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[var(--text-muted)]">
                {'key' in item ? item.key : ''}
              </kbd>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
