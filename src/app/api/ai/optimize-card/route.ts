// POST /api/ai/optimize-card - AIによるカード最適化・生成

import { getAuthUser } from '@/lib/supabase/server';
import { env } from '@/env';
import { z } from 'zod';

export const runtime = 'edge';

const optimizeCardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().optional(),
});

interface SplitCard {
  title: string;
  content: string;
}

interface OptimizeResponse {
  mode: 'revise' | 'generate';
  optimizedQuestion: string;
  optimizedAnswer?: string;
  generatedAnswer?: string;
  shouldSplit: boolean;
  splitCards: SplitCard[];
}

// AIプロンプト生成関数
function createPrompt(question: string, answer?: string): string {
  const hasAnswer = answer && answer.trim().length > 0;

  if (hasAnswer) {
    // 添削モード
    return `あなたは学習カード作成の専門家です。ユーザーが作成した学習カードを添削し、より理解しやすく、記憶に定着しやすい形に改善してください。

## 現在のカード
**質問:** ${question}
**回答:** ${answer}

## タスク
1. 質問と回答をより明確で簡潔に改善する
2. 専門用語があれば、その意味や背景を補強する
3. 冗長な部分を整理し、要点を明確にする
4. Markdown形式で構造化する（コードブロック、リストなど）
5. 1つのカードに複数の概念が含まれている場合は、分割を検討する

## 出力形式（JSON）
**重要: コードブロックや説明文は一切含めず、JSONオブジェクトのみを返してください。**

以下のJSON形式で返してください（コードブロック記号は使わない）：
{
  "optimizedQuestion": "改善後の質問",
  "optimizedAnswer": "改善後の回答（Markdown形式可）",
  "shouldSplit": true/false,
  "splitCards": [
    {
      "title": "分割カード1のタイトル",
      "content": "分割カード1の内容（Markdown形式可）"
    }
  ]
}

分割が必要な場合の基準：
- 2つ以上の独立した概念が含まれている
- 内容が長すぎて1枚のカードでは覚えにくい
- 学習しやすい粒度に分割した方が効率的な場合

分割が必要ない場合は、shouldSplit: false とし、splitCards は空配列にしてください。`;
  } else {
    // 生成モード（GPT-4.1専用最適化版）
    return `以下のテーマ・問題から、最適な学習カードを生成または分割してください。

## 🎯 テーマ・問題

${question}

---

# 📏 必須ルール（GPT-4.1最適化版）

## 1. 1カード1概念（最優先）

カードには1つの概念・事実・比較軸のみを含めてください。
複数ある場合は必ず分割してください。

分割対象の例：
- 複数の専門用語（例: useState / useEffect / useMemo）
- 比較（例: HTTP vs HTTPS）
- 種類・分類（例: トランザクション分離レベルの4種類）
- 手順・フェーズ（例: OAuthの流れ）
- 原因と結果が複数ある場合
- 長くなりすぎる場合

---

## 2. 質問（カードタイトル）のルール

- 「〜とは？」「〜は何？」「〜の違いは？」を基本とする
- 文脈なしでも理解できる
- 概念の単位を揃える（抽象度・粒度が統一）

---

## 3. 回答（content）のルール

- 最初に本質の1行まとめを書く（超重要）
- 次に補足説明（理由・仕組み・特徴のいずれか）
- "例"か"比較"を最低1つ含める（記憶に残るため）
- Markdownのリストや強調を活用して整理

**推奨構成（GPT-4.1向け）**
1. 要点1行
2. 詳細説明
3. 例・比較（どちらか必須）

---

# 🧠 GPT-4.1に求めるタスク

1. テーマの概念を正確に抽出
2. 各概念を独立カードに構造化
3. 明確で答えやすい質問文に変換
4. 簡潔＋深い回答を生成
5. 例・理由・比較を適切に追加
6. 概念数に応じて shouldSplit を判断
7. JSONを完全に有効な形式で返す

---

# 📤 出力形式（JSONのみ）

{
  "optimizedQuestion": "単一概念の場合のみ。複数概念なら空文字列",
  "generatedAnswer": "単一概念の場合のみ。Markdown可。複数概念なら空文字列",
  "shouldSplit": true/false,
  "splitCards": [
    {
      "title": "カード1の質問文",
      "content": "カード1の回答（Markdown可）"
    }
  ]
}

---

# ⚠ JSON整形ルール

- 改行は \\n
- バックスラッシュは \\\\
- ダブルクォートは \\"
- JSONオブジェクト以外の文字列を出さない`;
  }
}

