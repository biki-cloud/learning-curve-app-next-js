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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    void fetchTags();
  }, []);

  useEffect(() => {
    if (!loading) {
      void fetchCards();
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
  }, [searchQuery, selectedTag, reviewStatus]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    void fetchCards(true);
  };

  const fetchTags = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch('/api/tags', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = await response.json() as { tags?: string[] };
        setAvailableTags(data.tags ?? []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchCards = async (isInitialLoad = false) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      if (isInitialLoad) {
        setLoading(true);
      }

      // クエリパラメータを構築
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (selectedTag) {
        params.append('tag', selectedTag);
      }
      if (reviewStatus !== 'all') {
        params.append('reviewStatus', reviewStatus);
      }

      const url = `/api/cards${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = await response.json() as Card[];
        setCards(data);
      } else {
        console.error('Failed to fetch cards:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
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
        void fetchCards(false); // 一覧を再取得
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
                href="/cards/ai"
                className="text-purple-600 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                AI自動作成
              </Link>
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

          {/* フィルターUI */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 検索バー */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  検索
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="質問・回答を検索..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* タグフィルター */}
              <div>
                <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
                  タグ
                </label>
                <select
                  id="tag"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">すべてのタグ</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* レビュー状態フィルター */}
              <div>
                <label htmlFor="reviewStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  レビュー状態
                </label>
                <select
                  id="reviewStatus"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">すべて</option>
                  <option value="unreviewed">未レビュー</option>
                  <option value="reviewed">レビュー済み</option>
                  <option value="due">今日レビュー対象</option>
                </select>
              </div>
            </div>

            {/* フィルターリセットボタン */}
            {(searchQuery || selectedTag || reviewStatus !== 'all') && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag('');
                    setReviewStatus('all');
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                >
                  フィルターをリセット
                </button>
              </div>
            )}
          </div>

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

