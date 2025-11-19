'use client';

// カード作成画面

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';

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
        const error = await response.json() as { error?: string };
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
      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">カード作成</h2>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-2 self-start sm:self-auto"
            >
              <svg
                className={`w-5 h-5 transition-transform ${showGuide ? 'rotate-180' : ''}`}
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
          <div className="bg-muted border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
              カード作成のベストプラクティス
            </h3>

            {/* カードの粒度について */}
            <div className="mb-4 sm:mb-6">
              <h4 className="font-medium text-foreground mb-2 text-sm sm:text-base">
                📏 カードの粒度：1つの概念に1つのカード
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                1つのカードには、1つの明確な概念や事実だけを含めましょう。複数の概念を1つのカードに詰め込むと、記憶が定着しにくくなります。
              </p>
              <div className="bg-background rounded-md p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs font-medium text-destructive mb-2">❌ 悪い例：複数の概念</p>
                  <div className="text-xs text-muted-foreground bg-destructive/10 p-2 sm:p-3 rounded border border-destructive/20">
                    <p className="font-medium mb-1">質問：</p>
                    <p>ReactのHooksについて説明してください</p>
                    <p className="font-medium mt-2 mb-1">回答：</p>
                    <p>
                      useStateは状態管理、useEffectは副作用処理、useContextはコンテキスト取得、useMemoはメモ化...
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary mb-2">✅ 良い例：1つの概念</p>
                  <div className="text-xs text-muted-foreground bg-primary/10 p-2 sm:p-3 rounded border border-primary/20">
                    <p className="font-medium mb-1">質問：</p>
                    <p>ReactのuseStateは何？</p>
                    <p className="font-medium mt-2 mb-1">回答：</p>
                    <p>
                      関数コンポーネントで状態を管理するためのHook。配列の分割代入で現在の値と更新関数を取得する。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 良いカードの例 */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">
                💡 良いカードの例
              </h4>
              <div className="space-y-3">
                <div className="bg-white rounded-md p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">プログラミング</p>
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">質問：</span> JavaScriptのクロージャとは？
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">回答：</span> 関数とその関数が定義されたスコープの変数を束縛したもの。内側の関数が外側の変数にアクセスできる。
                  </p>
                </div>
                <div className="bg-white rounded-md p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">言語学習</p>
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">質問：</span> 「ありがとう」を英語で？
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">回答：</span> Thank you / Thanks
                  </p>
                </div>
                <div className="bg-white rounded-md p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">一般知識</p>
                  <p className="text-xs text-gray-600 mb-1">
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
              <h4 className="font-medium text-gray-900 mb-2">
                ✍️ 質問の書き方
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>明確で具体的な質問にする</li>
                <li>「〜とは？」「〜は何？」「〜の違いは？」など、答えやすい形式にする</li>
                <li>文脈がなくても理解できるようにする</li>
              </ul>
            </div>

            {/* 回答の書き方 */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">
                📝 回答の書き方
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>簡潔に、要点を押さえる（長すぎると覚えにくい）</li>
                <li>Markdownを使って構造化する（コードブロック、リストなど）</li>
                <li>具体例を含めると記憶に残りやすい</li>
                <li>自分が後で見返したときに理解できるように書く</li>
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card text-card-foreground shadow-sm rounded-lg border p-4 sm:p-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-foreground mb-2">
              質問 / タイトル <span className="text-destructive">*</span>
            </label>
            <textarea
              id="question"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="例: ReactのuseEffectは何？"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="answer" className="block text-sm font-medium text-foreground mb-2">
              回答 <span className="text-destructive">*</span>
              <span className="ml-2 text-xs text-muted-foreground">(Markdown対応)</span>
            </label>
            <textarea
              id="answer"
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={12}
              className="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              タグ
            </label>

            {/* 選択されたタグの表示 */}
            {selectedTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-secondary/80 focus:outline-none"
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
                <p className="text-xs text-muted-foreground mb-2">既存のタグから選択:</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 新しいタグを追加 */}
            <div className="flex flex-col sm:flex-row gap-2">
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

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <Link
              href="/cards"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

