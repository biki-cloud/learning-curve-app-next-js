'use client';

// AI自動カード作成画面

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function AICardPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    mode: 'revise' | 'generate';
    optimizedQuestion: string;
    optimizedAnswer?: string;
    generatedAnswer?: string;
    shouldSplit: boolean;
    splitCards: Array<{ title: string; content: string }>;
  } | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [savingCards, setSavingCards] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    void fetchTags();
  }, []);

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

  const handleAIGenerate = async () => {
    if (!question.trim()) {
      alert('テーマ・問題を入力してください');
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setSelectedCards(new Set());

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/ai/optimize-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question,
          answer: undefined, // 生成モード
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? 'AI生成に失敗しました');
      }

      const result = (await response.json()) as {
        mode: 'revise' | 'generate';
        optimizedQuestion: string;
        optimizedAnswer?: string;
        generatedAnswer?: string;
        shouldSplit: boolean;
        splitCards: Array<{ title: string; content: string }>;
      };

      setAiResult(result);

      // 分割提案がある場合、すべて選択状態にする
      if (result.shouldSplit && result.splitCards.length > 0) {
        setSelectedCards(new Set(result.splitCards.map((_, index) => index)));
      }
    } catch (error) {
      console.error('Error generating cards:', error);
      alert(error instanceof Error ? error.message : 'AI生成に失敗しました');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleCard = (index: number) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!aiResult || !aiResult.splitCards) return;
    if (selectedCards.size === aiResult.splitCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(aiResult.splitCards.map((_, index) => index)));
    }
  };

  const handleSaveSelectedCards = async () => {
    if (!aiResult || !aiResult.splitCards || selectedCards.size === 0) {
      return;
    }

    setSavingCards(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // 選択されたカードを順番に保存
      const cardsToSave = Array.from(selectedCards)
        .sort((a, b) => a - b)
        .map((index) => aiResult!.splitCards[index]);

      let successCount = 0;
      let errorCount = 0;

      for (const card of cardsToSave) {
        try {
          const response = await fetch('/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              question: card.title,
              answer: card.content,
              tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error saving card:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(`${successCount}枚のカードを保存しました${errorCount > 0 ? `（${errorCount}枚の保存に失敗しました）` : ''}`);
        router.push('/cards');
      } else {
        alert('カードの保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving cards:', error);
      alert('カードの保存に失敗しました');
    } finally {
      setSavingCards(false);
    }
  };

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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI自動カード作成</h2>
            <p className="mt-2 text-sm text-gray-600">
              学習したいテーマや問題を入力すると、AIが最適な学習カードを自動生成します。
              AIは「1つの概念に1つのカード」というベストプラクティスに従ってカードを作成します。
            </p>
          </div>

          {/* プロンプトのコツ */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              💡 プロンプトのコツ
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">✅ 良い例</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
                  <li><strong>具体的なテーマ:</strong> "ReactのHooksについて" → useState、useEffect、useContextなどに分割</li>
                  <li><strong>比較テーマ:</strong> "HTTPとHTTPSの違い" → HTTPとは、HTTPSとは、違いは何かに分割</li>
                  <li><strong>概念の集合:</strong> "トランザクション分離レベル" → 各レベルの説明に分割</li>
                  <li><strong>手順や要素:</strong> "Pythonの辞書操作" → 追加、削除、取得などに分割</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">❌ 避けるべき例</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
                  <li>あまりにも広範囲なテーマ（例: "プログラミング全般"）</li>
                  <li>曖昧な表現（例: "いろいろ教えて"）</li>
                  <li>既に1つの概念に絞られているもの（例: "useStateとは？"）</li>
                </ul>
              </div>
              <div className="pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  💡 <strong>ヒント:</strong> 複数の概念を含むテーマを入力すると、AIが自動的に適切な粒度で分割してくれます。
                  単一の概念でも問題ありませんが、その場合は1枚のカードとして生成されます。
                </p>
              </div>
            </div>
          </div>

          {/* 入力フォーム */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="mb-4">
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                テーマ・問題 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="例: ReactのHooksについて、HTTPとHTTPSの違い、トランザクション分離レベルなど"
              />
              <p className="mt-1 text-xs text-gray-500">
                複数の概念を含むテーマの場合、AIが自動的に複数のカードに分割します。
              </p>
            </div>

            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={aiLoading || !question.trim()}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-md shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AI生成中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  カードを生成
                </>
              )}
            </button>
          </div>

          {/* 生成結果 */}
          {aiResult && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {aiResult.shouldSplit && aiResult.splitCards.length > 0
                    ? `生成されたカード (${aiResult.splitCards.length}枚)`
                    : '生成されたカード'}
                </h3>
                {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {selectedCards.size === aiResult.splitCards.length ? 'すべて解除' : 'すべて選択'}
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedCards.size > 0 && `${selectedCards.size}枚選択中`}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveSelectedCards}
                      disabled={selectedCards.size === 0 || savingCards}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingCards ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          保存中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          選択したカードを保存 ({selectedCards.size})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 分割されていない場合（単一カード） */}
              {!aiResult.shouldSplit && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {aiResult.optimizedQuestion}
                  </h4>
                  <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                    <MarkdownRenderer
                      content={aiResult.optimizedAnswer || aiResult.generatedAnswer || ''}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    💡 このカードは分割されていません。必要に応じて手動で編集・保存してください。
                  </p>
                </div>
              )}

              {/* 分割されたカード一覧 */}
              {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                <div className="space-y-4">
                  {aiResult.splitCards.map((card, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedCards.has(index)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`card-${index}`}
                          checked={selectedCards.has(index)}
                          onChange={() => handleToggleCard(index)}
                          className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`card-${index}`}
                            className="block text-sm font-medium text-gray-900 cursor-pointer mb-2"
                          >
                            {card.title}
                          </label>
                          <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                            <MarkdownRenderer content={card.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* タグ選択 */}
              {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タグ（保存時に適用）
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
              )}
            </div>
          )}

          {/* 戻るボタン */}
          <div className="mt-6">
            <Link
              href="/cards"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              カード一覧に戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

