'use client';

// カード作成画面

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface SimilarCard {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  difficulty: number | null;
  tags: string | null;
  similarityScore: number;
}

export default function NewCardPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [similarCards, setSimilarCards] = useState<SimilarCard[]>([]);
  const [loadingSimilarCards, setLoadingSimilarCards] = useState(false);
  const [expandedSimilarCardIds, setExpandedSimilarCardIds] = useState<Set<number>>(new Set());
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showAnswerPreview, setShowAnswerPreview] = useState(false);

  useEffect(() => {
    void fetchTags();
  }, []);

  // 類似カードを検索（デバウンス付き）
  const searchSimilarCards = useCallback(async (questionText: string, answerText: string) => {
    if (!questionText.trim() || !answerText.trim()) {
      setSimilarCards([]);
      return;
    }

    setLoadingSimilarCards(true);
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
          limit: 5,
        }),
      });

      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = (await response.json()) as SimilarCard[];
        setSimilarCards(data);
      }
    } catch (error) {
      console.error('Error searching similar cards:', error);
    } finally {
      setLoadingSimilarCards(false);
    }
  }, []);

  // 手動で類似カードを検索
  const handleSearchSimilarCards = () => {
    const questionTrimmed = question.trim();
    const answerTrimmed = answer.trim();

    if (questionTrimmed.length >= 10 && answerTrimmed.length >= 10) {
      void searchSimilarCards(questionTrimmed, answerTrimmed);
    } else {
      alert('質問と回答をそれぞれ10文字以上入力してください');
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/cards', {
        method: 'POST',
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
        const error = (await response.json()) as { error?: string };
        alert(`エラー: ${error.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating card:', error);
      alert('カードの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/cards" />
      <main className="container mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">カード作成</h2>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 self-start text-sm font-medium text-primary hover:text-primary/80 sm:self-auto"
          >
            <svg
              className={`h-5 w-5 transition-transform ${showGuide ? 'rotate-180' : ''}`}
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
            {showGuide ? 'ガイドを隠す' : 'カード作成のガイドを見る'}
          </button>
        </div>

        {/* ガイドセクション */}
        {showGuide && (
          <div className="mb-4 rounded-lg border border-border bg-muted p-4 sm:mb-6 sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground sm:text-lg">
              カード作成のベストプラクティス
            </h3>

            {/* カードの粒度について */}
            <div className="mb-4 sm:mb-6">
              <h4 className="mb-2 text-sm font-medium text-foreground sm:text-base">
                📏 カードの粒度：1つの概念に1つのカード
              </h4>
              <p className="mb-3 text-xs text-muted-foreground sm:text-sm">
                1つのカードには、1つの明確な概念や事実だけを含めましょう。複数の概念を1つのカードに詰め込むと、記憶が定着しにくくなります。
              </p>
              <div className="space-y-3 rounded-md bg-background p-3 sm:space-y-4 sm:p-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-destructive">❌ 悪い例：複数の概念</p>
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-2 text-xs text-muted-foreground sm:p-3">
                    <p className="mb-1 font-medium">質問：</p>
                    <p>ReactのHooksについて説明してください</p>
                    <p className="mb-1 mt-2 font-medium">回答：</p>
                    <p>
                      useStateは状態管理、useEffectは副作用処理、useContextはコンテキスト取得、useMemoはメモ化...
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-primary">✅ 良い例：1つの概念</p>
                  <div className="rounded border border-primary/20 bg-primary/10 p-2 text-xs text-muted-foreground sm:p-3">
                    <p className="mb-1 font-medium">質問：</p>
                    <p>ReactのuseStateは何？</p>
                    <p className="mb-1 mt-2 font-medium">回答：</p>
                    <p>
                      関数コンポーネントで状態を管理するためのHook。配列の分割代入で現在の値と更新関数を取得する。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 良いカードの例 */}
            <div className="mb-6">
              <h4 className="mb-3 font-medium text-gray-900">💡 良いカードの例</h4>
              <div className="space-y-3">
                <div className="rounded-md border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-xs font-medium text-gray-700">プログラミング</p>
                  <p className="mb-1 text-xs text-gray-600">
                    <span className="font-medium">質問：</span> JavaScriptのクロージャとは？
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">回答：</span>{' '}
                    関数とその関数が定義されたスコープの変数を束縛したもの。内側の関数が外側の変数にアクセスできる。
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-xs font-medium text-gray-700">言語学習</p>
                  <p className="mb-1 text-xs text-gray-600">
                    <span className="font-medium">質問：</span> 「ありがとう」を英語で？
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">回答：</span> Thank you / Thanks
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-xs font-medium text-gray-700">一般知識</p>
                  <p className="mb-1 text-xs text-gray-600">
                    <span className="font-medium">質問：</span> 光合成の化学反応式は？
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">回答：</span> 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
                  </p>
                </div>
              </div>
            </div>

            {/* 質問の書き方 */}
            <div className="mb-6">
              <h4 className="mb-2 font-medium text-gray-900">✍️ 質問の書き方</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                <li>明確で具体的な質問にする</li>
                <li>「〜とは？」「〜は何？」「〜の違いは？」など、答えやすい形式にする</li>
                <li>文脈がなくても理解できるようにする</li>
              </ul>
            </div>

            {/* 回答の書き方 */}
            <div className="mb-4">
              <h4 className="mb-2 font-medium text-gray-900">📝 回答の書き方</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                <li>簡潔に、要点を押さえる（長すぎると覚えにくい）</li>
                <li>Markdownを使って構造化する（コードブロック、リストなど）</li>
                <li>具体例を含めると記憶に残りやすい</li>
                <li>自分が後で見返したときに理解できるように書く</li>
              </ul>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        >
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="question" className="block text-sm font-medium text-foreground">
                質問 / タイトル <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuestionPreview(!showQuestionPreview)}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {showQuestionPreview ? '編集' : 'マークダウンで表示'}
              </button>
            </div>
            {showQuestionPreview ? (
              <div className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2">
                <MarkdownRenderer content={question || '質問を入力してください'} />
              </div>
            ) : (
              <textarea
                id="question"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="flex h-auto w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="例: ReactのuseEffectは何？"
              />
            )}
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="answer" className="block text-sm font-medium text-foreground">
                回答 <span className="text-destructive">*</span>
                <span className="ml-2 text-xs text-muted-foreground">(Markdown対応)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAnswerPreview(!showAnswerPreview)}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {showAnswerPreview ? '編集' : 'マークダウンで表示'}
              </button>
            </div>
            {showAnswerPreview ? (
              <div className="min-h-[300px] rounded-md border border-input bg-background px-3 py-2">
                <MarkdownRenderer content={answer || '回答を入力してください'} />
              </div>
            ) : (
              <>
                <textarea
                  id="answer"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={12}
                  className="flex h-auto w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={`例: 副作用処理を行うHooks

\`\`\`javascript
useEffect(() => {
  // 副作用処理
}, [dependencies]);
\`\`\`

- 第一引数: 実行する関数
- 第二引数: 依存配列`}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Markdown形式で記述できます。コードブロック、リスト、リンクなどが使用可能です。
                </p>
              </>
            )}
          </div>

          {/* 類似カード検索ボタン */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleSearchSimilarCards}
              disabled={loadingSimilarCards || !question.trim() || !answer.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingSimilarCards ? (
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
                  検索中...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <p className="mt-2 text-xs text-muted-foreground">
              重複を避けるため、作成前に類似カードを確認できます。
            </p>
          </div>

          {/* 類似カード表示 */}
          {similarCards.length > 0 && (
            <div className="mb-6 rounded-lg border border-border bg-muted p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <svg
                  className="h-5 w-5 text-primary"
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
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                重複を避けたり、関連する知識を確認したりできます。
              </p>
              <div className="space-y-3">
                {similarCards.map((card) => {
                  const isExpanded = expandedSimilarCardIds.has(card.id);
                  return (
                    <div
                      key={card.id}
                      className="rounded-md border border-border bg-background p-3 transition-colors hover:border-primary"
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
                        className="w-full text-left"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h4 className="flex-1 text-sm font-medium text-foreground">
                            {card.question}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {Math.round(card.similarityScore * 100)}% 類似
                            </span>
                            <svg
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
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
                        <div className="mt-3 border-t border-border pt-3">
                          <div className="mb-2 text-xs text-muted-foreground">
                            <MarkdownRenderer content={card.answer} />
                          </div>
                          {card.tags && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {card.tags.split(',').map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3">
                            <Link
                              href={`/cards/${card.id}/edit`}
                              className="text-xs font-medium text-primary hover:text-primary/80"
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

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-foreground">タグ</label>

            {/* 選択されたタグの表示 */}
            {selectedTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-secondary/80 focus:outline-none"
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
                <p className="mb-2 text-xs text-muted-foreground">既存のタグから選択:</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 新しいタグを追加 */}
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="新しいタグを入力してEnter"
              />
              <button
                type="button"
                onClick={handleAddNewTag}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                追加
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/cards"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
