'use client';

// カード一覧画面

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Card {
  id: number;
  question: string;
  answer: string;
  tags: string | null;
  created_at: number;
}

export default function CardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

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
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {card.question.length > 50
                          ? `${card.question.substring(0, 50)}...`
                          : card.question}
                      </h3>
                      {card.tags && (
                        <div className="flex flex-wrap gap-2 mb-2">
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
                      <p className="text-sm text-gray-500">
                        作成日: {new Date(card.created_at).toLocaleDateString('ja-JP')}
                      </p>
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

