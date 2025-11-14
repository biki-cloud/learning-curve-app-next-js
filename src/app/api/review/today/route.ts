// GET /api/review/today - 今日のレビュー対象カード取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, and, lte } from 'drizzle-orm';
import { getTodayEndJST } from '@/lib/date-utils';

export const runtime = 'edge';

// GET /api/review/today - 今日のレビュー対象カード取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 日本時間の「今日」の終了時刻を使用
    const todayEndJST = getTodayEndJST();

    // next_review_at <= 今日の終了時刻（日本時間）のカードを取得
    const reviewCards = await db
      .select({
        card_id: cardsTable.id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        tags: cardsTable.tags,
        ease: cardStatesTable.ease,
        interval_days: cardStatesTable.interval_days,
        rep_count: cardStatesTable.rep_count,
        next_review_at: cardStatesTable.next_review_at,
        last_reviewed_at: cardStatesTable.last_reviewed_at,
      })
      .from(cardsTable)
      .innerJoin(
        cardStatesTable,
        eq(cardsTable.id, cardStatesTable.card_id)
      )
      .where(
        and(
          eq(cardsTable.user_id, user.id),
          lte(cardStatesTable.next_review_at, todayEndJST)
        )
      )
      .orderBy(cardStatesTable.next_review_at);

    return Response.json(reviewCards);
  } catch (error) {
    console.error('Error fetching review cards:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

