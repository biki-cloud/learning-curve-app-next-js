'use client';

// 習熟度システムの解説ページ

import Link from 'next/link';
import Navbar from '@/components/navbar';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/help" />
      <main className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
            習熟度システムについて
          </h1>
          <p className="text-muted-foreground sm:text-lg">
            LearnCurveの学習アルゴリズムをわかりやすく解説します
          </p>
        </div>

        {/* 習熟度システムの概要 */}
        <section className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <h2 className="text-2xl font-bold">習熟度システムとは？</h2>
          </div>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            LearnCurveでは、各カードが<strong className="text-foreground">Stage 0〜5</strong>
            の6段階で管理されます。
            あなたがどれだけそのカードを覚えているかに応じて、Stageが上がったり下がったりします。
          </p>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            覚えているカードは復習間隔が長くなり、覚えていないカードは頻繁に復習するようになります。
            これにより、効率的に記憶を定着させることができます。
          </p>
        </section>

        {/* Stage一覧 */}
        <section className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-3xl">🎯</div>
            <h2 className="text-2xl font-bold">Stage一覧</h2>
          </div>
          <div className="space-y-4">
            {[
              { stage: 0, name: '新規', interval: '当日 or 明日', emoji: '🆕', color: 'bg-muted' },
              {
                stage: 1,
                name: '初級',
                interval: '1日後',
                emoji: '🌱',
                color: 'bg-blue-100 dark:bg-blue-900/30',
              },
              {
                stage: 2,
                name: '中級',
                interval: '3日後',
                emoji: '🌿',
                color: 'bg-green-100 dark:bg-green-900/30',
              },
              {
                stage: 3,
                name: '上級',
                interval: '7日後',
                emoji: '🌳',
                color: 'bg-yellow-100 dark:bg-yellow-900/30',
              },
              {
                stage: 4,
                name: '熟練',
                interval: '14日後',
                emoji: '⭐',
                color: 'bg-orange-100 dark:bg-orange-900/30',
              },
              {
                stage: 5,
                name: 'マスター',
                interval: '30日後',
                emoji: '👑',
                color: 'bg-purple-100 dark:bg-purple-900/30',
              },
            ].map(({ stage, name, interval, emoji, color }) => (
              <div
                key={stage}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-all hover:shadow-md ${color}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-2xl shadow-sm">
                  {emoji}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">Stage {stage}</span>
                    <span className="text-base font-semibold text-foreground">{name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">復習間隔: {interval}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 評価による変化 */}
        <section className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-3xl">🔄</div>
            <h2 className="text-2xl font-bold">評価による習熟度の変化</h2>
          </div>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            レビュー時に選択する評価によって、カードのStageが変化します。
          </p>

          <div className="space-y-6">
            {/* 覚えている */}
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <h3 className="text-xl font-bold text-foreground">覚えている</h3>
              </div>
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Stage変化:</span>
                  <span className="rounded-full bg-green-200 px-3 py-1 text-sm font-semibold text-green-900 dark:bg-green-800 dark:text-green-100">
                    +1（最大5まで）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">復習間隔:</span>
                  <span className="text-sm font-semibold text-foreground">
                    次のStageの間隔に延長
                  </span>
                </div>
              </div>
              <div className="rounded-md bg-background p-3 text-sm">
                <p className="mb-2 font-medium text-foreground">例:</p>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                  <li>Stage 2 → Stage 3（3日後 → 7日後に復習）</li>
                  <li>Stage 4 → Stage 5（14日後 → 30日後に復習）</li>
                  <li>Stage 5の場合はそのまま（30日後に復習）</li>
                </ul>
              </div>
            </div>

            {/* 難しい */}
            <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">🤔</span>
                <h3 className="text-xl font-bold text-foreground">難しい</h3>
              </div>
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Stage変化:</span>
                  <span className="rounded-full bg-yellow-200 px-3 py-1 text-sm font-semibold text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100">
                    -2（最小1まで）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">復習間隔:</span>
                  <span className="text-sm font-semibold text-foreground">Stageに応じて短縮</span>
                </div>
              </div>
              <div className="rounded-md bg-background p-3 text-sm">
                <p className="mb-2 font-medium text-foreground">例:</p>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                  <li>Stage 4 → Stage 2（14日後 → 3日後に復習）</li>
                  <li>Stage 3 → Stage 1（7日後 → 1日後に復習）</li>
                  <li>Stage 1の場合はそのまま（1日後に復習）</li>
                </ul>
              </div>
            </div>

            {/* 覚えていない */}
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <h3 className="text-xl font-bold text-foreground">覚えていない</h3>
              </div>
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Stage変化:</span>
                  <span className="rounded-full bg-red-200 px-3 py-1 text-sm font-semibold text-red-900 dark:bg-red-800 dark:text-red-100">
                    -2（最小1まで）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">復習間隔:</span>
                  <span className="text-sm font-semibold text-foreground">Stageに応じて短縮</span>
                </div>
              </div>
              <div className="rounded-md bg-background p-3 text-sm">
                <p className="mb-2 font-medium text-foreground">例:</p>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                  <li>Stage 3 → Stage 1（7日後 → 1日後に復習）</li>
                  <li>Stage 5 → Stage 3（30日後 → 7日後に復習）</li>
                  <li>Stage 1の場合はそのまま（1日後に復習）</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 学習の流れ */}
        <section className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-3xl">📈</div>
            <h2 className="text-2xl font-bold">学習の流れ（具体例）</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted p-4">
              <h3 className="mb-3 font-semibold text-foreground">
                新規カード（Stage 0）からマスター（Stage 5）まで
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">1.</span>
                  <span className="text-foreground">新規カード作成</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">Stage 0</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「覚えている」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">2.</span>
                  <span className="text-foreground">1日後に復習</span>
                  <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900/30">
                    Stage 1
                  </span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「覚えている」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">3.</span>
                  <span className="text-foreground">3日後に復習</span>
                  <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs dark:bg-green-900/30">
                    Stage 2
                  </span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「覚えている」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">4.</span>
                  <span className="text-foreground">7日後に復習</span>
                  <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs dark:bg-yellow-900/30">
                    Stage 3
                  </span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「覚えている」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">5.</span>
                  <span className="text-foreground">14日後に復習</span>
                  <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs dark:bg-orange-900/30">
                    Stage 4
                  </span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「覚えている」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">6.</span>
                  <span className="text-foreground">30日後に復習（マスター達成！）</span>
                  <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-xs dark:bg-purple-900/30">
                    Stage 5 👑
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted p-4">
              <h3 className="mb-3 font-semibold text-foreground">
                Stage 4のカードで「難しい」を選んだ場合
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">現在:</span>
                  <span className="text-foreground">Stage 4（14日後に復習予定）</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ 「難しい」を選択</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">結果:</span>
                  <span className="text-foreground">Stage 2（3日後に復習）</span>
                  <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs dark:bg-green-900/30">
                    Stage 2
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  ※ Stageが下がることで、より頻繁に復習するようになります
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* よくある質問 */}
        <section className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="text-3xl">❓</div>
            <h2 className="text-2xl font-bold">よくある質問</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                Q. 「難しい」と「覚えていない」の違いは？
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                現在の実装では、どちらもStageが-2されます。将来的には「難しい」の方が軽いペナルティになる予定です。
                現時点では、どちらを選んでも同じ効果です。
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                Q. Stage 5に到達したら、もう復習しなくていいの？
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                いいえ、Stage
                5でも30日後に復習が予定されます。記憶を長期的に維持するため、定期的な復習は重要です。
                もし復習時に「覚えている」を選べば、また30日後に復習することになります。
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                Q. Stageが下がると、また最初からやり直しになるの？
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                いいえ、Stageが下がっても過去の学習履歴は残っています。復習間隔が短くなるだけで、
                カードの内容や過去の評価は消えません。何度も復習することで、徐々にStageを上げることができます。
              </p>
            </div>
          </div>
        </section>

        {/* アクションボタン */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/review"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            🎯 レビューを始める
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
