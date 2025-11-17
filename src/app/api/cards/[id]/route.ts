// PUT /api/cards/[id] - カード編集
// DELETE /api/cards/[id] - カード削除

import { db } from '@/server/db';
import { cardsTable, cardStatesTable, reviewsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '@/env';

export const runtime = 'edge';

const updateCardSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  tags: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

// PUT /api/cards/[id] - カード編集
export async function PUT(
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

    const body = await request.json();
    const updateData = updateCardSchema.parse(body);

    // カードが存在し、ユーザーが所有しているか確認
    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, cardId), eq(cardsTable.user_id, user.id)))
      .limit(1);

    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    // questionまたはanswerが更新された場合はembeddingを再生成
    const shouldRegenerateEmbedding =
      (updateData.question !== undefined || updateData.answer !== undefined) &&
      env.OPENAI_API_KEY;

    let embedding: string | undefined;
    if (shouldRegenerateEmbedding) {
      try {
        const question = updateData.question ?? card.question;
        const answer = updateData.answer ?? card.answer;
        const textForEmbedding = `${question}\n${answer}`;
        const embeddingVector = await generateEmbedding(textForEmbedding);
        embedding = serializeEmbedding(embeddingVector);
      } catch (error) {
        console.error('Error regenerating embedding:', error);
        // embedding生成に失敗しても更新は続行
      }
    }

    // カードを更新
    const finalUpdateData = {
      ...updateData,
      ...(embedding !== undefined ? { embedding } : {}),
      updated_at: Date.now(),
    };

    await db
      .update(cardsTable)
      .set(finalUpdateData)
      .where(eq(cardsTable.id, cardId));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error updating card:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cards/[id] - カード削除
export async function DELETE(
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

    // カードが存在し、ユーザーが所有しているか確認
    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, cardId), eq(cardsTable.user_id, user.id)))
      .limit(1);

    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    // 関連データを削除（card_states, reviews）
    await db.delete(cardStatesTable).where(eq(cardStatesTable.card_id, cardId));
    await db.delete(reviewsTable).where(eq(reviewsTable.card_id, cardId));
    
    // カードを削除
    await db.delete(cardsTable).where(eq(cardsTable.id, cardId));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

