'use client';

// カード一覧画面

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Card {
  id: number;
  question: string;
  answer: string;
  tags: string | null;
  created_at: number;
  // 習熟度情報
  ease: number | null;
  interval_days: number | null;
  rep_count: number | null;
  next_review_at: number | null;
  last_reviewed_at: number | null;
}

export default function CardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

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

    fetchCards();
  };

  const fetchCards = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/cards', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      } else {
        console.error('Failed to fetch cards:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (cardId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handleDelete = async (cardId: number) => {
    if (!confirm('このカードを削除しますか？')) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        fetchCards(); // 一覧を再取得
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

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
            <div className="flex items-center space-x-4">
              <Link
                href="/cards/new"
                className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                新規作成
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">カード一覧</h2>

          {cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">カードがありません</p>
              <Link
                href="/cards/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                カードを作成
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {cards.map((card) => {
                const isExpanded = expandedCards.has(card.id);
                return (
                  <div
                    key={card.id}
                    className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-lg font-medium text-gray-900 mb-2">
                          <MarkdownRenderer content={card.question} />
                        </div>
                        {card.tags && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {card.tags.split(',').map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        {isExpanded && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <MarkdownRenderer content={card.answer} />
                          </div>
                        )}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              作成日: {new Date(card.created_at).toLocaleDateString('ja-JP')}
                            </p>
                            <button
                              onClick={() => toggleCard(card.id)}
                              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              {isExpanded ? '回答を隠す' : '回答を表示'}
                            </button>
                          </div>
                          {card.ease !== null && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">習熟度:</span>
                                <span className="font-medium text-indigo-600">
                                  {card.ease.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">レビュー回数:</span>
                                <span className="font-medium text-indigo-600">
                                  {card.rep_count ?? 0}回
                                </span>
                              </div>
                              {card.interval_days !== null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">次回まで:</span>
                                  <span className="font-medium text-indigo-600">
                                    {card.interval_days}日
                                  </span>
                                </div>
                              )}
                              {card.next_review_at !== null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">次回レビュー:</span>
                                  <span className="font-medium text-indigo-600">
                                    {new Date(card.next_review_at).toLocaleDateString('ja-JP')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Link
                          href={`/cards/${card.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          編集
                        </Link>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

