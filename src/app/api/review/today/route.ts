// GET /api/review/today - 今日のレビュー対象カード取得（学習曲線＋類似度アルゴリズム）

import { db } from '@/server/db';
import { cardsTable, cardStatesTable } from '@/server/db/schema';
import { getAuthUser } from '@/lib/supabase/server';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { getTodayEndJST } from '@/lib/date-utils';
import { selectNextCard, type CardCandidate, type CurrentCard } from '@/lib/card-selection';

export const runtime = 'edge';

// 1日あたりの新規カード上限
const MAX_NEW_PER_DAY = 5;

// GET /api/review/today - 今日のレビュー対象カード取得
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const currentCardId = url.searchParams.get('currentCardId'); // 現在解いたカードID（オプション）
    const limit = parseInt(url.searchParams.get('limit') ?? '1', 10); // 取得するカード数（デフォルト1）
    const excludeIdsParam = url.searchParams.get('excludeIds'); // 除外するカードIDリスト（カンマ区切り）
    const excludeIds = excludeIdsParam
      ? excludeIdsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
      : [];

    // 日本時間の「今日」の終了時刻を使用
    const todayEndJST = getTodayEndJST();
    const now = Date.now();

    // 1. レビュー対象（復習カード）を集める
    const reviewCards = await db
      .select({
        id: cardsTable.id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        tags: cardsTable.tags,
        category: cardsTable.category,
        difficulty: cardsTable.difficulty,
        embedding: cardsTable.embedding,
        ease: cardStatesTable.ease,
        interval_days: cardStatesTable.interval_days,
        rep_count: cardStatesTable.rep_count,
        stage: cardStatesTable.stage,
        next_review_at: cardStatesTable.next_review_at,
        last_reviewed_at: cardStatesTable.last_reviewed_at,
      })
      .from(cardsTable)
      .innerJoin(
        cardStatesTable,
        and(
          eq(cardsTable.id, cardStatesTable.card_id),
          eq(cardStatesTable.user_id, user.id)
        )
      )
      .where(
        and(
          eq(cardsTable.user_id, user.id),
          lte(cardStatesTable.next_review_at, todayEndJST)
        )
      );

    // 2. 新規カードを決める（stage = 0）
    const newCards = await db
      .select({
        id: cardsTable.id,
        question: cardsTable.question,
        answer: cardsTable.answer,
        tags: cardsTable.tags,
        category: cardsTable.category,
        difficulty: cardsTable.difficulty,
        embedding: cardsTable.embedding,
        ease: cardStatesTable.ease,
        interval_days: cardStatesTable.interval_days,
        rep_count: cardStatesTable.rep_count,
        stage: cardStatesTable.stage,
        next_review_at: cardStatesTable.next_review_at,
        last_reviewed_at: cardStatesTable.last_reviewed_at,
      })
      .from(cardsTable)
      .leftJoin(
        cardStatesTable,
        and(
          eq(cardsTable.id, cardStatesTable.card_id),
          eq(cardStatesTable.user_id, user.id)
        )
      )
      .where(
        and(
          eq(cardsTable.user_id, user.id),
          or(
            eq(cardStatesTable.stage, 0),
            isNull(cardStatesTable.stage)
          )
        )
      )
      .limit(MAX_NEW_PER_DAY);

    // 3. 今日の対象集合を作成（重複を除去）
    // reviewCardsとnewCardsの型を統一（null許容型に統一）
    type UnifiedCard = {
      id: number;
      question: string;
      answer: string;
      tags: string | null;
      category: string | null;
      difficulty: number | null;
      embedding: string | null;
      ease: number | null;
      interval_days: number | null;
      rep_count: number | null;
      stage: number | null;
      next_review_at: number | null;
      last_reviewed_at: number | null;
    };
    
    const cardMap = new Map<number, UnifiedCard>();
    
    // reviewCardsを追加
    for (const card of reviewCards) {
      if (!excludeIds.includes(card.id)) {
        cardMap.set(card.id, card as UnifiedCard);
      }
    }
    
    // newCardsを追加（重複チェック）
    for (const card of newCards) {
      if (!excludeIds.includes(card.id) && !cardMap.has(card.id)) {
        cardMap.set(card.id, card as UnifiedCard);
      }
    }
    
    const todayPool = Array.from(cardMap.values());

    // 4. 現在解いたカードの情報を取得（類似度計算用）
    let currentCard: CurrentCard | null = null;
    if (currentCardId) {
      const cardId = parseInt(currentCardId, 10);
      const [card] = await db
        .select({
          id: cardsTable.id,
          embedding: cardsTable.embedding,
          difficulty: cardsTable.difficulty,
        })
        .from(cardsTable)
        .where(and(eq(cardsTable.id, cardId), eq(cardsTable.user_id, user.id)))
        .limit(1);

      if (card) {
        currentCard = {
          id: card.id,
          embedding: card.embedding,
          difficulty: card.difficulty,
        };
      }
    }

    // 5. 候補をCardCandidate形式に変換
    const candidates: CardCandidate[] = todayPool.map((card) => ({
      id: card.id,
      embedding: card.embedding,
      difficulty: card.difficulty,
      category: card.category,
      next_review_at: card.next_review_at,
      stage: card.stage ?? 0,
    }));

    // 6. スコアリングして次のカードを選択
    const selectedCards: typeof todayPool = [];
    const remainingCandidates = [...candidates];

    for (let i = 0; i < Math.min(limit, todayPool.length); i++) {
      const nextCard = selectNextCard(
        remainingCandidates,
        currentCard,
        now
      );

      if (!nextCard) {
        break;
      }

      // 選択されたカードを候補から除外
      const cardIndex = remainingCandidates.findIndex((c) => c.id === nextCard.id);
      if (cardIndex >= 0) {
        remainingCandidates.splice(cardIndex, 1);
      }

      // 選択されたカードの詳細情報を取得
      const cardDetail = todayPool.find((c) => c.id === nextCard.id);
      if (cardDetail) {
        selectedCards.push(cardDetail);
        // 次のカード選択時は、今選択したカードをcurrentCardとして使う
        currentCard = {
          id: cardDetail.id,
          embedding: cardDetail.embedding,
          difficulty: cardDetail.difficulty,
        };
      }
    }

    // 7. フロントエンド互換性のため、card_idフィールドを追加し、デフォルト値を設定
    const responseCards = selectedCards.map((card) => ({
      ...card,
      card_id: card.id, // 後方互換性のため
      ease: card.ease ?? 2.3,
      interval_days: card.interval_days ?? 1,
      rep_count: card.rep_count ?? 0,
      next_review_at: card.next_review_at ?? now,
      stage: card.stage ?? 0,
    }));

    return Response.json(responseCards);
  } catch (error) {
    console.error('Error fetching review cards:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

