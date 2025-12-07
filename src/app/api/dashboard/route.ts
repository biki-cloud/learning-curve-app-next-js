// GET /api/dashboard - ダッシュボード情報取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable, reviewsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, lte, and, gte, sql } from 'drizzle-orm';
import { getTodayEndJST, getTodayStartJST, getDateStartJST, getDateEndJST, timestampToDateStringJST } from '@/lib/date-utils';

export const runtime = 'edge';

// GET /api/dashboard - ダッシュボード情報取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 日本時間の「今日」の開始・終了時刻を使用
    const todayStartJST = getTodayStartJST();
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

    // 今日完了したレビュー数
    const todayCompletedReviews = await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.user_id, user.id),
          gte(reviewsTable.reviewed_at, todayStartJST),
          lte(reviewsTable.reviewed_at, todayEndJST)
        )
      );

    // 過去1年間のレビュー履歴を日付ごとに集計（GitHubの草のように表示するため）
    const oneYearAgo = getDateStartJST(365);
    const allReviews = await db
      .select({
        reviewed_at: reviewsTable.reviewed_at,
      })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.user_id, user.id),
          gte(reviewsTable.reviewed_at, oneYearAgo)
        )
      );

    // 日付ごとに集計
    const reviewHistoryByDate: Record<string, number> = {};
    for (const review of allReviews) {
      const dateStr = timestampToDateStringJST(review.reviewed_at);
      reviewHistoryByDate[dateStr] = (reviewHistoryByDate[dateStr] || 0) + 1;
    }

    return Response.json({
      today_review_count: todayReviewCards.length,
      today_completed_reviews: todayCompletedReviews.length,
      total_cards: totalCards.length,
      review_history: reviewHistoryByDate,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

