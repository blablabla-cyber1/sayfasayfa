export type ReadingLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper_intermediate' | 'advanced';
export type WordCategory = 'forgot' | 'unknown' | 'note';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PracticeMode = 'fill_blank' | 'multiple_choice' | 'match' | 'typing';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  description: string | null;
  tags: string[];
  reading_level: ReadingLevel | null;
  word_count: number;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoryContent {
  id: string;
  story_id: string;
  content: string;
  content_format: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  story_id: string;
  scroll_position: number;
  progress_percent: number;
  is_completed: boolean;
  last_read_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  story_id: string;
  position: number;
  label: string | null;
  created_at: string;
}

export interface HighlightedWord {
  id: string;
  user_id: string;
  story_id: string;
  word: string;
  sentence: string | null;
  position: number | null;
  category: WordCategory;
  user_note: string | null;
  user_meaning: string | null;
  user_translation: string | null;
  user_image_url: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  stories?: { title: string };
}

export interface FlashcardReview {
  id: string;
  user_id: string;
  word_id: string;
  difficulty: Difficulty;
  reviewed_at: string;
}

export interface PracticeResult {
  id: string;
  user_id: string;
  word_id: string | null;
  practice_mode: PracticeMode;
  is_correct: boolean;
  practiced_at: string;
}

export interface Analytics {
  id: string;
  user_id: string;
  event_type: string;
  story_id: string | null;
  words_read: number;
  session_duration: number;
  recorded_at: string;
}

export interface ReaderSettings {
  fontSize: number;
  lineSpacing: number;
  darkMode: boolean;
  fontFamily: string;
}

export const CATEGORY_COLORS: Record<WordCategory, string> = {
  forgot: '#c7893c',
  unknown: '#d55e27',
  note: '#327874',
};

export const CATEGORY_LABELS: Record<WordCategory, string> = {
  forgot: 'Known But Forgot',
  unknown: 'Completely Unknown',
  note: 'Personal Note',
};

export const LEVEL_LABELS: Record<ReadingLevel, string> = {
  beginner: 'Beginner (A1)',
  elementary: 'Elementary (A2)',
  intermediate: 'Intermediate (B1)',
  upper_intermediate: 'Upper Intermediate (B2)',
  advanced: 'Advanced (C1+)',
};
