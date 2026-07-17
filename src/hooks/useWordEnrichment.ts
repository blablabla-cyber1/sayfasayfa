'use client';
import { useCallback } from 'react';

export interface EnrichmentResult {
  englishMeaning: string | null;
  imageUrl: string | null;
  exampleSentence: string | null;
}

/**
 * Looks up an English gloss for a Turkish word using MyMemory
 * (same free, no-key API already used for Arabic translation).
 */
async function fetchEnglishMeaning(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=tr|en`
    );
    const data = await res.json();
    const text = data?.responseData?.translatedText;
    if (!text || typeof text !== 'string') return null;
    // MyMemory sometimes echoes the query back untranslated — treat that as "no result"
    if (text.trim().toLowerCase() === word.trim().toLowerCase()) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Searches Openverse (openverse.org) for a Creative Commons licensed
 * photo matching the English meaning. No API key required.
 */
async function fetchImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=3&mature=false`
    );
    const data = await res.json();
    const results: { url?: string; thumbnail?: string }[] = data?.results || [];
    const first = results.find(r => r.thumbnail || r.url);
    return first?.thumbnail || first?.url || null;
  } catch {
    return null;
  }
}

/**
 * Pulls a second example sentence containing the word from Tatoeba,
 * a free open sentence database that includes Turkish.
 */
async function fetchExampleSentence(word: string, excludeSentence?: string | null): Promise<string | null> {
  try {
    const res = await fetch(
      `https://tatoeba.org/eng/api_v0/search?from=tur&to=eng&query=${encodeURIComponent(word)}&sort=relevance`
    );
    const data = await res.json();
    const results: { text?: string }[] = data?.results || [];
    const candidates = results
      .map(r => r.text)
      .filter((t): t is string => !!t && t.trim().length > 0)
      .filter(t => t.trim() !== (excludeSentence || '').trim());
    if (!candidates.length) return null;
    // Prefer a reasonably short, readable sentence
    candidates.sort((a, b) => a.length - b.length);
    return candidates[0];
  } catch {
    return null;
  }
}

export function useWordEnrichment() {
  const enrich = useCallback(async (word: string, existingSentence?: string | null): Promise<EnrichmentResult> => {
    const englishMeaning = await fetchEnglishMeaning(word);

    const [imageUrl, exampleSentence] = await Promise.all([
      fetchImage(englishMeaning || word),
      fetchExampleSentence(word, existingSentence),
    ]);

    return { englishMeaning, imageUrl, exampleSentence };
  }, []);

  return { enrich };
}
