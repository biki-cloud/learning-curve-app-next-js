'use client';

// カード作成画面

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCardPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

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
          tags: tags || undefined,
        }),
      });

      if (response.ok) {
        router.push('/cards');
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating card:', error);
      alert('カードの作成に失敗しました');
    } finally {
      setLoading(false);
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">カード作成</h2>

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
                placeholder="例: ReactのuseEffectは何？"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                回答 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="answer"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="例: 副作用処理を行うHooks"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                タグ（カンマ区切り）
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="例: react,hooks"
              />
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
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '作成中...' : '作成'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

