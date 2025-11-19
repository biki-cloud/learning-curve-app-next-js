'use client';

// AI自動カード作成画面

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Navbar from '@/components/navbar';

interface SimilarCard {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  difficulty: number | null;
  tags: string | null;
  similarityScore: number;
}

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
  const [similarCardsMap, setSimilarCardsMap] = useState<Map<number, SimilarCard[]>>(new Map());
  const [loadingSimilarCards, setLoadingSimilarCards] = useState<Set<number>>(new Set());
  const [expandedSimilarCardIds, setExpandedSimilarCardIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    void fetchTags();
  }, []);

  // 類似カードを検索
  const searchSimilarCards = useCallback(
    async (cardIndex: number, questionText: string, answerText: string) => {
      setLoadingSimilarCards((prev) => new Set(prev).add(cardIndex));

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const response = await fetch('/api/cards/similar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            question: questionText,
            answer: answerText,
            limit: 3,
          }),
        });

        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          const data = (await response.json()) as SimilarCard[];
          setSimilarCardsMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(cardIndex, data);
            return newMap;
          });
        }
      } catch (error) {
        console.error('Error searching similar cards:', error);
      } finally {
        setLoadingSimilarCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cardIndex);
          return newSet;
        });
      }
    },
    []
  );

  // AI結果が生成されたら、類似カードマップをリセット
  useEffect(() => {
    if (!aiResult) {
      setSimilarCardsMap(new Map());
    }
  }, [aiResult]);

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
        const error: { error?: string } = await response.json();
        throw new Error(error.error ?? 'AI生成に失敗しました');
      }

      const result: {
        mode: 'revise' | 'generate';
        optimizedQuestion: string;
        optimizedAnswer?: string;
        generatedAnswer?: string;
        shouldSplit: boolean;
        splitCards: Array<{ title: string; content: string }>;
      } = await response.json();

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
    if (!aiResult?.splitCards) return;
    if (selectedCards.size === aiResult.splitCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(aiResult.splitCards.map((_, index) => index)));
    }
  };

  const handleSaveSelectedCards = async () => {
    if (!aiResult?.splitCards || selectedCards.size === 0) {
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
        .map((index) => aiResult.splitCards[index])
        .filter((card): card is { title: string; content: string } => card !== undefined);

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
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/cards" />
      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">AI自動カード作成</h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              学習したいテーマや問題を入力すると、AIが最適な学習カードを自動生成します。
              AIは「1つの概念に1つのカード」というベストプラクティスに従ってカードを作成します。
            </p>
          </div>

          {/* プロンプトのコツ */}
          <div className="bg-muted border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">
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
          <div className="bg-card text-card-foreground shadow-sm rounded-lg border p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="mb-4">
              <label htmlFor="question" className="block text-sm font-medium text-foreground mb-2">
                テーマ・問題 <span className="text-destructive">*</span>
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="例: ReactのHooksについて、HTTPとHTTPSの違い、トランザクション分離レベルなど"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                複数の概念を含むテーマの場合、AIが自動的に複数のカードに分割します。
              </p>
            </div>

            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={aiLoading || !question.trim()}
              className="w-full px-4 py-2 sm:py-3 bg-primary text-primary-foreground font-medium rounded-md shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
            <div className="bg-card text-card-foreground shadow-sm rounded-lg border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  {aiResult.shouldSplit && aiResult.splitCards.length > 0
                    ? `生成されたカード (${aiResult.splitCards.length}枚)`
                    : '生成されたカード'}
                </h3>
                {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      {selectedCards.size === aiResult.splitCards.length ? 'すべて解除' : 'すべて選択'}
                    </button>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {selectedCards.size > 0 && `${selectedCards.size}枚選択中`}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveSelectedCards}
                      disabled={selectedCards.size === 0 || savingCards}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
                <div className="mb-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {aiResult.optimizedQuestion}
                    </h4>
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                      <MarkdownRenderer
                        content={aiResult.optimizedAnswer ?? aiResult.generatedAnswer ?? ''}
                      />
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      💡 このカードは分割されていません。必要に応じて手動で編集・保存してください。
                    </p>
                  </div>

                  {/* 類似カード検索ボタン */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const answer = aiResult.optimizedAnswer ?? aiResult.generatedAnswer ?? '';
                        if (answer) {
                          void searchSimilarCards(0, aiResult.optimizedQuestion, answer);
                        }
                      }}
                      disabled={loadingSimilarCards.has(0)}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingSimilarCards.has(0) ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          検索中...
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          類似カードを検索
                        </>
                      )}
                    </button>
                  </div>

                  {/* 類似カード表示 */}
                  {similarCardsMap.get(0) && similarCardsMap.get(0)!.length > 0 && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        類似カードが見つかりました
                      </h4>
                      <p className="text-xs text-indigo-700 mb-3">
                        重複を避けたり、関連する知識を確認したりできます。
                      </p>
                      <div className="space-y-2">
                        {similarCardsMap.get(0)!.map((card) => {
                          const isExpanded = expandedSimilarCardIds.has(card.id);
                          return (
                            <div
                              key={card.id}
                              className="bg-white border border-indigo-200 rounded-md hover:border-indigo-400 transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedSimilarCardIds((prev) => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(card.id)) {
                                      newSet.delete(card.id);
                                    } else {
                                      newSet.add(card.id);
                                    }
                                    return newSet;
                                  });
                                }}
                                className="w-full text-left p-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="text-xs font-medium text-gray-900 flex-1">{card.question}</h5>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-indigo-600 whitespace-nowrap">
                                      {Math.round(card.similarityScore * 100)}% 類似
                                    </span>
                                    <svg
                                      className={`w-3 h-3 text-indigo-600 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-2 pb-2 border-t border-indigo-200">
                                  <div className="pt-2 text-xs text-gray-700">
                                    <MarkdownRenderer content={card.answer} />
                                  </div>
                                  {card.tags && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {card.tags.split(',').map((tag) => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-2">
                                    <Link
                                      href={`/cards/${card.id}/edit`}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      編集ページを開く →
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 分割されたカード一覧 */}
              {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                <div className="space-y-4">
                  {aiResult.splitCards.map((card, index) => {
                    const similarCards = similarCardsMap.get(index);
                    const isLoading = loadingSimilarCards.has(index);

                    return (
                      <div key={index}>
                        <div
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

                        {/* 類似カード検索ボタン */}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              void searchSimilarCards(index, card.title, card.content);
                            }}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoading ? (
                              <>
                                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                検索中...
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                類似カードを検索
                              </>
                            )}
                          </button>
                        </div>

                        {/* 類似カード表示 */}
                        {similarCards && similarCards.length > 0 && (
                          <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                            <h5 className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              類似カード ({similarCards.length}件)
                            </h5>
                            <div className="space-y-1.5">
                              {similarCards.map((similarCard) => {
                                const isExpanded = expandedSimilarCardIds.has(similarCard.id);
                                return (
                                  <div
                                    key={similarCard.id}
                                    className="bg-white border border-indigo-200 rounded hover:border-indigo-400 transition-colors"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedSimilarCardIds((prev) => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(similarCard.id)) {
                                            newSet.delete(similarCard.id);
                                          } else {
                                            newSet.add(similarCard.id);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="w-full text-left p-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-xs font-medium text-gray-900 flex-1">{similarCard.question}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-indigo-600 whitespace-nowrap">
                                            {Math.round(similarCard.similarityScore * 100)}%
                                          </span>
                                          <svg
                                            className={`w-3 h-3 text-indigo-600 transition-transform ${
                                              isExpanded ? 'rotate-180' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </svg>
                                        </div>
                                      </div>
                                    </button>
                                    {isExpanded && (
                                      <div className="px-2 pb-2 border-t border-indigo-200">
                                        <div className="pt-2 text-xs text-gray-700">
                                          <MarkdownRenderer content={similarCard.answer} />
                                        </div>
                                        {similarCard.tags && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {similarCard.tags.split(',').map((tag) => (
                                              <span
                                                key={tag}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <div className="mt-2">
                                          <Link
                                            href={`/cards/${similarCard.id}/edit`}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            編集ページを開く →
                                          </Link>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          <div className="mt-4 sm:mt-6">
            <Link
              href="/cards"
              className="inline-flex items-center px-4 py-2 border border-input bg-background rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              カード一覧に戻る
            </Link>
          </div>
      </main>
    </div>
  );
}

