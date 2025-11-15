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
    // 生成モード
    return `あなたは学習カード作成の専門家です。ユーザーが指定したテーマ・問題から、最適な学習カードの質問と回答を生成してください。

## テーマ・問題
${question}

## 📏 カード作成のベストプラクティス（必須）

### カードの粒度：1つの概念に1つのカード
**最重要原則**: 1つのカードには、1つの明確な概念や事実だけを含めてください。複数の概念を1つのカードに詰め込むと、記憶が定着しにくくなります。

❌ 悪い例：複数の概念
質問: ReactのHooksについて説明してください
回答: useStateは状態管理、useEffectは副作用処理、useContextはコンテキスト取得、useMemoはメモ化...

✅ 良い例：1つの概念
質問: ReactのuseStateは何？
回答: 関数コンポーネントで状態を管理するためのHook。配列の分割代入で現在の値と更新関数を取得する。

### ✍️ 質問の書き方
- 明確で具体的な質問にする
- 「〜とは？」「〜は何？」「〜の違いは？」など、答えやすい形式にする
- 文脈がなくても理解できるようにする

良い質問の例：
- "JavaScriptのクロージャとは？"
- "HTTPとHTTPSの違いは？"
- "光合成の化学反応式は？"

### 📝 回答の書き方
- 簡潔に、要点を押さえる（長すぎると覚えにくい）
- Markdownを使って構造化する（コードブロック、リスト、強調など）
- 具体例を含めると記憶に残りやすい
- 自分が後で見返したときに理解できるように書く

良い回答の例：
- "関数とその関数が定義されたスコープの変数を束縛したもの。内側の関数が外側の変数にアクセスできる。"
- "Thank you / Thanks"
- "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂"

## タスク
1. テーマを分析し、含まれる概念を特定する
2. 各概念に対して、1つのカードを作成する（1つの概念 = 1つのカード）
3. 明確で具体的な質問を作成する（「〜とは？」「〜は何？」「〜の違いは？」など）
4. 簡潔で要点を押さえた回答を生成する
5. Markdown形式で構造化する（コードブロック、リスト、強調など）
6. 具体例を含めて記憶に残りやすくする
7. 複数の概念が含まれている場合は、必ず分割する

## 出力形式（JSON）
**重要: コードブロックや説明文は一切含めず、JSONオブジェクトのみを返してください。**

以下のJSON形式で返してください（コードブロック記号は使わない）：
{
  "optimizedQuestion": "生成した質問（単一概念の場合のみ使用）",
  "generatedAnswer": "生成した回答（単一概念の場合のみ使用、Markdown形式可）",
  "shouldSplit": true/false,
  "splitCards": [
    {
      "title": "分割カード1のタイトル（質問文）",
      "content": "分割カード1の内容（回答、Markdown形式可）"
    }
  ]
}

## 分割の判断基準
テーマに複数の概念が含まれている場合は、**必ず分割してください**。以下のような場合：
- 複数の独立した概念が含まれている（例: "ReactのHooksについて" → useState、useEffect、useContextなど）
- 複数の項目を説明する必要がある（例: "HTTPとHTTPSの違い" → HTTPとは、HTTPSとは、違いは何か）
- 複数の手順や要素がある（例: "トランザクション分離レベル" → 各レベルの説明）

**重要**: テーマが1つの概念のみを含む場合は、shouldSplit: false とし、optimizedQuestion と generatedAnswer に値を設定してください。
テーマが複数の概念を含む場合は、shouldSplit: true とし、splitCards に各概念ごとのカードを配列で設定してください。この場合、optimizedQuestion と generatedAnswer は空文字列にしてください。

**JSON形式の注意事項**:
- 文字列内の改行は \\n としてエスケープしてください
- 文字列内のバックスラッシュは \\\\ としてエスケープしてください
- 文字列内のダブルクォートは \\" としてエスケープしてください
- コードブロック内の文字列も適切にエスケープしてください
- JSONは完全に有効な形式で返してください（途中で切れないように）`;
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
      model: 'gpt-4o-mini',
      messages: [
      {
        role: 'system',
        content: 'あなたは学習カード作成の専門家です。最も重要な原則は「1つの概念に1つのカード」です。複数の概念を含むテーマは必ず分割してください。応答は必ず有効なJSONオブジェクトのみを返してください。コードブロックや説明文は含めず、JSONオブジェクトのみを返してください。',
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

  const data = (await response.json()) as {
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
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  } else if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
    // パターン2: 先頭が```で始まり、最後が```で終わる場合（json以外の言語タグ）
    jsonString = jsonString.replace(/^```[a-z]*\s*/, '').replace(/\s*```$/, '').trim();
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
    const optimizedQuestion = parsed.optimizedQuestion || '';
    const optimizedAnswer = parsed.optimizedAnswer;
    const generatedAnswer = parsed.generatedAnswer;
    const shouldSplit = parsed.shouldSplit ?? false;
    const splitCards: SplitCard[] = (parsed.splitCards || []).map((card) => ({
      title: card.title || '',
      content: card.content || '',
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
      
      for (let i = 0; i < repairedJson.length; i++) {
        const char = repairedJson[i];
        
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
      
      for (let i = 0; i < repairedJson.length; i++) {
        const char = repairedJson[i];
        
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
        if (splitCardsMatch) {
          const cardsContent = splitCardsMatch[1];
          // 完全なオブジェクトをカウント（文字列外の}で閉じられているもの）
          const completeObjects: number[] = [];
          let braceCount = 0;
          let inStringForBrace = false;
          let escapedForBrace = false;
          
          for (let i = 0; i < cardsContent.length; i++) {
            const char = cardsContent[i];
            
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
                if (braceCount === 0) {
                  // 新しいオブジェクトの開始
                }
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  // 完全なオブジェクトが見つかった
                  completeObjects.push(i + 1);
                }
              }
            }
          }
          
          // 完全なオブジェクトのみを残す
          if (completeObjects.length > 0) {
            const lastCompleteIndex = completeObjects[completeObjects.length - 1];
            const cleanedCards = cardsContent.substring(0, lastCompleteIndex);
            repairedJson = repairedJson.replace(/"splitCards"\s*:\s*\[[\s\S]*$/, `"splitCards": [${cleanedCards}]`);
          } else {
            // 完全なオブジェクトがない場合、splitCardsを空配列にする
            repairedJson = repairedJson.replace(/"splitCards"\s*:\s*\[[\s\S]*$/, '"splitCards": []');
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
      const optimizedQuestion = parsed.optimizedQuestion || '';
      const optimizedAnswer = parsed.optimizedAnswer;
      const generatedAnswer = parsed.generatedAnswer;
      const shouldSplit = parsed.shouldSplit ?? false;
      const splitCards: SplitCard[] = (parsed.splitCards || []).map((card) => ({
        title: card.title || '',
        content: card.content || '',
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
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
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

    const hasAnswer = answer && answer.trim().length > 0;
    const prompt = createPrompt(question, answer);

    // OpenAI API呼び出し
    const aiResponse = await callOpenAI(prompt);

    // レスポンスをパース
    const result = parseAIResponse(aiResponse, hasAnswer);

    return Response.json(result);
  } catch (error) {
    console.error('Error optimizing card:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request body', details: error.errors }, { status: 400 });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

