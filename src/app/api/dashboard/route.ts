// GET /api/dashboard - ダッシュボード情報取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, lte, and } from 'drizzle-orm';
import { getTodayEndJST } from '@/lib/date-utils';

export const runtime = 'edge';

// GET /api/dashboard - ダッシュボード情報取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 日本時間の「今日」の終了時刻を使用
    const todayEndJST = getTodayEndJST();

    // 今日のレビュー対象カード数（日本時間の「今日」までに期限が来たカード）
    const todayReviewCards = await db
      .select()
      .from(cardsTable)
      .innerJoin(
        cardStatesTable,
        eq(cardsTable.id, cardStatesTable.card_id)
      )
      .where(
        and(
          eq(cardStatesTable.user_id, user.id),
          lte(cardStatesTable.next_review_at, todayEndJST)
        )
      );

    // 全カード数
    const totalCards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.user_id, user.id));

    return Response.json({
      today_review_count: todayReviewCards.length,
      total_cards: totalCards.length,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

