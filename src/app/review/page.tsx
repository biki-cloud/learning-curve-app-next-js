'use client';

// レビュー画面（核心UI）

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Navbar from '@/components/navbar';

interface ReviewCard {
  card_id: number;
  question: string;
  answer: string;
  tags: string | null;
  ease: number;
  interval_days: number;
  rep_count: number;
  next_review_at: number;
  last_reviewed_at: number | null;
}

type Rating = 'again' | 'hard' | 'good';

export default function ReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLimitSelector, setShowLimitSelector] = useState(true);
  const [cardTransition, setCardTransition] = useState(false);
  const [isNoCardsAtStart, setIsNoCardsAtStart] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [reviewLimit, setReviewLimit] = useState<number | null>(null);

  useEffect(() => {
    void checkAuth();
  }, []);

  const fetchNextCard = useCallback(
    async (currentCardId?: number): Promise<ReviewCard[] | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return null;
        }

        // 既にレビューしたカードIDを取得
        const reviewedIds = cards.map((card) => card.card_id).filter((id) => id !== undefined);

        // URLパラメータを構築
        const params = new URLSearchParams();
        params.append('limit', '1');
        if (currentCardId) {
          params.append('currentCardId', currentCardId.toString());
        }
        if (reviewedIds.length > 0) {
          params.append('excludeIds', reviewedIds.join(','));
        }
        // キーワードが設定されている場合は追加
        if (keyword?.trim()) {
          params.append('keyword', keyword.trim());
        }

        const response = await fetch(`/api/review/today?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data: ReviewCard[] = await response.json();
          if (data.length > 0) {
            // 重複チェック（念のため）
            const existingCardIds = new Set(cards.map((card) => card.card_id));
            const duplicates = data.filter((card) => existingCardIds.has(card.card_id));

            if (duplicates.length > 0) {
              console.warn(
                'Duplicate cards detected:',
                duplicates.map((c) => c.card_id)
              );
              // 重複を除外
              const uniqueData = data.filter((card) => !existingCardIds.has(card.card_id));
              if (uniqueData.length > 0) {
                setCards((prev) => [...prev, ...uniqueData]);
                return uniqueData;
              }
              return null;
            }

            setCards((prev) => [...prev, ...data]);
            return data;
          }
        }
        return null;
      } catch (error) {
        console.error('Error fetching next card:', error);
        return null;
      }
    },
    [cards, keyword]
  );

  const handleRating = useCallback(
    async (rating: Rating) => {
      if (!cards[currentIndex]) return;

      setSubmitting(true);
      setCardTransition(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/review/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            card_id: cards[currentIndex].card_id,
            rating,
          }),
        });

        if (response.ok) {
          // アニメーションのための短い遅延
          await new Promise((resolve) => setTimeout(resolve, 300));

          // 完了したカード数を計算（currentIndex + 1）
          const completedCount = currentIndex + 1;

          // 指定枚数に達した場合は終了
          if (reviewLimit !== null && completedCount >= reviewLimit) {
            setCards([]);
            setCardTransition(false);
            return;
          }

          // 次のカードへ
          if (currentIndex < cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
          } else {
            // 現在のカードを完了したので、次のカードを取得
            const currentCardId = cards[currentIndex]?.card_id;
            setShowAnswer(false);
            // 次のカードを取得（取得後にcurrentIndexを更新）
            const nextCards = await fetchNextCard(currentCardId);
            if (nextCards && nextCards.length > 0) {
              setCurrentIndex(cards.length); // 新しいカードのインデックス
            } else {
              // これ以上カードがない
              setCards([]);
            }
          }
          setCardTransition(false);
        } else {
          alert('評価の送信に失敗しました');
          setCardTransition(false);
        }
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('エラーが発生しました');
        setCardTransition(false);
      } finally {
        setSubmitting(false);
      }
    },
    [cards, currentIndex, router, fetchNextCard, reviewLimit]
  );

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(false);
    // 実施枚数選択後に fetchReviewCards を呼ぶ
  };

  const fetchReviewCards = async (limit: number) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // URLパラメータを構築
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (keyword?.trim()) {
        params.append('keyword', keyword.trim());
      }

      const response = await fetch(`/api/review/today?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data: ReviewCard[] = await response.json();

        // 重複チェック（念のため）
        const uniqueData: ReviewCard[] = [];
        const seenIds = new Set<number>();
        for (const card of data) {
          if (card.card_id && !seenIds.has(card.card_id)) {
            seenIds.add(card.card_id);
            uniqueData.push(card);
          }
        }

        if (uniqueData.length !== data.length) {
          console.warn(
            `Removed ${data.length - uniqueData.length} duplicate cards from initial load`
          );
        }

        setCards(uniqueData);
        setReviewLimit(limit); // 指定枚数を保存
        if (uniqueData.length === 0) {
          setIsNoCardsAtStart(true);
          setShowLimitSelector(false);
          setLoading(false);
        } else {
          setIsNoCardsAtStart(false);
          setShowLimitSelector(false);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching review cards:', error);
      setLoading(false);
    }
  };

  const handleStartReview = (limit: number) => {
    void fetchReviewCards(limit);
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  if (showLimitSelector && !loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar currentPath="/review" />
        <div className="flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg">
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm sm:p-8">
              <div className="mb-6 text-center sm:mb-8">
                <div className="mb-4 text-4xl sm:text-5xl">📚</div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">復習を開始</h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  今日は何枚のカードを復習しますか？
                </p>
              </div>

              {/* キーワード入力欄 */}
              <div className="mb-6">
                <label
                  htmlFor="keyword"
                  className="text-muted-foreground mb-2 block text-sm font-medium"
                >
                  キーワード（オプション）
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={handleKeywordChange}
                  placeholder="例: アルゴリズム、データベース、React..."
                  className="bg-background border-input focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  キーワードを入力すると、関連するカードを優先して出題します
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { limit: 5, label: '5枚', desc: '軽め', emoji: '☕' },
                  { limit: 10, label: '10枚', desc: '標準', emoji: '📖' },
                  { limit: 20, label: '20枚', desc: '集中', emoji: '🔥' },
                  { limit: 30, label: '30枚', desc: '本格的', emoji: '💪' },
                ].map(({ limit, label, desc, emoji }) => (
                  <button
                    key={limit}
                    onClick={() => handleStartReview(limit)}
                    className="bg-background hover:bg-accent hover:text-accent-foreground flex flex-col items-center rounded-md border p-3 transition-colors sm:p-4"
                  >
                    <div className="mb-1 text-xl sm:text-2xl">{emoji}</div>
                    <div className="text-sm font-semibold sm:text-base">{label}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{desc}</div>
                  </button>
                ))}
              </div>
              <div className="border-t pt-4 sm:pt-6">
                <button
                  onClick={() => handleStartReview(50)}
                  className="bg-background hover:bg-accent hover:text-accent-foreground w-full rounded-md border px-4 py-2 text-sm font-medium transition-colors sm:py-3"
                >
                  <span className="mr-2 text-lg sm:text-xl">⚡</span>
                  カスタム: 50枚
                </button>
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/home"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  ← ダッシュボードに戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar currentPath="/review" />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <div className="text-muted-foreground mt-4 text-sm">カードを準備中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar currentPath="/review" />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            {isNoCardsAtStart ? (
              <>
                <div className="mb-4 text-5xl sm:text-6xl">📭</div>
                <h2 className="mb-2 text-xl font-bold tracking-tight sm:text-2xl">
                  レビューするカードがありません
                </h2>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                  今日は復習対象のカードがないようです。
                  <br />
                  新しいカードを作成するか、明日またお試しください。
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/cards/new"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  >
                    ➕ カードを作成
                  </Link>
                  <Link
                    href="/home"
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
                  >
                    ダッシュボードに戻る
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-5xl sm:text-6xl">🎉</div>
                <h2 className="mb-2 text-xl font-bold tracking-tight sm:text-2xl">
                  今日の復習は完了しました
                </h2>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base">お疲れ様でした！</p>
                <Link
                  href="/home"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  ダッシュボードに戻る
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  if (!currentCard) {
    return null;
  }
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const remaining = cards.length - currentIndex - 1;

  return (
    <div className="bg-background min-h-screen">
      <Navbar currentPath="/review" />
      <main className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <div>
            <div className="text-muted-foreground text-xs font-medium sm:text-sm">進捗</div>
            <div className="text-xl font-bold sm:text-2xl">{Math.round(progress)}%</div>
            <div className="text-muted-foreground text-xs sm:text-sm">
              {currentIndex + 1} / {cards.length} (残り {remaining} 枚)
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* カード表示 */}
        <div
          className={`bg-card text-card-foreground mb-4 flex min-h-[400px] flex-col justify-between rounded-lg border p-4 shadow-sm transition-all duration-300 sm:mb-6 sm:min-h-[450px] sm:p-6 md:p-8 ${
            cardTransition ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <div>
            {currentCard.tags && (
              <div className="mb-6 flex flex-wrap gap-2">
                {currentCard.tags.split(',').map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-6 text-xl font-bold leading-relaxed sm:mb-8 sm:text-2xl md:text-3xl">
              <MarkdownRenderer content={currentCard.question} />
            </div>

            {showAnswer && (
              <div className="bg-muted mt-6 rounded-md border p-4 sm:mt-8 sm:p-6">
                <div className="text-muted-foreground mb-3 text-xs font-medium sm:text-sm">
                  答え
                </div>
                <div className="text-base leading-relaxed sm:text-lg">
                  <MarkdownRenderer content={currentCard.answer} />
                </div>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors sm:mt-8 sm:px-6 sm:py-3 sm:text-base"
            >
              答えを見る
            </button>
          ) : (
            <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
              <p className="text-muted-foreground text-center text-xs font-medium sm:text-sm">
                どのくらい覚えていましたか？
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => handleRating('again')}
                  disabled={submitting}
                  className="border-destructive/50 bg-background text-destructive hover:bg-destructive/10 flex flex-col items-center rounded-md border px-2 py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-4 sm:text-sm"
                >
                  <div className="mb-1 text-lg sm:text-xl">❌</div>
                  <div className="font-semibold">Again</div>
                </button>
                <button
                  onClick={() => handleRating('hard')}
                  disabled={submitting}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex flex-col items-center rounded-md border px-2 py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-4 sm:text-sm"
                >
                  <div className="mb-1 text-lg sm:text-xl">🤔</div>
                  <div className="font-semibold">Hard</div>
                </button>
                <button
                  onClick={() => handleRating('good')}
                  disabled={submitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col items-center rounded-md px-2 py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-4 sm:text-sm"
                >
                  <div className="mb-1 text-lg sm:text-xl">✅</div>
                  <div className="font-semibold">Good</div>
                </button>
              </div>
              {submitting && (
                <div className="mt-4 text-center">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
