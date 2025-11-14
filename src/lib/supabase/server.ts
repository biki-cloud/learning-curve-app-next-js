// Supabase サーバーサイド用（API Routes など）
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Edge Runtime 用の Supabase クライアント作成
export function createServerClient(_request?: Request) {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// 認証済みユーザーを取得（API Routes 用）
export async function getAuthUser(request?: Request) {
  if (!request) return null;

  // Authorization ヘッダーからトークンを取得
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) {
    return null;
  }

  const supabase = createServerClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error !== null || !user) {
    return null;
  }

  return user;
}

