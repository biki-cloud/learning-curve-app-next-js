'use client';

// Supabase Auth コールバック処理（クライアントサイド）
// URLフラグメント（#以降）のトークンを処理する

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void handleCallback();
  }, [router]);

  const handleCallback = async () => {
    try {
      // URLフラグメント（#以降）からトークンを取得
      // フラグメントはサーバーサイドで取得できないため、クライアントサイドで処理
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // クエリパラメータからcodeを取得（PKCEフローの場合）
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');

      if (code) {
        // PKCEフローの場合
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(`認証エラー: ${exchangeError.message}`);
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          return;
        }
      } else if (accessToken && refreshToken) {
        // フラグメントからトークンを直接設定
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError(`認証エラー: ${sessionError.message}`);
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          return;
        }
      } else {
        // 既存のセッションを確認
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError != null || !data.session) {
          setError('セッションが見つかりませんでした。');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          return;
        }
      }

      // セッションが正常に設定されたので、URLをクリーンアップしてホームにリダイレクト
      // フラグメントを削除するために、URLを変更
      window.history.replaceState({}, '', '/auth/callback');
      router.push('/home');
    } catch (err) {
      console.error('Callback error:', err);
      setError('エラーが発生しました。');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-4 p-8 bg-white rounded-lg shadow-md text-center">
          <div className="text-red-600">{error}</div>
          <div className="text-sm text-gray-600">ログインページにリダイレクトします...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-4 p-8 bg-white rounded-lg shadow-md text-center">
        <div className="text-lg">認証中...</div>
        <div className="text-sm text-gray-600">ログインを処理しています。少々お待ちください。</div>
      </div>
    </div>
  );
}

