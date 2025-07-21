import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: '画像データが提供されていません' },
        { status: 400 }
      );
    }

    // 注意: 実際のアプリケーションでは、動画から複数のフレームを抽出して
    // より詳細な分析を行うことをお勧めします
    
    // GPT-4o を使用して画像を分析（最新のビジョン対応モデル）
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // またはgpt-4oを使用（より高精度だが高コスト）
      messages: [
        {
          role: "system",
          content: `あなたは経験豊富な水泳コーチです。
          提供された水泳の画像を分析し、以下の観点から具体的なアドバイスを5つ提供してください：
          1. 体の姿勢とストリームライン
          2. 腕のストローク技術
          3. キック技術
          4. 呼吸のタイミング
          5. 全体的な効率性と改善点
          
          アドバイスは初心者〜中級者向けに、分かりやすく実践的な内容にしてください。
          各アドバイスは1〜2文で簡潔にまとめてください。`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この水泳フォームを分析して、改善点を教えてください。"
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || '';
    
    // レスポンスを箇条書きに分割
    const adviceList = aiResponse
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    return NextResponse.json({
      advice: adviceList,
      status: 'success'
    });

  } catch (error) {
    console.error('分析エラー:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'APIキーが設定されていません' },
          { status: 500 }
        );
      }
      if (error.message.includes('model')) {
        return NextResponse.json(
          { error: 'モデルエラー: 最新のモデルを使用してください' },
          { status: 500 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'APIの使用制限に達しました。しばらく待ってから再試行してください' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '動画の分析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ファイルサイズ制限の設定（必要に応じて調整）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};