// OpenAI API呼び出し
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'あなたは高度な構造化と知識整理に特化した学習カード作成の専門家です。\n最重要原則は「1つの概念に1つのカード」です。\nテーマに複数の概念・用語・観点・手順・比較が含まれる場合は、必ず分割してください。\n\nあなたの目的は、ユーザーが後から読み返したときに「一瞬で理解できる」最適な学習カードを作成することです。\n\n- 情報抽出の正確さ\n- 粒度の均一性\n- 概念分割の適切さ\n- Markdownでの構造化\n- JSONの厳密な整合性\n\nこれらを高いレベルで実行してください。\n\n返答は必ず **有効なJSONオブジェクトのみ** を返し、文章説明・前置き・コードブロックは一切含めてはいけません。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as unknown as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return content;
}

// JSONレスポンスをパース
function parseAIResponse(content: string, hasAnswer: boolean): OptimizeResponse {
  let jsonString = content.trim();

  // JSON全体を囲むコードブロックのみを除去（文字列値内のコードブロックは残す）
  // パターン1: 先頭が```jsonで始まり、最後が```で終わる場合のみ除去
  if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
    jsonString = jsonString
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
  } else if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
    // パターン2: 先頭が```で始まり、最後が```で終わる場合（json以外の言語タグ）
    jsonString = jsonString
      .replace(/^```[a-z]*\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
  } else {
    // パターン3: コードブロックで囲まれていない場合、最初の { から最後の } までを抽出
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }

  // 前後の不要な文字を除去
  jsonString = jsonString.trim();

  // 不完全なJSONを修復する試み
  // 文字列値が閉じられていない場合を検出して修復
  try {
    // まず通常のパースを試みる
    const parsed = JSON.parse(jsonString) as {
      optimizedQuestion?: string;
      optimizedAnswer?: string;
      generatedAnswer?: string;
      shouldSplit?: boolean;
      splitCards?: Array<{ title?: string; content?: string }>;
    };

    const mode = hasAnswer ? 'revise' : 'generate';
    const optimizedQuestion = parsed.optimizedQuestion ?? '';
    const optimizedAnswer = parsed.optimizedAnswer;
    const generatedAnswer = parsed.generatedAnswer;
    const shouldSplit = parsed.shouldSplit ?? false;
    const splitCards: SplitCard[] = (parsed.splitCards ?? []).map((card) => ({
      title: card.title ?? '',
      content: card.content ?? '',
    }));

    return {
      mode,
      optimizedQuestion,
      ...(hasAnswer ? { optimizedAnswer } : { generatedAnswer }),
      shouldSplit,
      splitCards,
    };
  } catch (parseError) {
    // JSONパースに失敗した場合、より積極的な修復を試みる
    console.warn('Initial JSON parse failed, attempting repair...');

    try {
      // 不完全な文字列を修復: 文字列値内の改行や特殊文字を適切にエスケープ
      let repairedJson = jsonString;

      // 文字列値内の改行をエスケープ（文字列のコンテキスト内のみ）
      // ダブルクォートで囲まれた文字列内の改行をエスケープ
      let inString = false;
      let escaped = false;
      let result = '';

      for (const char of repairedJson) {
        if (escaped) {
          result += char;
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          result += char;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }

        if (inString) {
          if (char === '\n') {
            result += '\\n';
          } else if (char === '\r') {
            result += '\\r';
          } else if (char === '\t') {
            result += '\\t';
          } else if (char === '"') {
            // ダブルクォートはエスケープ（ただし、これは文字列の終了を意味するので通常は発生しない）
            result += '\\"';
          } else if (char === '\\') {
            // バックスラッシュは既にエスケープされている
            result += char;
          } else {
            result += char;
          }
        } else {
          result += char;
        }
      }

      repairedJson = result;

      // JSONが途中で切れている場合、閉じ括弧を追加（文字列外の括弧のみカウント）
      inString = false;
      escaped = false;
      let openBraces = 0;
      let openBrackets = 0;

      for (const char of repairedJson) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') openBraces++;
          if (char === '}') openBraces--;
          if (char === '[') openBrackets++;
          if (char === ']') openBrackets--;
        }
      }

      // 文字列が閉じられていない場合を検出して修復
      // 最後の文字列が閉じられていない場合、閉じクォートを追加
      if (inString) {
        // 文字列が閉じられていない場合、閉じクォートを追加
        repairedJson += '"';
      }

      // 不完全なオブジェクトを検出して修復
      // 最後のオブジェクトが不完全な場合（"title"や"content"が不完全）、そのオブジェクトを削除
      const lastOpenBracket = repairedJson.lastIndexOf('[');
      const lastCloseBracket = repairedJson.lastIndexOf(']');

      // splitCards配列内の最後のオブジェクトが不完全な場合を検出
      if (lastOpenBracket > lastCloseBracket) {
        // 配列が閉じられていない
        // 最後の不完全なオブジェクトを探して削除（文字列のコンテキストを考慮）
        const splitCardsMatch = repairedJson.match(/"splitCards"\s*:\s*\[([\s\S]*)$/);
        const cardsContent = splitCardsMatch?.[1];
        if (cardsContent) {
          // 完全なオブジェクトをカウント（文字列外の}で閉じられているもの）
          const completeObjects: number[] = [];
          let braceCount = 0;
          let inStringForBrace = false;
          let escapedForBrace = false;

          for (const char of cardsContent) {
            if (escapedForBrace) {
              escapedForBrace = false;
              continue;
            }

            if (char === '\\') {
              escapedForBrace = true;
              continue;
            }

            if (char === '"') {
              inStringForBrace = !inStringForBrace;
              continue;
            }

            if (!inStringForBrace) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  // 完全なオブジェクトが見つかった
                  const currentIndex = cardsContent.indexOf(
                    char,
                    completeObjects.length > 0 ? completeObjects[completeObjects.length - 1] : 0
                  );
                  if (currentIndex !== -1) {
                    completeObjects.push(currentIndex + 1);
                  }
                }
              }
            }
          }

          // 完全なオブジェクトのみを残す
          if (completeObjects.length > 0 && cardsContent) {
            const lastCompleteIndex = completeObjects[completeObjects.length - 1];
            const cleanedCards = cardsContent.substring(0, lastCompleteIndex);
            repairedJson = repairedJson.replace(
              /"splitCards"\s*:\s*\[[\s\S]*$/,
              `"splitCards": [${cleanedCards}]`
            );
          } else {
            // 完全なオブジェクトがない場合、splitCardsを空配列にする
            repairedJson = repairedJson.replace(
              /"splitCards"\s*:\s*\[[\s\S]*$/,
              '"splitCards": []'
            );
          }
        }
      }

      // 閉じられていない括弧を追加
      while (openBrackets > 0) {
        repairedJson += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        repairedJson += '}';
        openBraces--;
      }

      // 再度パースを試みる
      const parsed = JSON.parse(repairedJson) as {
        optimizedQuestion?: string;
        optimizedAnswer?: string;
        generatedAnswer?: string;
        shouldSplit?: boolean;
        splitCards?: Array<{ title?: string; content?: string }>;
      };

      const mode = hasAnswer ? 'revise' : 'generate';
      const optimizedQuestion = parsed.optimizedQuestion ?? '';
      const optimizedAnswer = parsed.optimizedAnswer;
      const generatedAnswer = parsed.generatedAnswer;
      const shouldSplit = parsed.shouldSplit ?? false;
      const splitCards: SplitCard[] = (parsed.splitCards ?? []).map((card) => ({
        title: card.title ?? '',
        content: card.content ?? '',
      }));

      return {
        mode,
        optimizedQuestion,
        ...(hasAnswer ? { optimizedAnswer } : { generatedAnswer }),
        shouldSplit,
        splitCards,
      };
    } catch (repairError) {
      // 修復も失敗した場合、エラーをログに出力
      console.error('Failed to parse AI response:', parseError);
      console.error('Repair attempt also failed:', repairError);
      console.error('Content preview:', content.substring(0, 1000));
      console.error('JSON string preview:', jsonString.substring(0, 1000));
      throw new Error(
        `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      );
    }
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // APIキーの確認
    if (!env.OPENAI_API_KEY) {
      return Response.json(
        { error: 'AI feature is not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { question, answer } = optimizeCardSchema.parse(body);

    const hasAnswer = Boolean(answer && answer.trim().length > 0);
    const prompt = createPrompt(question, answer);

    // OpenAI API呼び出し
    const aiResponse = await callOpenAI(prompt);

    // レスポンスをパース
    const result = parseAIResponse(aiResponse, hasAnswer);

    return Response.json(result);
  } catch (error) {
    console.error('Error optimizing card:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
