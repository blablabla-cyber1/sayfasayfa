'use client';
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored));
    } catch {}
  }, [key]);

  const set = (val: T) => {
    setValue(val);
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  };

  return [value, set];
}
