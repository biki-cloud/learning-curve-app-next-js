// GET /api/cards/[id]/similar - 類似カード検索

import { db } from '@/server/db';
import { cardsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { cosineSimilarity, parseEmbedding } from '@/lib/embeddings';
import { z } from 'zod';

export const runtime = 'edge';

// GET /api/cards/[id]/similar - 類似カード検索
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const cardId = parseInt(id, 10);
    if (isNaN(cardId)) {
      return Response.json({ error: 'Invalid card ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

    // 基準カードを取得
    const [baseCard] = await db
      .select({
        id: cardsTable.id,
        embedding: cardsTable.embedding,
        category: cardsTable.category,
      })
      .from(cardsTable)
      .where(and(eq(cardsTable.id, cardId), eq(cardsTable.user_id, user.id)))
      .limit(1);

    if (!baseCard) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    if (!baseCard.embedding) {
      return Response.json({ error: 'Card embedding not found' }, { status: 404 });
    }

    const baseEmbedding = parseEmbedding(baseCard.embedding);
    if (!baseEmbedding) {
      return Response.json({ error: 'Invalid embedding format' }, { status: 500 });
    }

    // 候補カードを取得（同じカテゴリ、embeddingが存在、自分以外）
    const candidateCards = await db
      .select({
        id: cardsTable.id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        category: cardsTable.category,
        difficulty: cardsTable.difficulty,
        embedding: cardsTable.embedding,
      })
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.user_id, user.id),
          ne(cardsTable.id, cardId),
          isNotNull(cardsTable.embedding),
          baseCard.category ? eq(cardsTable.category, baseCard.category) : undefined
        )
      );

    // 各候補カードの類似度を計算
    const cardsWithSimilarity = candidateCards
      .map((card) => {
        const candidateEmbedding = parseEmbedding(card.embedding);
        if (!candidateEmbedding) {
          return null;
        }

        try {
          const similarity = cosineSimilarity(baseEmbedding, candidateEmbedding);
          return {
            id: card.id,
            question: card.question,
            answer: card.answer,
            category: card.category,
            difficulty: card.difficulty,
            similarityScore: similarity, // -1〜1の範囲
          };
        } catch {
          return null;
        }
      })
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => b.similarityScore - a.similarityScore) // 類似度の高い順
      .slice(0, limit);

    return Response.json(cardsWithSimilarity);
  } catch (error) {
    console.error('Error finding similar cards:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

