// POST /api/cards/similar - テキストから類似カードを検索

import { db } from '@/server/db';
import { cardsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, and, isNotNull } from 'drizzle-orm';
import { cosineSimilarity, generateEmbedding, parseEmbedding } from '@/lib/embeddings';
import { z } from 'zod';
import { env } from '@/env';

export const runtime = 'edge';

const findSimilarSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

// POST /api/cards/similar - テキストから類似カードを検索
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, answer, limit } = findSimilarSchema.parse(body);

    // OpenAI APIキーが設定されていない場合は空配列を返す
    if (!env.OPENAI_API_KEY) {
      return Response.json([]);
    }

    // 入力テキストからembeddingを生成
    let queryEmbedding: number[];
    try {
      const textForEmbedding = `${question}\n${answer}`;
      queryEmbedding = await generateEmbedding(textForEmbedding);
    } catch (error) {
      console.error('Error generating embedding:', error);
      return Response.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    // 候補カードを取得（embeddingが存在するもの、自分のカードのみ）
    // 注意: カード数が増えると全カードを取得してメモリ上で比較するため、
    // パフォーマンスに影響が出る可能性があります
    const candidateCards = await db
      .select({
        id: cardsTable.id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        category: cardsTable.category,
        difficulty: cardsTable.difficulty,
        tags: cardsTable.tags,
        embedding: cardsTable.embedding,
      })
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.user_id, user.id),
          isNotNull(cardsTable.embedding)
        )
      );

    // カード数が多い場合の警告（1000件以上）
    if (candidateCards.length > 1000) {
      console.warn(
        `Large number of cards (${candidateCards.length}) may impact performance. Consider implementing vector search optimization.`
      );
    }

    // 各候補カードの類似度を計算
    // 最適化: 早期にソートして上位のみを保持することでメモリ使用量を削減
    const cardsWithSimilarity = candidateCards
      .map((card) => {
        const candidateEmbedding = parseEmbedding(card.embedding);
        if (!candidateEmbedding) {
          return null;
        }

        try {
          const similarity = cosineSimilarity(queryEmbedding, candidateEmbedding);
          return {
            id: card.id,
            question: card.question,
            answer: card.answer,
            category: card.category,
            difficulty: card.difficulty,
            tags: card.tags,
            similarityScore: similarity, // -1〜1の範囲
          };
        } catch {
          return null;
        }
      })
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => b.similarityScore - a.similarityScore) // 類似度の高い順
      .slice(0, limit); // 必要な分だけ取得

    return Response.json(cardsWithSimilarity);
  } catch (error) {
    console.error('Error finding similar cards:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

