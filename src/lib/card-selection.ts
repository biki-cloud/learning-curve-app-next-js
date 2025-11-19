// 「今日やるカード」選択アルゴリズム

import { cosineSimilarity, parseEmbedding } from './embeddings';

/**
 * カード選択のスコアリングパラメータ
 */
export interface ScoringWeights {
  urgency: number; // 緊急度の重み（α）
  similarity: number; // 類似度の重み（β）
  difficultyFit: number; // 難易度フィットの重み（γ）
  keywordRelevance: number; // キーワード関連度の重み（δ）
}

/**
 * デフォルトのスコアリング重み（復習重視モード）
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  urgency: 0.5,
  similarity: 0.3,
  difficultyFit: 0.2,
  keywordRelevance: 0.0, // デフォルトではキーワードは使用しない
};

/**
 * キーワード優先モードの重み（キーワードが指定された場合）
 */
export const KEYWORD_PRIORITY_WEIGHTS: ScoringWeights = {
  urgency: 0.3,
  similarity: 0.2,
  difficultyFit: 0.1,
  keywordRelevance: 0.4, // キーワード関連度を重視
};

/**
 * カード候補の情報
 */
export interface CardCandidate {
  id: number;
  embedding: string | null;
  difficulty: number | null;
  category: string | null;
  next_review_at: number | null;
  stage: number;
}

/**
 * 現在解いたカードの情報
 */
export interface CurrentCard {
  id: number;
  embedding: string | null;
  difficulty: number | null;
}

/**
 * 緊急度スコアを計算（0〜1）
 * next_review_atが過ぎている日数が多いほど高スコア
 */
export function calculateUrgencyScore(
  nextReviewAt: number | null,
  now: number
): number {
  if (nextReviewAt === null) {
    // next_review_atがnullの場合は最高優先度（新規カード）
    return 1.0;
  }
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysOverdue = Math.max(0, (now - nextReviewAt) / msPerDay);
  
  // 0〜30日を0〜1に正規化（30日以上は1.0）
  return Math.min(1.0, daysOverdue / 30);
}

/**
 * 類似度スコアを計算（0〜1）
 */
export function calculateSimilarityScore(
  currentEmbedding: string | null,
  candidateEmbedding: string | null
): number {
  if (!currentEmbedding || !candidateEmbedding) {
    return 0; // embeddingがない場合は0
  }

  const currentVec = parseEmbedding(currentEmbedding);
  const candidateVec = parseEmbedding(candidateEmbedding);

  if (!currentVec || !candidateVec) {
    return 0;
  }

  try {
    const similarity = cosineSimilarity(currentVec, candidateVec);
    // コサイン類似度は-1〜1の範囲なので、0〜1に正規化
    return (similarity + 1) / 2;
  } catch {
    return 0;
  }
}

/**
 * キーワード関連度スコアを計算（0〜1）
 * キーワードのembeddingとカードのembeddingの類似度
 */
export function calculateKeywordRelevanceScore(
  keywordEmbedding: number[] | null,
  candidateEmbedding: string | null
): number {
  if (!keywordEmbedding || !candidateEmbedding) {
    return 0; // embeddingがない場合は0
  }

  const candidateVec = parseEmbedding(candidateEmbedding);
  if (!candidateVec) {
    return 0;
  }

  try {
    const similarity = cosineSimilarity(keywordEmbedding, candidateVec);
    // コサイン類似度は-1〜1の範囲なので、0〜1に正規化
    return (similarity + 1) / 2;
  } catch {
    return 0;
  }
}

/**
 * 難易度フィットスコアを計算（0〜1）
 * 差が小さいほど高スコア
 */
export function calculateDifficultyFitScore(
  currentDifficulty: number | null,
  candidateDifficulty: number | null
): number {
  if (currentDifficulty === null || candidateDifficulty === null) {
    return 0.5; // 難易度情報がない場合は中立
  }

  const diff = Math.abs(currentDifficulty - candidateDifficulty);
  
  // ±1まではOK、それ以上離れると減点
  if (diff <= 1) {
    return 1.0;
  } else if (diff <= 2) {
    return 0.7;
  } else if (diff <= 3) {
    return 0.4;
  } else {
    return 0.1;
  }
}

/**
 * カード候補の総合スコアを計算
 */
export function calculateCardScore(
  candidate: CardCandidate,
  currentCard: CurrentCard | null,
  now: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  keywordEmbedding: number[] | null = null
): number {
  const urgencyScore = calculateUrgencyScore(candidate.next_review_at, now);
  const similarityScore = currentCard
    ? calculateSimilarityScore(currentCard.embedding, candidate.embedding)
    : 0;
  const difficultyFitScore = currentCard
    ? calculateDifficultyFitScore(currentCard.difficulty, candidate.difficulty)
    : 0.5;
  const keywordRelevanceScore = keywordEmbedding
    ? calculateKeywordRelevanceScore(keywordEmbedding, candidate.embedding)
    : 0;

  return (
    weights.urgency * urgencyScore +
    weights.similarity * similarityScore +
    weights.difficultyFit * difficultyFitScore +
    weights.keywordRelevance * keywordRelevanceScore
  );
}

/**
 * カード候補リストから最適なカードを選択
 */
export function selectNextCard(
  candidates: CardCandidate[],
  currentCard: CurrentCard | null,
  now: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  keywordEmbedding: number[] | null = null
): CardCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  let bestCard: CardCandidate | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = calculateCardScore(candidate, currentCard, now, weights, keywordEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestCard = candidate;
    }
  }

  return bestCard;
}

