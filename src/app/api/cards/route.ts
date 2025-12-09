// POST /api/cards - カード作成
// GET /api/cards - カード一覧取得

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { syncUser } from '@/server/functions/users';
import { createInitialCardState } from '@/lib/spaced-repetition';
import { createInitialCardStateByStage } from '@/lib/learning-curve';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { eq, and, or, like, sql, isNull, isNotNull, lte, gte } from 'drizzle-orm';
import { z } from 'zod';
import { getTodayEndJST } from '@/lib/date-utils';
import { env } from '@/env';

export const runtime = 'edge';

const createCardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
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
    const { question, answer, tags, category, difficulty } = createCardSchema.parse(body);

    const now = Date.now();

    // Embedding生成（タイトル＋内容から）
    let embedding: string | null = null;
    if (env.OPENAI_API_KEY) {
      try {
        const textForEmbedding = `${question}\n${answer}`;
        const embeddingVector = await generateEmbedding(textForEmbedding);
        embedding = serializeEmbedding(embeddingVector);
      } catch (error) {
        console.error('Error generating embedding:', error);
        // embedding生成に失敗してもカード作成は続行
      }
    }

    // カードを作成
    const [card] = await db
      .insert(cardsTable)
      .values({
        user_id: user.id,
        question,
        answer,
        tags: tags ?? null,
        category: category ?? null,
        difficulty: difficulty ?? null,
        embedding,
        created_at: now,
        updated_at: now,
      })
      .returning();

    if (!card) {
      return Response.json({ error: 'Failed to create card' }, { status: 500 });
    }

    // カード状態を初期化（既存のeaseベースとstageベースの両方を設定）
    const initialState = createInitialCardState(now);
    const initialStateByStage = createInitialCardStateByStage(now);
    await db.insert(cardStatesTable).values({
      user_id: user.id,
      card_id: card.id,
      ease: initialState.ease,
      interval_days: initialState.interval_days,
      rep_count: initialState.rep_count,
      stage: initialStateByStage.stage,
      next_review_at: initialStateByStage.next_review_at,
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
    const proficiencyLevel = url.searchParams.get('proficiencyLevel') ?? ''; // 'all' | 'beginner' | 'intermediate' | 'advanced' | 'master'

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
      if (tagFilter === '__no_tag__') {
        // タグなしのカードをフィルター（tagsがnullまたは空文字列）
        conditions.push(or(isNull(cardsTable.tags), eq(cardsTable.tags, ''))!);
      } else {
        // 特定のタグでフィルター
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
    }

    // レビュー状態でフィルター
    if (reviewStatus === 'unreviewed') {
      // 未レビュー（rep_count が 0 または null）
      conditions.push(or(eq(cardStatesTable.rep_count, 0), isNull(cardStatesTable.rep_count))!);
    } else if (reviewStatus === 'reviewed') {
      // レビュー済み（rep_count > 0）
      conditions.push(
        and(isNotNull(cardStatesTable.rep_count), sql`${cardStatesTable.rep_count} > 0`)!
      );
    } else if (reviewStatus === 'due') {
      // 今日レビュー対象（next_review_at <= 今日の終わり、日本時間）
      const todayEndJST = getTodayEndJST();
      conditions.push(
        and(
          isNotNull(cardStatesTable.next_review_at),
          lte(cardStatesTable.next_review_at, todayEndJST)
        )!
      );
    }

    // 習熟度でフィルター
    if (proficiencyLevel === 'beginner') {
      // 未習熟（ease < 2.0 または null）
      conditions.push(or(isNull(cardStatesTable.ease), sql`${cardStatesTable.ease} < 2.0`)!);
    } else if (proficiencyLevel === 'intermediate') {
      // 初級（2.0 <= ease < 2.5）
      conditions.push(
        and(
          isNotNull(cardStatesTable.ease),
          gte(cardStatesTable.ease, 2.0),
          sql`${cardStatesTable.ease} < 2.5`
        )!
      );
    } else if (proficiencyLevel === 'advanced') {
      // 中級（2.5 <= ease < 3.0）
      conditions.push(
        and(
          isNotNull(cardStatesTable.ease),
          gte(cardStatesTable.ease, 2.5),
          sql`${cardStatesTable.ease} < 3.0`
        )!
      );
    } else if (proficiencyLevel === 'master') {
      // 上級（3.0 <= ease）
      conditions.push(and(isNotNull(cardStatesTable.ease), gte(cardStatesTable.ease, 3.0))!);
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
        and(eq(cardStatesTable.card_id, cardsTable.id), eq(cardStatesTable.user_id, user.id))
      )
      .where(and(...conditions))
      .orderBy(cardsTable.created_at);

    return Response.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
