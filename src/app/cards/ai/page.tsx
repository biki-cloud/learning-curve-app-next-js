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
  const [isPromptTipsExpanded, setIsPromptTipsExpanded] = useState(false);

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
        const data = (await response.json()) as { tags?: string[] };
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
      // 単一カードの場合（shouldSplitがfalse）でも、保存可能にするため選択状態にする
      // ただし、splitCardsが空の場合は何もしない
      if (!result.shouldSplit && result.splitCards.length === 1) {
        setSelectedCards(new Set([0]));
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
    // 単一カードの場合（shouldSplitがfalse）でも保存可能にする
    if (!aiResult) {
      return;
    }

    // 分割カードの場合
    if (aiResult.shouldSplit) {
      if (!aiResult.splitCards || selectedCards.size === 0) {
        return;
      }
    } else {
      // 単一カードの場合、splitCardsが空でもoptimizedQuestion/generatedAnswerから保存できる
      if (!aiResult.optimizedQuestion && !aiResult.splitCards?.[0]) {
        return;
      }
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
      let cardsToSave: Array<{ title: string; content: string }> = [];

      if (aiResult.shouldSplit) {
        // 分割カードの場合
        cardsToSave = Array.from(selectedCards)
          .sort((a, b) => a - b)
          .map((index) => aiResult.splitCards[index])
          .filter((card): card is { title: string; content: string } => card !== undefined);
      } else {
        // 単一カードの場合
        const singleCard = aiResult.splitCards?.[0];
        if (singleCard) {
          cardsToSave = [singleCard];
        } else if (aiResult.optimizedQuestion) {
          // splitCardsが空でも、optimizedQuestion/generatedAnswerから保存
          cardsToSave = [
            {
              title: aiResult.optimizedQuestion,
              content: aiResult.optimizedAnswer ?? aiResult.generatedAnswer ?? '',
            },
          ];
        }
      }

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
        alert(
          `${successCount}枚のカードを保存しました${errorCount > 0 ? `（${errorCount}枚の保存に失敗しました）` : ''}`
        );
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
      <main className="container mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">AI自動カード作成</h2>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            学習したいテーマや問題を入力すると、AIが最適な学習カードを自動生成します。
            AIは「1つの概念に1つのカード」というベストプラクティスに従ってカードを作成します。
          </p>
        </div>

        {/* プロンプトのコツ */}
        <div className="mb-4 rounded-lg border border-border bg-muted p-4 sm:mb-6 sm:p-6">
          <button
            type="button"
            onClick={() => setIsPromptTipsExpanded(!isPromptTipsExpanded)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              💡 プロンプトのコツ
            </h3>
            <svg
              className={`h-5 w-5 shrink-0 text-foreground transition-transform ${
                isPromptTipsExpanded ? 'rotate-180' : ''
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
          </button>
          {isPromptTipsExpanded && (
            <div className="mt-3 space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">✅ 良い例</h4>
                <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                  <li>
                    <strong>具体的なテーマ:</strong> "ReactのHooksについて" →
                    useState、useEffect、useContextなどに分割
                  </li>
                  <li>
                    <strong>比較テーマ:</strong> "HTTPとHTTPSの違い" →
                    HTTPとは、HTTPSとは、違いは何かに分割
                  </li>
                  <li>
                    <strong>概念の集合:</strong> "トランザクション分離レベル" → 各レベルの説明に分割
                  </li>
                  <li>
                    <strong>手順や要素:</strong> "Pythonの辞書操作" → 追加、削除、取得などに分割
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">❌ 避けるべき例</h4>
                <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                  <li>あまりにも広範囲なテーマ（例: "プログラミング全般"）</li>
                  <li>曖昧な表現（例: "いろいろ教えて"）</li>
                  <li>既に1つの概念に絞られているもの（例: "useStateとは？"）</li>
                </ul>
              </div>
              <div className="border-t border-blue-200 pt-3">
                <p className="text-xs text-gray-600">
                  💡 <strong>ヒント:</strong>{' '}
                  複数の概念を含むテーマを入力すると、AIが自動的に適切な粒度で分割してくれます。
                  単一の概念でも問題ありませんが、その場合は1枚のカードとして生成されます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="mb-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:mb-6 sm:p-6">
          <div className="mb-4">
            <label htmlFor="question" className="mb-2 block text-sm font-medium text-foreground">
              テーマ・問題 <span className="text-destructive">*</span>
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="flex h-auto w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
          >
            {aiLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                AI生成中...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                カードを生成
              </>
            )}
          </button>
        </div>

        {/* 生成結果 */}
        {aiResult && (
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {aiResult.shouldSplit && aiResult.splitCards.length > 0
                  ? `生成されたカード (${aiResult.splitCards.length}枚)`
                  : '生成されたカード'}
              </h3>
              {aiResult.shouldSplit && aiResult.splitCards.length > 0 && (
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {selectedCards.size === aiResult.splitCards.length
                      ? 'すべて解除'
                      : 'すべて選択'}
                  </button>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {selectedCards.size > 0 && `${selectedCards.size}枚選択中`}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveSelectedCards}
                    disabled={selectedCards.size === 0 || savingCards}
                    className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCards ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        保存中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
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
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-900">
                    {aiResult.optimizedQuestion}
                  </h4>
                  <div className="prose prose-sm max-w-none text-sm text-gray-700">
                    <MarkdownRenderer
                      content={aiResult.optimizedAnswer ?? aiResult.generatedAnswer ?? ''}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">💡 このカードは分割されていません。</p>
                </div>

                {/* 単一カード用の保存ボタン */}
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveSelectedCards}
                    disabled={savingCards}
                    className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCards ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        保存中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        カードを保存
                      </>
                    )}
                  </button>
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
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        検索中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        類似カードを検索
                      </>
                    )}
                  </button>
                </div>

                {/* 類似カード表示 */}
                {similarCardsMap.get(0) && similarCardsMap.get(0)!.length > 0 && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      類似カードが見つかりました
                    </h4>
                    <p className="mb-3 text-xs text-indigo-700">
                      重複を避けたり、関連する知識を確認したりできます。
                    </p>
                    <div className="space-y-2">
                      {similarCardsMap.get(0)!.map((card) => {
                        const isExpanded = expandedSimilarCardIds.has(card.id);
                        return (
                          <div
                            key={card.id}
                            className="rounded-md border border-indigo-200 bg-white transition-colors hover:border-indigo-400"
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
                              className="w-full p-2 text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="flex-1 text-xs font-medium text-gray-900">
                                  {card.question}
                                </h5>
                                <div className="flex items-center gap-2">
                                  <span className="whitespace-nowrap text-xs text-indigo-600">
                                    {Math.round(card.similarityScore * 100)}% 類似
                                  </span>
                                  <svg
                                    className={`h-3 w-3 text-indigo-600 transition-transform ${
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
                              <div className="border-t border-indigo-200 px-2 pb-2">
                                <div className="pt-2 text-xs text-gray-700">
                                  <MarkdownRenderer content={card.answer} />
                                </div>
                                {card.tags && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {card.tags.split(',').map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2">
                                  <Link
                                    href={`/cards/${card.id}/edit`}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
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
                        className={`rounded-lg border p-4 transition-colors ${
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
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`card-${index}`}
                              className="mb-2 block cursor-pointer text-sm font-medium text-gray-900"
                            >
                              {card.title}
                            </label>
                            <div className="prose prose-sm max-w-none text-sm text-gray-700">
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
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              検索中...
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              類似カードを検索
                            </>
                          )}
                        </button>
                      </div>

                      {/* 類似カード表示 */}
                      {similarCards && similarCards.length > 0 && (
                        <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                          <h5 className="mb-2 flex items-center gap-1 text-xs font-semibold text-indigo-900">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            類似カード ({similarCards.length}件)
                          </h5>
                          <div className="space-y-1.5">
                            {similarCards.map((similarCard) => {
                              const isExpanded = expandedSimilarCardIds.has(similarCard.id);
                              return (
                                <div
                                  key={similarCard.id}
                                  className="rounded border border-indigo-200 bg-white transition-colors hover:border-indigo-400"
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
                                    className="w-full p-2 text-left"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="flex-1 text-xs font-medium text-gray-900">
                                        {similarCard.question}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap text-xs text-indigo-600">
                                          {Math.round(similarCard.similarityScore * 100)}%
                                        </span>
                                        <svg
                                          className={`h-3 w-3 text-indigo-600 transition-transform ${
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
                                    <div className="border-t border-indigo-200 px-2 pb-2">
                                      <div className="pt-2 text-xs text-gray-700">
                                        <MarkdownRenderer content={similarCard.answer} />
                                      </div>
                                      {similarCard.tags && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {similarCard.tags.split(',').map((tag) => (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="mt-2">
                                        <Link
                                          href={`/cards/${similarCard.id}/edit`}
                                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
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
            {(aiResult.shouldSplit && aiResult.splitCards.length > 0) ||
            (!aiResult.shouldSplit && aiResult.optimizedQuestion) ? (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  タグ（保存時に適用）
                </label>

                {/* 選択されたタグの表示 */}
                {selectedTags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-indigo-200 focus:outline-none"
                        >
                          <span className="sr-only">削除</span>×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 既存のタグから選択 */}
                {!loadingTags && availableTags.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs text-gray-500">既存のタグから選択:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    placeholder="新しいタグを入力してEnter"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewTag}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    追加
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-4 sm:mt-6">
          <Link
            href="/cards"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            カード一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
