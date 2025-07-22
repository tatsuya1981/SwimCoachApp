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

    // デバッグ: 画像データの形式を確認
    console.log('画像データの先頭部分:', image.substring(0, 100));
    console.log('画像データ形式が正しいか:', image.startsWith('data:image/'));
    
    // データURLが正しい形式でない場合の修正
    let imageUrl = image;
    if (!image.startsWith('data:image/')) {
      console.warn('画像データの形式が正しくありません');
      // もしBase64文字列のみの場合は、data URLの形式に変換
      if (!image.includes('data:')) {
        imageUrl = `data:image/jpeg;base64,${image}`;
      }
    }
    
    // GPT-4o を使用して画像を分析（最新のビジョン対応モデル）
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // またはgpt-4oを使用（より高精度だが高コスト）
      messages: [
        {
          role: "system",
          content: `あなたは経験豊富な水泳コーチです。
          ユーザーから送信された画像を見て、そこに写っている水泳フォームを詳細に分析してください。
          画像には水泳をしている人が写っているはずです。
          
          以下の5つの観点から、見えている範囲で具体的なアドバイスを提供してください：
          1. 体の姿勢とストリームライン（水平姿勢、体の一直線性）
          2. 腕のストローク技術（プル、プッシュ、リカバリー動作）
          3. キック技術（膝の曲がり具合、足首の柔軟性）
          4. 呼吸のタイミングと頭の位置
          5. 全体的な効率性と改善点
          
          重要な指示：
          - 実際に画像で確認できる要素について具体的に言及してください
          - もし画像の一部しか見えない場合は、見える範囲でアドバイスしてください
          - 「画像を分析できません」などの否定的な表現は絶対に使わないでください
          - 各アドバイスは簡潔に1-2文でまとめてください
          - 励ましの言葉も含めて、前向きなトーンで書いてください`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像の水泳フォームを分析して、上達のための具体的なアドバイスを5つお願いします。"
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || '';
    console.log('AI応答:', aiResponse); // デバッグ用
    
    // レスポンスを箇条書きに分割
    const adviceList = aiResponse
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.includes('画像を分析できません'));

    return NextResponse.json({
      advice: adviceList,
      status: 'success'
    });

  } catch (error) {
    console.error('分析エラー詳細:', error);
    
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
      if (error.message.includes('Invalid image')) {
        return NextResponse.json(
          { error: '画像形式エラー: 画像データが正しく送信されていません' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: '動画の分析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ファイルサイズ制限の設定
export const runtime = 'nodejs';
export const maxDuration = 60;