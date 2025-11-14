// Supabase Auth コールバック処理

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ホームにリダイレクト
  return NextResponse.redirect(new URL('/home', request.url));
}

