// POST /api/cards - カード作成
// GET /api/cards - カード一覧取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { syncUser } from '@/server/functions/users';
import { createInitialCardState } from '@/lib/spaced-repetition';
import { eq, and, or, like, sql, isNull, isNotNull, lte } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'edge';

const createCardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.string().optional(),
});

// POST /api/cards - カード作成
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーを D1 に同期
    await syncUser(user.id, user.email ?? '');

    const body = await request.json();
    const { question, answer, tags } = createCardSchema.parse(body);

    const now = Date.now();

    // カードを作成
    const [card] = await db
      .insert(cardsTable)
      .values({
        user_id: user.id,
        question,
        answer,
        tags: tags ?? null,
        created_at: now,
      })
      .returning();

    if (!card) {
      return Response.json({ error: 'Failed to create card' }, { status: 500 });
    }

    // カード状態を初期化
    const initialState = createInitialCardState(now);
    await db.insert(cardStatesTable).values({
      user_id: user.id,
      card_id: card.id,
      ease: initialState.ease,
      interval_days: initialState.interval_days,
      rep_count: initialState.rep_count,
      next_review_at: initialState.next_review_at,
      last_reviewed_at: initialState.last_reviewed_at,
    });

    return Response.json({ id: card.id });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/cards - カード一覧取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') ?? '';
    const tagFilter = url.searchParams.get('tag') ?? '';
    const reviewStatus = url.searchParams.get('reviewStatus') ?? ''; // 'all' | 'unreviewed' | 'reviewed' | 'due'

    // ベースの条件
    const conditions = [eq(cardsTable.user_id, user.id)];

    // 検索クエリでフィルター
    if (searchQuery) {
      conditions.push(
        or(
          like(cardsTable.question, `%${searchQuery}%`),
          like(cardsTable.answer, `%${searchQuery}%`)
        )!
      );
    }

    // タグでフィルター
    if (tagFilter) {
      conditions.push(
        or(
          like(cardsTable.tags, `%${tagFilter}%`),
          like(cardsTable.tags, `%,${tagFilter},%`),
          like(cardsTable.tags, `${tagFilter},%`),
          like(cardsTable.tags, `%,${tagFilter}`),
          eq(cardsTable.tags, tagFilter)
        )!
      );
    }

    // レビュー状態でフィルター
    if (reviewStatus === 'unreviewed') {
      // 未レビュー（rep_count が 0 または null）
      conditions.push(
        or(
          eq(cardStatesTable.rep_count, 0),
          isNull(cardStatesTable.rep_count)
        )!
      );
    } else if (reviewStatus === 'reviewed') {
      // レビュー済み（rep_count > 0）
      conditions.push(
        and(
          isNotNull(cardStatesTable.rep_count),
          sql`${cardStatesTable.rep_count} > 0`
        )!
      );
    } else if (reviewStatus === 'due') {
      // 今日レビュー対象（next_review_at <= 今日の終わり）
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      conditions.push(
        and(
          isNotNull(cardStatesTable.next_review_at),
          lte(cardStatesTable.next_review_at, todayEnd.getTime())
        )!
      );
    }

    const cards = await db
      .select({
        id: cardsTable.id,
        user_id: cardsTable.user_id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        tags: cardsTable.tags,
        created_at: cardsTable.created_at,
        // 習熟度情報
        ease: cardStatesTable.ease,
        interval_days: cardStatesTable.interval_days,
        rep_count: cardStatesTable.rep_count,
        next_review_at: cardStatesTable.next_review_at,
        last_reviewed_at: cardStatesTable.last_reviewed_at,
      })
      .from(cardsTable)
      .leftJoin(
        cardStatesTable,
        and(
          eq(cardStatesTable.card_id, cardsTable.id),
          eq(cardStatesTable.user_id, user.id)
        )
      )
      .where(and(...conditions))
      .orderBy(cardsTable.created_at);

    return Response.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

