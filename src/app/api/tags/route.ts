// GET /api/tags - 既存のタグ一覧取得

import { db } from '@/server/db';
import { cardsTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

export const runtime = 'edge';

// GET /api/tags - 既存のタグ一覧取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのすべてのカードを取得
    const cards = await db
      .select({
        tags: cardsTable.tags,
      })
      .from(cardsTable)
      .where(eq(cardsTable.user_id, user.id));

    // タグを抽出して重複を除去
    const tagSet = new Set<string>();
    cards.forEach((card) => {
      if (card.tags) {
        const tags = card.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        tags.forEach((tag) => tagSet.add(tag));
      }
    });

    // ソートして配列に変換
    const tags = Array.from(tagSet).sort();

    return Response.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

