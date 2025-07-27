import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, image, mode, timestamp, startTime, endTime } = body;

    // 画像データの取得（単一または複数）
    const imageArray = images || (image ? [image] : []);
    
    if (imageArray.length === 0) {
      return NextResponse.json(
        { error: '画像データが提供されていません' },
        { status: 400 }
      );
    }

    // デバッグ情報
    console.log('=== 分析モード情報 ===');
    console.log('モード:', mode || 'single');
    console.log('画像数:', imageArray.length);
    if (mode === 'single') {
      console.log('タイムスタンプ:', timestamp ? `${timestamp}秒` : '未指定');
    } else {
      console.log('範囲:', startTime && endTime ? `${startTime}秒 〜 ${endTime}秒` : '未指定');
    }
    
    // メッセージコンテンツの構築
    const messageContent = [];
    
    if (mode === 'range' && imageArray.length > 1) {
      // 範囲モード：複数画像の分析
      messageContent.push({
        type: "text" as const,
        text: "以下の複数の画像は同じ人の水泳の連続した動きを撮影したものです。すべての画像を総合的に分析して、泳ぎの改善点を5つ教えてください。"
      });
      
      // 各画像を追加
      imageArray.forEach((img: string) => {
        messageContent.push({
          type: "image_url" as const,
          image_url: {
            url: img
          }
        });
      });
    } else {
      // 単一モード：1枚の画像を分析
      messageContent.push({
        type: "text" as const,
        text: "この水泳フォームの画像を分析して、改善のための具体的なアドバイスを5つお願いします。"
      });
      messageContent.push({
        type: "image_url" as const,
        image_url: {
          url: imageArray[0]
        }
      });
    }
    
    // GPT-4o を使用して画像を分析
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 複数画像の分析には gpt-4o を推奨
      messages: [
        {
          role: "system",
          content: `あなたは経験豊富な水泳コーチです。
          ${mode === 'range' ? '提供された複数の画像から、泳ぎの全体的な動きを分析してください。' : '提供された画像から水泳フォームを分析してください。'}
          
          以下の6つの観点から具体的なアドバイスを提供してください：
          1. 体の姿勢とストリームライン（体が水平か、頭の位置は適切か）
          2. 腕のストローク技術（プル、プッシュ、リカバリーの動作）
          3. キック技術（足の動き、膝の使い方、足首の柔軟性）
          4. キック技術を伸ばすための具体歴な練習方法や具体例を提示
          5. 呼吸のタイミングと頭の位置
          6. 全体的な効率性と改善点（タイミング、リズム、協調性）
          
          重要な指示：
          - 必ず画像で見えている具体的な要素に言及してください
          ${mode === 'range' ? '- 複数の画像を比較し、動きの連続性も評価してください' : ''}
          - ポジティブで建設的なアドバイスをしてください
          - 「画像を確認できません」などの表現は使わないでください
          - 各アドバイスは1-2文で簡潔に
          - キック技術を重要視しているので、具体的な練習方法と練習例を出してください
          - 最後に可能であれば練習例を図で表してくれると助かります
          - 初心者にも分かりやすい表現を使ってください
          - 励ましの言葉も含めてください`
        },
        {
          role: "user",
          content: messageContent
        }
      ],
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || '';
    console.log('AI応答（最初の200文字）:', aiResponse.substring(0, 200));
    
    // ネガティブな表現を除外
    const negativePatterns = [
      '画像を直接分析することはできません',
      '画像を確認することはできません',
      '画像を分析できません',
      '見ることができません',
      '確認できません',
      '画像が提供されていません'
    ];
    
    // レスポンスを箇条書きに分割し、ネガティブな表現を除外
    let adviceList = aiResponse
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(line => {
        return line.length > 0 && 
               !negativePatterns.some(pattern => line.includes(pattern));
      });

    // アドバイスが少ない場合のフォールバック
    if (adviceList.length < 3) {
      console.warn('⚠️ AIからの有効なアドバイスが少ないため、基本的なアドバイスを提供します');
      
      adviceList = [
        "体を水平に保つことを意識しましょう。頭を少し下げて、腰が沈まないようにすると抵抗が減ります。",
        "腕のストロークは大きく、しっかりと水をかくことが大切です。肘を高く保ちながら水をキャッチしましょう。",
        "キックは細かく速く打つよりも、しなやかで力強いキックを心がけましょう。膝を曲げすぎないように注意してください。",
        "呼吸は横を向いて素早く行い、顔を上げすぎないようにしましょう。リズムよく呼吸することで楽に泳げます。",
        "全体的にリラックスして泳ぐことが大切です。力みすぎず、水の流れを感じながら効率的に進みましょう。"
      ];
    }

    console.log(`最終的なアドバイス数: ${adviceList.length}`);

    return NextResponse.json({
      advice: adviceList,
      status: 'success',
      analysisMode: mode || 'single',
      framesAnalyzed: imageArray.length
    });

  } catch (error) {
    console.error('分析エラー詳細:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'APIキーが設定されていません',
            details: 'OpenAI APIキーを.env.localファイルに設定してください' 
          },
          { status: 500 }
        );
      }
      if (error.message.includes('model')) {
        return NextResponse.json(
          { 
            error: 'モデルエラー',
            details: '指定されたモデルが利用できません。gpt-4oまたはgpt-4o-miniを使用してください' 
          },
          { status: 500 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'API使用制限エラー',
            details: 'APIの使用制限に達しました。しばらく待ってから再試行してください' 
          },
          { status: 429 }
        );
      }
      if (error.message.includes('Invalid image')) {
        return NextResponse.json(
          { 
            error: '画像形式エラー',
            details: '画像データが正しく送信されていません' 
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: '動画の分析中にエラーが発生しました',
        details: '予期しないエラーが発生しました。もう一度お試しください' 
      },
      { status: 500 }
    );
  }
}

// エクスポート設定
export const runtime = 'nodejs';
export const maxDuration = 60;