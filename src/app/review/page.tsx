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
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [isNoCardsAtStart, setIsNoCardsAtStart] = useState(false);
  const [keyword, setKeyword] = useState('');

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
        if (keyword && keyword.trim()) {
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
    [cards, currentIndex, router, fetchNextCard]
  );

  // キーボードショートカット
  useEffect(() => {
    if (showLimitSelector || loading || cards.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // スペースキーで答えを表示/非表示
      if (e.key === ' ' && !submitting) {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
        }
      }
      // 1, 2, 3で評価
      if (showAnswer && !submitting && cards[currentIndex]) {
        if (e.key === '1') {
          void handleRating('again');
        } else if (e.key === '2') {
          void handleRating('hard');
        } else if (e.key === '3') {
          void handleRating('good');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    showAnswer,
    submitting,
    showLimitSelector,
    loading,
    cards.length,
    currentIndex,
    cards,
    handleRating,
  ]);

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
      if (keyword && keyword.trim()) {
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
        <div className="flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="bg-card text-card-foreground rounded-lg border p-8 shadow-sm">
              <div className="mb-8 text-center">
                <div className="mb-4 text-5xl">📚</div>
                <h2 className="mb-2 text-3xl font-bold tracking-tight">復習を開始</h2>
                <p className="text-muted-foreground">今日は何枚のカードを復習しますか？</p>
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

              <div className="mb-6 grid grid-cols-2 gap-4">
                {[
                  { limit: 5, label: '5枚', desc: '軽め', emoji: '☕' },
                  { limit: 10, label: '10枚', desc: '標準', emoji: '📖' },
                  { limit: 20, label: '20枚', desc: '集中', emoji: '🔥' },
                  { limit: 30, label: '30枚', desc: '本格的', emoji: '💪' },
                ].map(({ limit, label, desc, emoji }) => (
                  <button
                    key={limit}
                    onClick={() => handleStartReview(limit)}
                    className="bg-background hover:bg-accent hover:text-accent-foreground flex flex-col items-center rounded-md border p-4 transition-colors"
                  >
                    <div className="mb-1 text-2xl">{emoji}</div>
                    <div className="font-semibold">{label}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{desc}</div>
                  </button>
                ))}
              </div>
              <div className="border-t pt-6">
                <button
                  onClick={() => handleStartReview(50)}
                  className="bg-background hover:bg-accent hover:text-accent-foreground w-full rounded-md border px-4 py-3 text-sm font-medium transition-colors"
                >
                  <span className="mr-2 text-xl">⚡</span>
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
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="mx-4 max-w-md text-center">
            {isNoCardsAtStart ? (
              <>
                <div className="mb-4 text-6xl">📭</div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight">
                  レビューするカードがありません
                </h2>
                <p className="text-muted-foreground mb-6">
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
                <div className="mb-4 text-6xl">🎉</div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight">今日の復習は完了しました</h2>
                <p className="text-muted-foreground mb-6">お疲れ様でした！</p>
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
      <main className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-sm font-medium">進捗</div>
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <div className="text-muted-foreground text-sm">
              {currentIndex + 1} / {cards.length} (残り {remaining} 枚)
            </div>
          </div>
          {showKeyboardHints && (
            <button
              onClick={() => setShowKeyboardHints(false)}
              className="bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              ⌨️ キーボードショートカット
            </button>
          )}
        </div>

        {/* プログレスバー */}
        <div className="mb-6">
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* キーボードショートカットヒント */}
        {showKeyboardHints && (
          <div className="bg-muted mb-6 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm font-semibold">⌨️ キーボードショートカット</div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <div>スペースキー: 答えを表示</div>
                  <div>1: Again | 2: Hard | 3: Good</div>
                </div>
              </div>
              <button
                onClick={() => setShowKeyboardHints(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* カード表示 */}
        <div
          className={`bg-card text-card-foreground mb-6 flex min-h-[450px] flex-col justify-between rounded-lg border p-6 shadow-sm transition-all duration-300 md:p-8 ${
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

            <div className="mb-8 text-2xl font-bold leading-relaxed md:text-3xl">
              <MarkdownRenderer content={currentCard.question} />
            </div>

            {showAnswer && (
              <div className="bg-muted mt-8 rounded-md border p-6">
                <div className="text-muted-foreground mb-3 text-sm font-medium">答え</div>
                <div className="text-lg leading-relaxed">
                  <MarkdownRenderer content={currentCard.answer} />
                </div>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 w-full rounded-md px-6 py-3 text-base font-medium transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <span>答えを見る</span>
                <span className="text-sm opacity-75">(スペースキー)</span>
              </span>
            </button>
          ) : (
            <div className="mt-8 space-y-4">
              <p className="text-muted-foreground text-center text-sm font-medium">
                どのくらい覚えていましたか？
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleRating('again')}
                  disabled={submitting}
                  className="border-destructive/50 bg-background text-destructive hover:bg-destructive/10 flex flex-col items-center rounded-md border px-4 py-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-1 text-xl">❌</div>
                  <div className="font-semibold">Again</div>
                  <div className="mt-1 text-xs opacity-75">(1)</div>
                </button>
                <button
                  onClick={() => handleRating('hard')}
                  disabled={submitting}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex flex-col items-center rounded-md border px-4 py-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-1 text-xl">🤔</div>
                  <div className="font-semibold">Hard</div>
                  <div className="mt-1 text-xs opacity-75">(2)</div>
                </button>
                <button
                  onClick={() => handleRating('good')}
                  disabled={submitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col items-center rounded-md px-4 py-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-1 text-xl">✅</div>
                  <div className="font-semibold">Good</div>
                  <div className="mt-1 text-xs opacity-75">(3)</div>
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
