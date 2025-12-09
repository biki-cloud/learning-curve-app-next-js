// POST /api/review/submit - レビュー結果を送信

import { db } from '@/server/db';
import { cardStatesTable, reviewsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { updateCardState } from '@/lib/spaced-repetition';
import { updateCardStateByStage } from '@/lib/learning-curve';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'edge';

const submitReviewSchema = z.object({
  card_id: z.number(),
  rating: z.enum(['again', 'hard', 'good']),
});

// POST /api/review/submit - レビュー結果を送信
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { card_id, rating } = submitReviewSchema.parse(body);

    const now = Date.now();

    // カード状態を取得
    const [currentState] = await db
      .select()
      .from(cardStatesTable)
      .where(and(eq(cardStatesTable.card_id, card_id), eq(cardStatesTable.user_id, user.id)))
      .limit(1);

    if (!currentState) {
      return Response.json({ error: 'Card state not found' }, { status: 404 });
    }

    // カード状態を更新（stageベースをメインに、easeベースは互換性のため維持）
    const newState = updateCardState(
      {
        ease: currentState.ease,
        interval_days: currentState.interval_days,
        rep_count: currentState.rep_count,
        next_review_at: currentState.next_review_at,
        last_reviewed_at: currentState.last_reviewed_at ?? null,
      },
      rating,
      now
    );

    const currentStage = currentState.stage ?? 0;
    const newStateByStage = updateCardStateByStage(currentStage, rating, now);

    // 正答率を計算（簡易版：直近の評価から）
    const isCorrect = rating === 'good';
    const successRate = isCorrect ? 1.0 : 0.0;

    await db
      .update(cardStatesTable)
      .set({
        ease: newState.ease,
        interval_days: newState.interval_days,
        rep_count: newState.rep_count,
        stage: newStateByStage.stage,
        next_review_at: newStateByStage.next_review_at,
        last_reviewed_at: newState.last_reviewed_at,
        success_rate: successRate,
      })
      .where(eq(cardStatesTable.id, currentState.id));

    // レビューログを記録
    await db.insert(reviewsTable).values({
      user_id: user.id,
      card_id,
      rating,
      reviewed_at: now,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error submitting review:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
