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
      <main className="container mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* ウェルカムメッセージ */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-2">
            ダッシュボード
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">今日も学習を続けましょう</p>
        </div>

        {/* 統計カード */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 mb-8 sm:mb-12">
          {/* 今日のレビューカード */}
          <div className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">今日のレビュー</p>
                <span className="text-2xl">📚</span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl sm:text-5xl font-semibold text-foreground">
                  {dashboardData?.today_review_count ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">枚のカード</p>
              </div>
              {dashboardData && dashboardData.today_review_count > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground"></span>
                  レビュー待ち
                </div>
              )}
            </div>
          </div>

          {/* 全カード数カード */}
          <div className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">全カード数</p>
                <span className="text-2xl">🗂️</span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl sm:text-5xl font-semibold text-foreground">
                  {dashboardData?.total_cards ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">枚のカード</p>
              </div>
              {dashboardData && dashboardData.total_cards > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground"></span>
                  学習中
                </div>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-xl font-semibold mb-6 text-foreground">
            クイックアクション
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* レビュー開始 */}
            <Link
              href="/review"
              className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md hover:border-foreground/20"
            >
              <div className="p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3">🎯</div>
                <div className="font-semibold text-base sm:text-lg mb-1">レビュー開始</div>
                <div className="text-sm text-muted-foreground mb-4">今日の復習を始める</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>今すぐ始める</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* AI自動作成 */}
            <Link
              href="/cards/ai"
              className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md hover:border-foreground/20"
            >
              <div className="p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3">✨</div>
                <div className="font-semibold text-base sm:text-lg mb-1">AI自動作成</div>
                <div className="text-sm text-muted-foreground mb-4">AIでカードを生成</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>AIに任せる</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* カード作成 */}
            <Link
              href="/cards/new"
              className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md hover:border-foreground/20"
            >
              <div className="p-6 sm:p-8">
                <div className="text-3xl sm:text-4xl mb-3">➕</div>
                <div className="font-semibold text-base sm:text-lg mb-1">カード作成</div>
                <div className="text-sm text-muted-foreground mb-4">新しいカードを追加</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>手動で作成</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* カード一覧へのリンク */}
        <div className="text-center">
          <Link
            href="/cards"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <span>📋</span>
            <span>カード一覧を見る</span>
            <span>→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
