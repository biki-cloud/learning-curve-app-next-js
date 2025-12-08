'use client';

// ダッシュボード画面

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';

// GitHubの草のようなレビュー履歴グラフコンポーネント
type Period = '1month' | '3months' | '6months' | '1year';

function ReviewHistoryGraph({ reviewHistory }: { reviewHistory: Record<string, number> }) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1month');

  // 期間に応じた日数を取得
  const getDaysForPeriod = (period: Period): number => {
    switch (period) {
      case '1month':
        return 30;
      case '3months':
        return 90;
      case '6months':
        return 180;
      case '1year':
        return 365;
      default:
        return 30;
    }
  };

  // 期間に応じたラベルを取得
  const getPeriodLabel = (period: Period): string => {
    switch (period) {
      case '1month':
        return '1ヶ月';
      case '3months':
        return '3ヶ月';
      case '6months':
        return '6ヶ月';
      case '1year':
        return '1年';
      default:
        return '1ヶ月';
    }
  };

  // 期間に応じた草のサイズクラスを取得（モバイル対応）
  const getCellSizeClass = (period: Period): string => {
    switch (period) {
      case '1month':
        return 'h-3.5 w-3.5 sm:h-5 sm:w-5';
      case '3months':
        return 'h-3 w-3 sm:h-4 sm:w-4';
      case '6months':
        return 'h-2.5 w-2.5 sm:h-3.5 sm:w-3.5';
      case '1year':
        return 'h-2.5 w-2.5 sm:h-3 sm:w-3';
      default:
        return 'h-2.5 w-2.5 sm:h-3 sm:w-3';
    }
  };

  // 選択された期間の日付を生成
  const generateDateRange = (days: number) => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates.reverse(); // 古い順から新しい順に
  };

  const days = getDaysForPeriod(selectedPeriod);
  const dates = useMemo(() => generateDateRange(days), [days]);

  // 選択された期間のデータのみをフィルタリング
  const filteredReviewHistory = useMemo(() => {
    const filtered: Record<string, number> = {};
    for (const dateStr of dates) {
      if (reviewHistory[dateStr] !== undefined) {
        filtered[dateStr] = reviewHistory[dateStr];
      }
    }
    return filtered;
  }, [dates, reviewHistory]);

  useEffect(() => {
    // 最大レビュー数を計算（フィルタリング後のデータから）
    const counts = Object.values(filteredReviewHistory);
    setMaxCount(Math.max(...counts, 1));
  }, [filteredReviewHistory]);

  // レビュー数に応じた色の濃淡を決定（多いほど濃い）
  const getColorIntensity = (count: number): string => {
    if (count === 0) return 'bg-muted';
    if (maxCount === 0) return 'bg-muted';
    const intensity = count / maxCount;
    // 両方のモードで数字が大きいほど濃い色（多いほど濃い）
    if (intensity < 0.25) return 'bg-green-200 dark:bg-green-300';
    if (intensity < 0.5) return 'bg-green-400 dark:bg-green-500';
    if (intensity < 0.75) return 'bg-green-600 dark:bg-green-700';
    return 'bg-green-800 dark:bg-green-900';
  };

  // 週の開始日を取得（月曜日を週の開始とする）
  const getWeekStart = (dateStr: string): number => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // 月曜日 = 0, 日曜日 = 6
  };

  // 日付を週ごとにグループ化
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  let currentWeekStart = -1;

  for (const dateStr of dates) {
    const weekStart = getWeekStart(dateStr);
    if (currentWeekStart === -1) {
      currentWeekStart = weekStart;
      // 最初の週の前に空の日を追加
      for (let i = 0; i < weekStart; i++) {
        currentWeek.push('');
      }
    }
    currentWeek.push(dateStr);
    if (weekStart === 6) {
      // 日曜日で週が終わる
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const periods: Period[] = ['1month', '3months', '6months', '1year'];

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="mb-1 sm:mb-0">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">
              過去{getPeriodLabel(selectedPeriod)}のレビュー活動
            </p>
            {/* 期間選択タブ */}
            <div className="flex gap-1 rounded-md border border-border bg-background p-1 sm:p-1">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded px-2 py-1.5 text-[11px] font-medium transition-colors sm:px-2 sm:py-1 sm:text-xs ${
                    selectedPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent'
                  }`}
                >
                  {getPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex sm:gap-4">
            <span className="text-xs">少ない</span>
            <div className="flex gap-0.5 sm:gap-1">
              <div className={`${getCellSizeClass(selectedPeriod)} rounded bg-muted`}></div>
              <div
                className={`${getCellSizeClass(selectedPeriod)} rounded bg-green-200 dark:bg-green-300`}
              ></div>
              <div
                className={`${getCellSizeClass(selectedPeriod)} rounded bg-green-400 dark:bg-green-500`}
              ></div>
              <div
                className={`${getCellSizeClass(selectedPeriod)} rounded bg-green-600 dark:bg-green-700`}
              ></div>
              <div
                className={`${getCellSizeClass(selectedPeriod)} rounded bg-green-800 dark:bg-green-900`}
              ></div>
            </div>
            <span className="text-xs">多い</span>
          </div>
        </div>
        {hoveredDate && filteredReviewHistory[hoveredDate] !== undefined && (
          <div className="hidden text-xs font-medium text-foreground sm:block sm:text-sm">
            {hoveredDate}: {filteredReviewHistory[hoveredDate]}問
          </div>
        )}
      </div>
      <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-0.5 sm:gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5 sm:gap-1">
              {week.map((dateStr, dayIndex) => {
                const cellSizeClass = getCellSizeClass(selectedPeriod);
                if (!dateStr) {
                  return <div key={`${weekIndex}-${dayIndex}`} className={cellSizeClass}></div>;
                }
                const count = filteredReviewHistory[dateStr] ?? 0;
                return (
                  <div
                    key={dateStr}
                    className={`${cellSizeClass} cursor-pointer rounded-sm transition-all ${getColorIntensity(count)} ${
                      hoveredDate === dateStr ? 'scale-110 ring-2 ring-foreground' : ''
                    }`}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => setHoveredDate(hoveredDate === dateStr ? null : dateStr)}
                    title={`${dateStr}: ${count}問`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
        <span>
          合計: {Object.values(filteredReviewHistory).reduce((sum, count) => sum + count, 0)}問
        </span>
        <span>
          平均:{' '}
          {Math.round(
            (Object.values(filteredReviewHistory).reduce((sum, count) => sum + count, 0) / days) *
              10
          ) / 10}
          問/日
        </span>
      </div>
    </div>
  );
}

interface DashboardData {
  today_review_count: number;
  today_completed_reviews: number;
  total_cards: number;
  review_history: Record<string, number>; // 日付文字列（YYYY-MM-DD）をキー、レビュー数を値とするオブジェクト
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
        const data = (await response.json()) as DashboardData;
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
      <div className="flex min-h-screen items-center justify-center bg-background">
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
      <main className="container mx-auto px-3 py-4 sm:px-6 sm:py-12 lg:px-8">
        {/* ウェルカムメッセージ */}
        <div className="mb-4 sm:mb-12">
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:mb-2 sm:text-4xl md:text-5xl">
            ダッシュボード
          </h1>
          <p className="text-xs text-muted-foreground sm:text-lg">今日も学習を続けましょう</p>
        </div>

        {/* 統計カード */}
        <div className="mb-4 grid grid-cols-3 gap-2.5 sm:mb-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {/* 今日のレビューカード */}
          <div className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md">
            <div className="p-3 sm:p-8">
              <div className="mb-2 flex items-center justify-between sm:mb-4">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">
                  今日のレビュー
                </p>
                <span className="text-base sm:text-2xl">📚</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground sm:text-5xl">
                  {dashboardData?.today_review_count ?? 0}
                </p>
                <p className="text-[11px] text-muted-foreground sm:text-sm">枚</p>
              </div>
              {dashboardData && dashboardData.today_review_count > 0 && (
                <div className="mt-2 hidden items-center gap-2 text-xs text-muted-foreground sm:mt-4 sm:flex">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground"></span>
                  レビュー待ち
                </div>
              )}
            </div>
          </div>

          {/* 今日完了したレビュー数カード */}
          {(() => {
            const completedCount = dashboardData?.today_completed_reviews ?? 0;
            // 完了数に応じた背景色を決定（GitHubの草のように）
            const getCardBgColor = (count: number): string => {
              if (count === 0) return 'bg-muted';
              if (count <= 5) return 'bg-green-200 dark:bg-green-300';
              if (count <= 10) return 'bg-green-400 dark:bg-green-500';
              if (count <= 20) return 'bg-green-600 dark:bg-green-700';
              return 'bg-green-800 dark:bg-green-900';
            };
            return (
              <div
                className={`group relative overflow-hidden rounded-lg border border-border ${getCardBgColor(completedCount)} text-card-foreground transition-all hover:shadow-md`}
              >
                <div className="p-3 sm:p-8">
                  <div className="mb-2 flex items-center justify-between sm:mb-4">
                    <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">
                      今日完了
                    </p>
                    <span className="text-base sm:text-2xl">✅</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-bold text-foreground sm:text-5xl">
                      {completedCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground sm:text-sm">問</p>
                  </div>
                  {completedCount > 0 && (
                    <div className="mt-2 hidden items-center gap-2 text-xs text-muted-foreground sm:mt-4 sm:flex">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      今日も頑張りました！
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 全カード数カード */}
          <div className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:shadow-md">
            <div className="p-3 sm:p-8">
              <div className="mb-2 flex items-center justify-between sm:mb-4">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">
                  全カード数
                </p>
                <span className="text-base sm:text-2xl">🗂️</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground sm:text-5xl">
                  {dashboardData?.total_cards ?? 0}
                </p>
                <p className="text-[11px] text-muted-foreground sm:text-sm">枚</p>
              </div>
              {dashboardData && dashboardData.total_cards > 0 && (
                <div className="mt-2 hidden items-center gap-2 text-xs text-muted-foreground sm:mt-4 sm:flex">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground"></span>
                  学習中
                </div>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mb-4 sm:mb-12">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-6 sm:text-xl">
            クイックアクション
          </h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {/* レビュー開始 */}
            <Link
              href="/review"
              className="group relative flex min-h-[72px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-foreground/20 hover:shadow-md active:scale-[0.98] sm:min-h-0 sm:items-start sm:justify-start"
            >
              <div className="p-3 sm:p-8">
                <div className="mb-1.5 text-xl sm:mb-3 sm:text-4xl">🎯</div>
                <div className="mb-0 text-[11px] font-semibold sm:mb-1 sm:text-lg">レビュー</div>
                <div className="hidden text-xs text-muted-foreground sm:mb-4 sm:block sm:text-sm">
                  今日の復習を始める
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                  <span>今すぐ始める</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* AI自動作成 */}
            <Link
              href="/cards/ai"
              className="group relative flex min-h-[72px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-foreground/20 hover:shadow-md active:scale-[0.98] sm:min-h-0 sm:items-start sm:justify-start"
            >
              <div className="p-3 sm:p-8">
                <div className="mb-1.5 text-xl sm:mb-3 sm:text-4xl">✨</div>
                <div className="mb-0 text-[11px] font-semibold sm:mb-1 sm:text-lg">AI作成</div>
                <div className="hidden text-xs text-muted-foreground sm:mb-4 sm:block sm:text-sm">
                  AIでカードを生成
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                  <span>AIに任せる</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* カード作成 */}
            <Link
              href="/cards/new"
              className="group relative flex min-h-[72px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-foreground/20 hover:shadow-md active:scale-[0.98] sm:min-h-0 sm:items-start sm:justify-start"
            >
              <div className="p-3 sm:p-8">
                <div className="mb-1.5 text-xl sm:mb-3 sm:text-4xl">➕</div>
                <div className="mb-0 text-[11px] font-semibold sm:mb-1 sm:text-lg">作成</div>
                <div className="hidden text-xs text-muted-foreground sm:mb-4 sm:block sm:text-sm">
                  新しいカードを追加
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                  <span>手動で作成</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* カード一覧 */}
            <Link
              href="/cards"
              className="group relative flex min-h-[72px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-foreground/20 hover:shadow-md active:scale-[0.98] sm:min-h-0 sm:items-start sm:justify-start"
            >
              <div className="p-3 sm:p-8">
                <div className="mb-1.5 text-xl sm:mb-3 sm:text-4xl">📋</div>
                <div className="mb-0 text-[11px] font-semibold sm:mb-1 sm:text-lg">一覧</div>
                <div className="hidden text-xs text-muted-foreground sm:mb-4 sm:block sm:text-sm">
                  カード一覧を見る
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                  <span>一覧を見る</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* レビュー履歴（GitHubの草のようなビジュアル） */}
        {dashboardData?.review_history && (
          <div className="mb-4 sm:mb-12">
            <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-6 sm:text-xl">
              レビュー履歴
            </h3>
            <ReviewHistoryGraph reviewHistory={dashboardData.review_history} />
          </div>
        )}
      </main>
    </div>
  );
}
