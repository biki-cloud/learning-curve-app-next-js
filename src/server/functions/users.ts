// ユーザー関連の関数

import { db } from '@/server/db';
import { usersTable } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * ユーザーを D1 に同期（存在しない場合は作成）
 */
export async function syncUser(userId: string, email: string) {
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    await db.insert(usersTable).values({
      id: userId,
      email,
      created_at: Date.now(),
    });
  }

  return { id: userId, email };
}

