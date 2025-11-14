'use client';

// カード編集画面

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Card {
  id: number;
  question: string;
  answer: string;
  tags: string | null;
}

export default function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardId, setCardId] = useState<number | null>(null);
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    if (cardId !== null) {
      void fetchCard();
      void fetchTags();
    }
  }, [cardId]);

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
    } finally {
      setLoadingTags(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags((prev) => [...prev, trimmedTag]);
      if (!availableTags.includes(trimmedTag)) {
        setAvailableTags((prev) => [...prev, trimmedTag].sort());
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    // params を解決
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      router.push('/cards');
      return;
    }
    setCardId(id);
  };

  const fetchCard = async () => {
    if (cardId === null) return;

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
        const cards: Card[] = await response.json();
        const foundCard = cards.find((c) => c.id === cardId);
        if (foundCard) {
          setCard(foundCard);
          setQuestion(foundCard.question);
          setAnswer(foundCard.answer);
          // タグを配列に変換
          const tagsArray = foundCard.tags
            ? foundCard.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
            : [];
          setSelectedTags(tagsArray);
        } else {
          router.push('/cards');
        }
      }
    } catch (error) {
      console.error('Error fetching card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardId === null) return;

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question,
          answer,
          tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        }),
      });

      if (response.ok) {
        router.push('/cards');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const error = await response.json() as { error?: string };
        alert(`エラー: ${error.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('カードの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!card) {
    return null;
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
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">カード編集</h2>

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                質問 / タイトル <span className="text-red-500">*</span>
              </label>
              <textarea
                id="question"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                回答 <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-500">(Markdown対応)</span>
              </label>
              <textarea
                id="answer"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Markdown形式で記述できます。コードブロック、リスト、リンクなどが使用可能です。
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>

              {/* 選択されたタグの表示 */}
              {selectedTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200 focus:outline-none"
                      >
                        <span className="sr-only">削除</span>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 既存のタグから選択 */}
              {!loadingTags && availableTags.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">既存のタグから選択:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 新しいタグを追加 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="新しいタグを入力してEnter"
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href="/cards"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

