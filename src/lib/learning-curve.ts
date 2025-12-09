// 学習曲線アルゴリズム（stageベース）

import type { Rating } from './spaced-repetition';

/**
 * ステージごとの復習間隔（日数）
 */
export const STAGE_INTERVALS: Record<number, number> = {
  0: 0, // 新規（当日 or 明日）
  1: 1, // 1日後
  2: 3, // 3日後
  3: 7, // 7日後
  4: 14, // 14日後
  5: 30, // 30日後（マスター段階）
};

/**
 * 最大ステージ
 */
export const MAX_STAGE = 5;

/**
 * 回答結果に基づいてカード状態を更新（改善版）
 *
 * 改善ポイント：
 * - again と hard を差別化
 * - good の上がり方を後半（stage 3〜4）は慎重に（stage維持して間隔を短めに）
 * - again は今日中に再登場（intervalDays = 0）
 */
export function updateCardStateByStage(
  currentStage: number,
  rating: Rating,
  now: number
): {
  stage: number;
  next_review_at: number;
} {
  const msPerDay = 24 * 60 * 60 * 1000;

  let newStage: number;
  let intervalDays: number;

  switch (rating) {
    case 'again':
      // 覚えてない：stageを大きく下げる（最低0まで）& 今日中に再登場
      newStage = Math.max(0, currentStage - 2);
      intervalDays = 0; // 今日中に再登場
      break;

    case 'hard':
      // かなり怪しい・ギリギリ：軽めのペナルティ & 短めの間隔
      newStage = Math.max(1, currentStage - 1);
      // 新しいstageの間隔より少し短めにする
      const baseInterval = STAGE_INTERVALS[newStage] ?? 1;
      intervalDays = Math.max(1, baseInterval - 1);
      break;

    case 'good':
      // 覚えている
      if (currentStage <= 2) {
        // stage 0〜2：good 1回で +1
        newStage = Math.min(currentStage + 1, MAX_STAGE);
        intervalDays = STAGE_INTERVALS[newStage] ?? 30;
      } else if (currentStage === 3 || currentStage === 4) {
        // stage 3〜4：慎重に（stage維持、間隔を少し短めにして再確認）
        newStage = currentStage;
        const normalInterval = STAGE_INTERVALS[newStage] ?? 30;
        // 間隔を少し短めにして、より頻繁に確認
        intervalDays = Math.max(1, Math.floor(normalInterval * 0.7));
      } else {
        // stage 5（マスター）：維持
        newStage = currentStage;
        intervalDays = STAGE_INTERVALS[newStage] ?? 30;
      }
      break;
  }

  return {
    stage: newStage,
    next_review_at: now + intervalDays * msPerDay,
  };
}

/**
 * 初期カード状態を生成（stageベース）
 */
export function createInitialCardStateByStage(now: number): {
  stage: number;
  next_review_at: number;
} {
  return {
    stage: 0, // 新規
    next_review_at: now, // 当日 or 明日
  };
}
