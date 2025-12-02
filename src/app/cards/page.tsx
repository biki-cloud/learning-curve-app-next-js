'use client';

// カード一覧画面

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Navbar from '@/components/navbar';

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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());

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

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedCards(new Set()); // 選択モードを切り替える際に選択をリセット
  };

  const toggleCardSelection = (cardId: number) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const selectAllCards = () => {
    setSelectedCards(new Set(cards.map((card) => card.id)));
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedCards.size === 0) {
      return;
    }

    const count = selectedCards.size;
    if (!confirm(`${count}枚のカードを削除しますか？`)) {
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

      // 選択されたカードを順番に削除
      const deletePromises = Array.from(selectedCards).map((cardId) =>
        fetch(`/api/cards/${cardId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));

      if (failed.length > 0) {
        alert(`${failed.length}枚のカードの削除に失敗しました`);
      } else {
        alert(`${count}枚のカードを削除しました`);
      }

      // 選択モードを終了し、一覧を再取得
      setIsSelectionMode(false);
      setSelectedCards(new Set());
      void fetchCards(false);
    } catch (error) {
      console.error('Error deleting cards:', error);
      alert('削除に失敗しました');
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
      <Navbar currentPath="/cards" />
      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">カード一覧</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {cards.length} 枚のカード
              {isSelectionMode && selectedCards.size > 0 && (
                <span className="ml-2 text-primary font-medium">
                  ({selectedCards.size} 枚選択中)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isSelectionMode ? (
              <>
                <button
                  onClick={selectedCards.size === cards.length ? deselectAllCards : selectAllCards}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {selectedCards.size === cards.length ? '全解除' : '全選択'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedCards.size === 0}
                  className="inline-flex items-center justify-center rounded-md border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  削除 ({selectedCards.size})
                </button>
                <button
                  onClick={toggleSelectionMode}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleSelectionMode}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  ✓ 選択モード
                </button>
                <Link
                  href="/cards/ai"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  ✨ AI自動作成
                </Link>
                <Link
                  href="/cards/new"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90"
                >
                  ➕ 新規作成
                </Link>
              </>
            )}
          </div>
        </div>

        {/* フィルターUI */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 検索バー */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-2">
                検索
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="質問・回答を検索..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* タグフィルター */}
            <div>
              <label htmlFor="tag" className="block text-sm font-medium mb-2">
                タグ
              </label>
              <select
                id="tag"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">すべてのタグ</option>
                <option value="__no_tag__">タグなし</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* レビュー状態フィルター */}
            <div>
              <label htmlFor="reviewStatus" className="block text-sm font-medium mb-2">
                レビュー状態
              </label>
              <select
                id="reviewStatus"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('');
                  setReviewStatus('all');
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                フィルターをリセット
              </button>
            </div>
          )}
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-16 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg mb-6">カードがありません</p>
            <Link
              href="/cards/new"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90"
            >
              ➕ カードを作成
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {cards.map((card) => {
              const isExpanded = expandedCards.has(card.id);
              const isSelected = selectedCards.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow ${
                    isSelectionMode && isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      {isSelectionMode && (
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCardSelection(card.id)}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-semibold mb-3 leading-relaxed">
                          <MarkdownRenderer content={card.question} />
                        </div>
                        {card.tags && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {card.tags.split(',').map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        {isExpanded && (
                          <div className="mt-4 p-3 sm:p-4 rounded-md border bg-muted">
                            <div className="text-sm font-medium text-muted-foreground mb-2">答え</div>
                            <div className="leading-relaxed text-sm sm:text-base">
                              <MarkdownRenderer content={card.answer} />
                            </div>
                          </div>
                        )}
                        <div className="mt-4 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              作成日: {new Date(card.created_at).toLocaleDateString('ja-JP')}
                            </p>
                            <button
                              onClick={() => toggleCard(card.id)}
                              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left sm:text-right"
                            >
                              {isExpanded ? '回答を隠す' : '回答を表示'}
                            </button>
                          </div>
                          {card.ease !== null && (
                            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>習熟度:</span>
                                <span className="font-medium text-foreground">
                                  {card.ease.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>レビュー回数:</span>
                                <span className="font-medium text-foreground">
                                  {card.rep_count ?? 0}回
                                </span>
                              </div>
                              {card.interval_days !== null && (
                                <div className="flex items-center gap-1">
                                  <span>次回まで:</span>
                                  <span className="font-medium text-foreground">
                                    {card.interval_days}日
                                  </span>
                                </div>
                              )}
                              {card.next_review_at !== null && (
                                <div className="flex items-center gap-1">
                                  <span>次回レビュー:</span>
                                  <span className="font-medium text-foreground">
                                    {new Date(card.next_review_at).toLocaleDateString('ja-JP')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSelectionMode && (
                        <div className="flex gap-2 sm:ml-4">
                          <Link
                            href={`/cards/${card.id}/edit`}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground flex-1 sm:flex-none"
                          >
                            編集
                          </Link>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="inline-flex items-center justify-center rounded-md border border-destructive/50 bg-background px-3 py-1.5 text-xs sm:text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 flex-1 sm:flex-none"
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

