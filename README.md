# SayfaSayfa — Turkish Reading for Language Learners

A full-stack web application for reading Turkish stories, saving vocabulary, practicing with flashcards, and tracking your progress. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

---

## Features

### 📚 Story Library
- Upload stories as TXT files or paste text directly
- Cover images (stored in Supabase Storage)
- Tags, reading level, author, and description
- Bookmark favorite stories
- Reading progress per story

### 📖 Distraction-Free Reader
- Adjustable font size, line spacing, and font family
- Dark mode
- Progress bar (auto-saved every 2 seconds)
- Resume reading from where you left off
- Bookmarks with custom labels (`Ctrl+B`)
- In-story search with navigation (`Ctrl+F`)
- Keyboard shortcuts throughout

### 🔤 Vocabulary System
Three color-coded highlight categories:
| Category | Color | When to Use |
|---|---|---|
| Known but forgot | `#c7893c` | You've seen it before |
| Completely unknown | `#d55e27` | Brand new word |
| Personal note | `#327874` | Any annotation |

- Click a highlighted word to open the detail panel
- Add meanings, translations, and notes
- Favorite words with ⭐
- Export to CSV or Anki-compatible TSV

### 🃏 Flashcards
- Auto-generated from your highlighted words
- Filter by category (unknown / forgot / note)
- Shuffle mode
- Flip animation
- Rate cards as Easy / Medium / Hard
- Review history stored in Supabase

### 🧠 Practice Modes
1. **Fill in the Blank** — complete the sentence from context
2. **Multiple Choice** — pick the correct word from four options
3. **Word Match** — drag-match words to meanings
4. **Typing Practice** — type the meaning from memory

All modes track accuracy and streak.

### 📊 Analytics Dashboard
- Stories completed, total words read, daily streak
- Weekly reading activity chart
- Vocabulary growth over 6 months
- Practice accuracy history
- Category breakdown pie chart

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Charts | Recharts |
| Icons | Lucide React |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourname/sayfasayfa.git
cd sayfasayfa
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a free project.

### 3. Run the database schema

In your Supabase project, open the **SQL Editor** and paste the contents of `supabase/schema.sql`. Run it.

### 4. Create a Storage bucket

In Supabase → **Storage**, create a bucket named `story-covers`.  
Set it to **Public**.

### 5. Configure environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in Supabase → **Settings → API**.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── auth/           # Login, signup, password reset
│   ├── library/        # Story grid + upload modal
│   ├── read/[id]/      # Full-featured reader
│   ├── vocabulary/     # Word dashboard + filters
│   ├── flashcards/     # Flashcard study session
│   ├── practice/       # Four practice modes
│   └── analytics/      # Charts & progress
├── components/
│   ├── layout/         # AppLayout (sidebar nav)
│   ├── library/        # StoryCard, UploadStoryModal
│   ├── reader/         # WordPanel, SelectionMenu, ReaderSettingsPanel
│   └── ui/             # Button, Input, Card, Modal, Badge, KeyboardHelp
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
├── lib/
│   ├── supabase/       # client.ts + server.ts
│   └── utils.ts        # cn, formatDate, export helpers
├── types/
│   └── index.ts        # All shared TypeScript types
└── middleware.ts        # Auth route protection
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `?` | Open keyboard shortcuts help |
| `Ctrl + F` | Search within the current story |
| `Ctrl + B` | Add a bookmark at current position |
| `F` | Toggle focus / fullscreen mode |
| `← / →` | Navigate search results |
| `Escape` | Close any open panel |

---

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile info |
| `stories` | Story metadata |
| `story_content` | Full story text |
| `reading_progress` | Per-user scroll position & % |
| `bookmarks` | Named position bookmarks |
| `highlighted_words` | Saved vocabulary with categories |
| `flashcard_reviews` | Per-card difficulty ratings |
| `practice_results` | Per-question correct/incorrect |
| `analytics` | Reading session events |

All tables use **Row Level Security** — users can only access their own data.

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel dashboard.

### Other platforms

```bash
npm run build
npm start
```

---

## Export Formats

### CSV Export
All vocabulary fields: word, category, meaning, translation, note, sentence, story, date added.

### Anki Export
Tab-separated `.txt` file:  
`Front (Turkish word) [tab] Back (meaning + translation) [tab] Example sentence`

Import into Anki via **File → Import**.

---

## Design System

| Token | Value |
|---|---|
| Forgot color | `#c7893c` |
| Unknown color | `#d55e27` |
| Note color | `#327874` |
| Accent | `#327874` |
| Font (body/reader) | Crimson Pro |
| Font (headings) | Playfair Display |

---

Made with ♥ for Turkish language learners.
