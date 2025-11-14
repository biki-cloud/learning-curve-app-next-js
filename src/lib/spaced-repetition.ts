// 記憶アルゴリズム（Spaced Repetition）の実装

export type Rating = 'again' | 'hard' | 'good';

export interface CardState {
  ease: number;
  interval_days: number;
  rep_count: number;
  next_review_at: number;
  last_reviewed_at: number | null;
}

/**
 * 初期カード状態を生成
 */
export function createInitialCardState(now: number): CardState {
  return {
    ease: 2.3,
    interval_days: 1,
    rep_count: 0,
    next_review_at: now,
    last_reviewed_at: null,
  };
}

/**
 * 評価に基づいてカード状態を更新
 */
export function updateCardState(
  currentState: CardState,
  rating: Rating,
  now: number
): CardState {
  const msPerDay = 24 * 60 * 60 * 1000;
  let newEase = currentState.ease;
  let newInterval = currentState.interval_days;
  let nextReviewAt: number;

  switch (rating) {
    case 'again':
      // Again（覚えてない）
      newEase = Math.max(1.2, currentState.ease - 0.3);
      newInterval = 1;
      nextReviewAt = now + msPerDay; // 1日後
      break;

    case 'hard':
      // Hard（怪しい）
      newEase = currentState.ease - 0.05;
      newInterval = Math.floor(currentState.interval_days * 1.2);
      nextReviewAt = now + newInterval * msPerDay;
      break;

    case 'good':
      // Good（覚えてた）
      newEase = currentState.ease + 0.05;
      newInterval = Math.floor(currentState.interval_days * currentState.ease);
      nextReviewAt = now + newInterval * msPerDay;
      break;
  }

  return {
    ease: newEase,
    interval_days: newInterval,
    rep_count: currentState.rep_count + 1,
    next_review_at: nextReviewAt,
    last_reviewed_at: now,
  };
}

