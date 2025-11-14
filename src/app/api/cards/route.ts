// POST /api/cards - カード作成
// GET /api/cards - カード一覧取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { syncUser } from '@/server/functions/users';
import { createInitialCardState } from '@/lib/spaced-repetition';
import { eq } from 'drizzle-orm';
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

    const cards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.user_id, user.id))
      .orderBy(cardsTable.created_at);

    return Response.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

