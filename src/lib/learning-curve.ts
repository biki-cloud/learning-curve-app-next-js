// 学習曲線アルゴリズム（stageベース）

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
 * 回答結果に基づいてカード状態を更新
 */
export function updateCardStateByStage(
  currentStage: number,
  isCorrect: boolean,
  now: number
): {
  stage: number;
  next_review_at: number;
} {
  const msPerDay = 24 * 60 * 60 * 1000;

  let newStage: number;
  let intervalDays: number;

  if (isCorrect) {
    // 正解：stageを+1（上限まで）
    newStage = Math.min(currentStage + 1, MAX_STAGE);
    intervalDays = STAGE_INTERVALS[newStage] ?? 30;
  } else {
    // 不正解・怪しい：stageを1〜2まで落とす
    newStage = Math.max(1, currentStage - 2);
    intervalDays = STAGE_INTERVALS[newStage] ?? 1;
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

