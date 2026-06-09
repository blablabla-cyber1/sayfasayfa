import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: 'var(--bg-primary)' }}>
      <p className="text-7xl mb-4">📖</p>
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Sayfa bulunamadı
      </h1>
      <p className="text-[var(--text-muted)] mb-8 text-lg">That page doesn't exist.</p>
      <Link
        href="/library"
        className="bg-[var(--accent-primary)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        Go to Library
      </Link>
    </div>
  );
}
