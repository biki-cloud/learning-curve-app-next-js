'use client';

// ダッシュボード画面

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';

interface DashboardData {
  today_review_count: number;
  total_cards: number;
  streak: number;
}

export default function HomePage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    void fetchDashboard();
  };

  const fetchDashboard = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = await response.json() as DashboardData;
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <div className="mt-4 text-sm text-muted-foreground">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/home" />
      <main className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* ウェルカムメッセージ */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            ダッシュボード
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">今日も学習を続けましょう ✨</p>
        </div>

        {/* 統計カード */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-10">
          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <span className="text-2xl">📚</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">今日のレビュー</p>
                </div>
              </div>
              <p className="text-4xl font-bold mb-1">
                {dashboardData?.today_review_count ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">枚</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <span className="text-2xl">🗂️</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">全カード数</p>
                </div>
              </div>
              <p className="text-4xl font-bold mb-1">
                {dashboardData?.total_cards ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">枚</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">ストリーク</p>
                </div>
              </div>
              <p className="text-4xl font-bold mb-1">
                {dashboardData?.streak ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">日連続</p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mb-6 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">クイックアクション</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/review"
              className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎯</div>
                <div className="font-bold text-base sm:text-lg mb-2">レビュー開始</div>
                <div className="text-xs sm:text-sm opacity-90">今日の復習を始める</div>
                <div className="mt-3 sm:mt-4 text-xs opacity-75">→ 今すぐ始める</div>
              </div>
            </Link>

            <Link
              href="/cards/ai"
              className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✨</div>
                <div className="font-bold text-base sm:text-lg mb-2">AI自動作成</div>
                <div className="text-xs sm:text-sm opacity-90">AIでカードを生成</div>
                <div className="mt-3 sm:mt-4 text-xs opacity-75">→ AIに任せる</div>
              </div>
            </Link>

            <Link
              href="/cards/new"
              className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">➕</div>
                <div className="font-bold text-base sm:text-lg mb-2">カード作成</div>
                <div className="text-xs sm:text-sm text-muted-foreground">新しいカードを追加</div>
                <div className="mt-3 sm:mt-4 text-xs text-muted-foreground">→ 手動で作成</div>
              </div>
            </Link>
          </div>
        </div>

        {/* カード一覧へのリンク */}
        <div className="text-center">
          <Link
            href="/cards"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
          >
            <span className="text-lg">📋</span>
            <span>カード一覧を見る</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
