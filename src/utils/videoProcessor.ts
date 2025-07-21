/**
 * 動画から静止画を抽出する関数
 * @param videoFile - 動画ファイル
 * @param timestamp - 抽出するタイムスタンプ（秒）
 * @returns Base64エンコードされた画像
 */
export async function extractFrameFromVideo(
  videoFile: File,
  timestamp: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'metadata';
    video.currentTime = timestamp;

    video.onloadeddata = () => {
      // キャンバスサイズを動画に合わせる
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 動画フレームをキャンバスに描画
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // キャンバスをBase64に変換
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      resolve(base64Image);
    };

    video.onerror = () => {
      reject(new Error('動画の読み込みに失敗しました'));
    };

    // 動画ファイルを読み込む
    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * 動画から複数のフレームを抽出する関数
 * @param videoFile - 動画ファイル
 * @param frameCount - 抽出するフレーム数
 * @returns Base64エンコードされた画像の配列
 */
export async function extractMultipleFrames(
  videoFile: File,
  frameCount: number = 3
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'metadata';

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames: string[] = [];
      
      // 動画の長さに基づいてフレームを抽出
      for (let i = 0; i < frameCount; i++) {
        const timestamp = (duration / (frameCount + 1)) * (i + 1);
        
        try {
          const frame = await extractFrameAtTime(video, canvas, ctx, timestamp);
          frames.push(frame);
        } catch (error) {
          console.error(`フレーム ${i + 1} の抽出に失敗:`, error);
        }
      }
      
      resolve(frames);
    };

    video.onerror = () => {
      reject(new Error('動画の読み込みに失敗しました'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * 指定したタイムスタンプでフレームを抽出する補助関数
 */
function extractFrameAtTime(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  timestamp: number
): Promise<string> {
  return new Promise((resolve) => {
    video.currentTime = timestamp;
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      resolve(base64Image);
    };
  });
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}