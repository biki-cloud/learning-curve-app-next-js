'use client';

// レビュー画面（核心UI）

import { useEffect, useState } from 'react';
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
  const [selectedLimit, setSelectedLimit] = useState<number | null>(null);
  const [cardTransition, setCardTransition] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [isNoCardsAtStart, setIsNoCardsAtStart] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnswer, submitting, showLimitSelector, loading, cards.length, currentIndex]);

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

      const response = await fetch(`/api/review/today?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = await response.json() as ReviewCard[];
        setCards(data);
        if (data.length === 0) {
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
    setSelectedLimit(limit);
    void fetchReviewCards(limit);
  };

  const fetchNextCard = async (currentCardId?: number): Promise<ReviewCard[] | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return null;
      }

      const url = currentCardId
        ? `/api/review/today?limit=1&currentCardId=${currentCardId}`
        : '/api/review/today?limit=1';

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = await response.json() as ReviewCard[];
        if (data.length > 0) {
          setCards((prev) => [...prev, ...data]);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching next card:', error);
      return null;
    }
  };

  const handleRating = async (rating: Rating) => {
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
  };

  if (showLimitSelector && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/review" />
        <div className="flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="mb-4 text-5xl">📚</div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  復習を開始
                </h2>
                <p className="text-muted-foreground">
                  今日は何枚のカードを復習しますか？
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { limit: 5, label: '5枚', desc: '軽め', emoji: '☕' },
                  { limit: 10, label: '10枚', desc: '標準', emoji: '📖' },
                  { limit: 20, label: '20枚', desc: '集中', emoji: '🔥' },
                  { limit: 30, label: '30枚', desc: '本格的', emoji: '💪' },
                ].map(({ limit, label, desc, emoji }) => (
                  <button
                    key={limit}
                    onClick={() => handleStartReview(limit)}
                    className="flex flex-col items-center rounded-md border bg-background p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t">
                <button
                  onClick={() => handleStartReview(50)}
                  className="w-full rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="text-xl mr-2">⚡</span>
                  カスタム: 50枚
                </button>
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/home"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/review" />
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <div className="mt-4 text-sm text-muted-foreground">カードを準備中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/review" />
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-center max-w-md mx-4">
            {isNoCardsAtStart ? (
              <>
                <div className="text-6xl mb-4">📭</div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  レビューするカードがありません
                </h2>
                <p className="text-muted-foreground mb-6">
                  今日は復習対象のカードがないようです。<br />
                  新しいカードを作成するか、明日またお試しください。
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/cards/new"
                    className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90"
                  >
                    ➕ カードを作成
                  </Link>
                  <Link
                    href="/home"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    ダッシュボードに戻る
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  今日の復習は完了しました
                </h2>
                <p className="text-muted-foreground mb-6">お疲れ様でした！</p>
                <Link
                  href="/home"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90"
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
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/review" />
      <main className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">進捗</div>
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} / {cards.length} (残り {remaining} 枚)
            </div>
          </div>
          {showKeyboardHints && (
            <button
              onClick={() => setShowKeyboardHints(false)}
              className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              ⌨️ キーボードショートカット
            </button>
          )}
        </div>

        {/* プログレスバー */}
        <div className="mb-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* キーボードショートカットヒント */}
        {showKeyboardHints && (
          <div className="mb-6 rounded-lg border bg-muted p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold mb-2">⌨️ キーボードショートカット</div>
                <div className="text-xs text-muted-foreground space-y-1">
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
          className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 md:p-8 mb-6 min-h-[450px] flex flex-col justify-between transition-all duration-300 ${
            cardTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <div>
            {currentCard.tags && (
              <div className="flex flex-wrap gap-2 mb-6">
                {currentCard.tags.split(',').map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            <div className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed">
              <MarkdownRenderer content={currentCard.question} />
            </div>

            {showAnswer && (
              <div className="mt-8 rounded-md border bg-muted p-6">
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  答え
                </div>
                <div className="text-lg leading-relaxed">
                  <MarkdownRenderer content={currentCard.answer} />
                </div>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full mt-8 rounded-md bg-primary text-primary-foreground px-6 py-3 text-base font-medium transition-colors hover:bg-primary/90"
            >
              <span className="flex items-center justify-center gap-2">
                <span>答えを見る</span>
                <span className="text-sm opacity-75">(スペースキー)</span>
              </span>
            </button>
          ) : (
            <div className="mt-8 space-y-4">
              <p className="text-sm font-medium text-center text-muted-foreground">
                どのくらい覚えていましたか？
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleRating('again')}
                  disabled={submitting}
                  className="flex flex-col items-center rounded-md border border-destructive/50 bg-background px-4 py-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-xl mb-1">❌</div>
                  <div className="font-semibold">Again</div>
                  <div className="text-xs mt-1 opacity-75">(1)</div>
                </button>
                <button
                  onClick={() => handleRating('hard')}
                  disabled={submitting}
                  className="flex flex-col items-center rounded-md border bg-secondary text-secondary-foreground px-4 py-4 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-xl mb-1">🤔</div>
                  <div className="font-semibold">Hard</div>
                  <div className="text-xs mt-1 opacity-75">(2)</div>
                </button>
                <button
                  onClick={() => handleRating('good')}
                  disabled={submitting}
                  className="flex flex-col items-center rounded-md bg-primary text-primary-foreground px-4 py-4 text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-xl mb-1">✅</div>
                  <div className="font-semibold">Good</div>
                  <div className="text-xs mt-1 opacity-75">(3)</div>
                </button>
              </div>
              {submitting && (
                <div className="text-center mt-4">
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

