'use client';
import { useEffect } from 'react';

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void;
};

/**
 * Registers keyboard shortcuts.
 * Key format: "ctrl+k", "shift+f", "escape", "arrowleft", etc.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tag);

      for (const [combo, fn] of Object.entries(shortcuts)) {
        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');

        // Allow escape, arrow keys even in inputs
        const isNavKey = ['escape', 'arrowleft', 'arrowright'].includes(key);
        if (isInput && !isNavKey) continue;

        if (
          e.key.toLowerCase() === key &&
          (!needsCtrl || e.ctrlKey || e.metaKey) &&
          (!needsShift || e.shiftKey) &&
          (!needsAlt || e.altKey)
        ) {
          e.preventDefault();
          fn(e);
          break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, active]);
}
