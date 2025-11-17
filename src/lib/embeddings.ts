// Embedding生成と類似検索のユーティリティ

import { env } from '@/env';

/**
 * OpenAI Embeddings API を使用してテキストからembeddingを生成
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // コスト効率が良いモデル
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('No embedding in OpenAI response');
  }

  return embedding;
}

/**
 * 2つのembeddingベクトルのコサイン類似度を計算
 * @returns 0〜1の値（1に近いほど類似）
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i]! * vec2[i]!;
    norm1 += vec1[i]! * vec1[i]!;
    norm2 += vec2[i]! * vec2[i]!;
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * JSON文字列からembeddingベクトルをパース
 */
export function parseEmbedding(embeddingJson: string | null): number[] | null {
  if (!embeddingJson) {
    return null;
  }
  try {
    return JSON.parse(embeddingJson) as number[];
  } catch {
    return null;
  }
}

/**
 * embeddingベクトルをJSON文字列にシリアライズ
 */
export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
}
