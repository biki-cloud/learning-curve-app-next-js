'use client';

// ログイン画面

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(`エラー: ${error.message}`);
        setLoading(false);
      }
      // 成功時は自動的にリダイレクトされるため、ここでは何もしない
    } catch (error) {
      setMessage('エラーが発生しました。');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(`エラー: ${error.message}`);
      } else {
        setMessage('メールを確認してください。Magic Link をクリックしてログインしてください。');
      }
    } catch (error) {
      setMessage('エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-card text-card-foreground w-full max-w-md space-y-8 rounded-lg border p-8 shadow-sm">
        <div className="text-center">
          <div className="mb-4 text-5xl">📚</div>
          <h2 className="text-3xl font-bold tracking-tight">LearnCurve にログイン</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            Googleでログインするか、メールアドレスでMagic Linkを受け取ります
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {/* Google認証ボタン */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-ring flex w-full items-center justify-center rounded-md border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {loading ? '認証中...' : 'Googleでログイン'}
            </button>
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card text-muted-foreground px-2">または</span>
            </div>
          </div>

          {/* Magic Link フォーム */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="メールアドレス"
              />
            </div>

            {message && (
              <div
                className={`rounded-md border p-3 ${
                  message.includes('エラー')
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-green-500/50 bg-green-500/10 text-green-700'
                }`}
              >
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? '送信中...' : 'Magic Link を送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
