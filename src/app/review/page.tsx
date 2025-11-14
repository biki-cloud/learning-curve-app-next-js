'use client';

// レビュー画面（核心UI）

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    fetchReviewCards();
  };

  const fetchReviewCards = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/review/today', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data);
        if (data.length === 0) {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching review cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating: Rating) => {
    if (!cards[currentIndex]) return;

    setSubmitting(true);

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
        // 次のカードへ
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setShowAnswer(false);
        } else {
          // 全て完了
          setCards([]);
        }
      } else {
        alert('評価の送信に失敗しました');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            今日の復習は完了しました
          </h2>
          <p className="text-gray-600 mb-6">お疲れ様でした！</p>
          <Link
            href="/home"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/home" className="text-xl font-bold text-gray-900">
                LearnCurve
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* プログレスバー */}
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* カード表示 */}
          <div className="bg-white shadow-lg rounded-lg p-8 mb-6 min-h-[400px] flex flex-col justify-between">
            <div>
              {currentCard.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentCard.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-2xl font-bold text-gray-900 mb-6">
                <MarkdownRenderer content={currentCard.question} />
              </div>

              {showAnswer && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                  <MarkdownRenderer content={currentCard.answer} />
                </div>
              )}
            </div>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full mt-6 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                答えを見る
              </button>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">
                  どのくらい覚えていましたか？
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleRating('again')}
                    disabled={submitting}
                    className="px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    ❌ Again
                  </button>
                  <button
                    onClick={() => handleRating('hard')}
                    disabled={submitting}
                    className="px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                  >
                    🤔 Hard
                  </button>
                  <button
                    onClick={() => handleRating('good')}
                    disabled={submitting}
                    className="px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    ✅ Good
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

