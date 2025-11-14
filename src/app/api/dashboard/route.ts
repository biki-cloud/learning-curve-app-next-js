// GET /api/dashboard - ダッシュボード情報取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, lte, and } from 'drizzle-orm';

export const runtime = 'edge';

// GET /api/dashboard - ダッシュボード情報取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();

    // 今日のレビュー対象カード数
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
          lte(cardStatesTable.next_review_at, now)
        )
      );

    // 全カード数
    const totalCards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.user_id, user.id));

    // TODO: ストリーク計算（将来的に実装）

    return Response.json({
      today_review_count: todayReviewCards.length,
      total_cards: totalCards.length,
      streak: 0, // 将来的に実装
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

