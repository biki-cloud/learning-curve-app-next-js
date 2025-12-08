'use client';

// カード編集画面

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Card {
  id: number;
  question: string;
  answer: string;
  tags: string | null;
}

export default function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardId, setCardId] = useState<number | null>(null);
  const [loadingTags, setLoadingTags] = useState(true);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showAnswerPreview, setShowAnswerPreview] = useState(false);

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
            ? foundCard.tags
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0)
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
        const error = (await response.json()) as { error?: string };
        alert(`エラー: ${error.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('カードの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (cardId === null) return;

    setDeleting(true);

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
        router.push('/cards');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const error = (await response.json()) as { error?: string };
        alert(`エラー: ${error.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('カードの削除に失敗しました');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/cards" />
      <main className="container mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h2 className="mb-4 text-xl font-bold text-foreground sm:mb-6 sm:text-2xl">カード編集</h2>

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
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Markdown形式で記述できます。コードブロック、リスト、リンクなどが使用可能です。
                </p>
              </>
            )}
          </div>

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

          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:gap-4">
            <div className="flex gap-3 sm:gap-4">
              <Link
                href="/cards"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                キャンセル
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting || saving}
                className="inline-flex items-center justify-center rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                削除
              </button>
            </div>
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
              <h3 className="mb-4 text-lg font-semibold">カードを削除しますか？</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                この操作は取り消せません。カードと関連するすべてのデータが削除されます。
              </p>
              <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
