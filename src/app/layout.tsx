import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SayfaSayfa — Turkish Reading for Language Learners',
  description: 'Read Turkish stories, save vocabulary, practice with flashcards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head />
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('sayfasayfa-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`
        }} />
        {children}
      </body>
    </html>
  );
}
