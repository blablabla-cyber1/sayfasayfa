'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (err) { setError(err.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-primary)] shadow-lg mb-4">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Reset password</h1>
        </div>

        {sent ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <Link href="/auth/login" className="text-sm text-[var(--accent-primary)] hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail size={15} />}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
            <p className="text-center mt-4 text-sm text-[var(--text-muted)]">
              <Link href="/auth/login" className="text-[var(--accent-primary)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
