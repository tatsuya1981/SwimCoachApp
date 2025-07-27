import React, { useState, useRef, DragEvent, useEffect } from 'react';
import styles from './VideoUploader.module.css';
import VideoFormatGuide from '../VideoFormatGuide/VideoFormatGuide';

interface VideoUploaderProps {
  onVideoAnalyzed: (advice: string[]) => void;
}

interface RangePreviewFrame {
  image: string;
  label: string;
  time: number;
  error?: boolean;
}

export default function VideoUploader({ onVideoAnalyzed }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<number>(0);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  
  // 範囲選択モードの状態
  const [rangeMode, setRangeMode] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [rangePreview, setRangePreview] = useState<RangePreviewFrame[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      handleVideoFile(files[0]);
    } else {
      setError('動画ファイルを選択してください');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleVideoFile(files[0]);
    }
  };

  const handleVideoFile = async (file: File) => {
    // 以前のURLをクリーンアップ
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    setVideoFile(file);
    setError('');
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSelectedTime(0);
    setPreviewImage('');
    setRangeMode(false);
    setRangePreview([]);
    
    // ファイルサイズのチェック
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 100) {
      setError('警告: 大きな動画ファイル（100MB以上）は処理に時間がかかる場合があります。');
    }
    
    console.log('動画ファイル情報:', {
      name: file.name,
      type: file.type,
      size: `${sizeMB.toFixed(2)} MB`
    });
    
    // コーデックの互換性チェック
    await checkVideoCompatibility(file);
  };
  
  // 動画の互換性をチェックする関数
  const checkVideoCompatibility = async (file: File) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    return new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        console.log('動画コーデック情報:', {
          canPlay: video.canPlayType(file.type),
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          setError(`⚠️ この動画形式はサポートされていません。

対応形式:
• MP4 (H.264/AVC) - 推奨
• WebM, MOV

動画変換方法:
• オンライン: CloudConvert.com
• デスクトップ: HandBrake (無料)
• スマホ: 標準カメラアプリで撮影した動画はそのまま使用可能

※ MPEG-4 Visual等の古い形式は非対応です。`);
        }
        
        URL.revokeObjectURL(url);
        resolve();
      };
      
      video.onerror = () => {
        setError('⚠️ 動画の読み込みに失敗しました。動画形式を確認してください（推奨: H.264/AVC）。');
        URL.revokeObjectURL(url);
        resolve();
      };
      
      video.src = url;
    });
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      console.log('動画メタデータ読み込み完了:', {
        duration,
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
      
      setVideoDuration(duration);
      
      if (!rangeMode) {
        // 単一時点モード：中間地点を設定
        const midPoint = duration / 2;
        setSelectedTime(midPoint);
        // 初期プレビューを生成（動画が完全に読み込まれてから）
        if (videoRef.current.readyState >= 3) {
          setTimeout(() => updatePreview(midPoint), 500);
        } else {
          videoRef.current.oncanplay = () => {
            setTimeout(() => updatePreview(midPoint), 500);
          };
        }
      } else {
        // 範囲モード：開始と終了を設定（動画の最後より少し前まで）
        const safeStartTime = Math.max(0.5, duration * 0.3);
        const safeEndTime = Math.min(duration * 0.7, duration - 0.5);
        setStartTime(safeStartTime);
        setEndTime(safeEndTime);
        // 初期プレビューを生成
        if (videoRef.current.readyState >= 3) {
          setTimeout(() => updateRangePreview(), 1000);
        } else {
          videoRef.current.oncanplay = () => {
            setTimeout(() => updateRangePreview(), 1000);
          };
        }
      }
    }
  };

  // デバウンス処理を含むハンドラー
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setSelectedTime(time);
    
    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 新しいタイマーを設定（300ms後に実行）
    debounceTimerRef.current = setTimeout(() => {
      updatePreview(time);
    }, 300);
  };

  // 範囲モードのハンドラー
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setStartTime(time);
    if (time > endTime) {
      setEndTime(time);
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      updateRangePreview();
    }, 500);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setEndTime(time);
    if (time < startTime) {
      setStartTime(time);
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      updateRangePreview();
    }, 500);
  };

  const updatePreview = async (time: number) => {
    if (!videoRef.current || !videoFile || isGeneratingPreview) return;

    setIsGeneratingPreview(true);
    try {
      const preview = await extractFrameAtSpecificTime(videoFile, time, 3);
      setPreviewImage(preview);
    } catch (err) {
      console.warn('プレビュー生成エラー:', err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const updateRangePreview = async () => {
    if (!videoFile || isGeneratingPreview) return;

    setIsGeneratingPreview(true);
    setProgress('プレビューを生成中...');
    
    try {
      // 範囲内から3つのフレームを抽出（開始、中間、終了）
      const frames: RangePreviewFrame[] = [];
      const framePositions = [
        { time: startTime + 0.1, label: '開始' }, // 少しオフセットを追加
        { time: startTime + (endTime - startTime) / 2, label: '中間' },
        { time: endTime - 0.1, label: '終了' } // 少しオフセットを追加
      ];
      
      for (const position of framePositions) {
        try {
          // 動画の長さを超えないようにチェック
          const safeTime = Math.max(0.1, Math.min(position.time, videoDuration - 0.1));
          console.log(`${position.label}フレーム抽出中: ${safeTime}秒`);
          
          const frame = await extractFrameAtSpecificTime(videoFile, safeTime, 3);
          frames.push({
            image: frame,
            label: position.label,
            time: safeTime
          });
        } catch (err) {
          console.warn(`${position.label}フレームの抽出に失敗:`, err);
          // エラー時は代替画像を生成
          frames.push({
            image: '',
            label: position.label,
            time: position.time,
            error: true
          });
        }
      }
      setRangePreview(frames);
    } catch (err) {
      console.warn('範囲プレビュー生成エラー:', err);
      setError('プレビューの生成に失敗しました。動画形式を確認してください。');
    } finally {
      setIsGeneratingPreview(false);
      setProgress('');
    }
  };

  const extractFrameAtSpecificTime = (file: File, timestamp: number, retries: number = 3): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      let attemptCount = 0;
      
      const attemptExtraction = async () => {
        attemptCount++;
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // より確実な読み込みのための設定
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        
        // タイムアウトの設定
        const timeout = setTimeout(() => {
          console.warn(`フレーム抽出タイムアウト (attempt ${attemptCount}/${retries})`);
          video.src = '';
          video.load();
          
          if (attemptCount < retries) {
            setTimeout(attemptExtraction, 500);
          } else {
            reject(new Error('フレーム抽出がタイムアウトしました'));
          }
        }, 5000);

        video.onloadedmetadata = () => {
          console.log(`動画メタデータ読み込み完了: duration=${video.duration}, timestamp=${timestamp}`);
          // タイムスタンプが動画の長さを超えないようにチェック
          const safeTimestamp = Math.max(0.1, Math.min(timestamp, video.duration - 0.1));
          video.currentTime = safeTimestamp;
        };

        video.onseeked = async () => {
          // シーク完了後、少し待機してからフレーム抽出
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            // canvasのサイズを設定
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // 動画が正しく読み込まれているかチェック
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              throw new Error('動画のサイズが取得できません');
            }
            
            // フレームを描画
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 真っ黒かどうかチェック
            const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
            const isBlack = imageData.data.every((value, index) => {
              // RGBAの値をチェック（Aは除く）
              return index % 4 === 3 || value < 10;
            });
            
            if (isBlack && attemptCount < retries) {
              console.warn(`黒いフレームを検出しました。再試行します... (attempt ${attemptCount}/${retries})`);
              clearTimeout(timeout);
              video.src = '';
              video.load();
              setTimeout(attemptExtraction, 500);
              return;
            }
            
            const base64Image = canvas.toDataURL('image/jpeg', 0.9);
            clearTimeout(timeout);
            video.src = '';
            video.load();
            resolve(base64Image);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'フレーム抽出中にエラーが発生';
            console.warn(`フレーム抽出エラー (attempt ${attemptCount}/${retries}):`, errorMessage);
            clearTimeout(timeout);
            video.src = '';
            video.load();
            
            if (attemptCount < retries) {
              setTimeout(attemptExtraction, 500);
            } else {
              reject(error);
            }
          }
        };

        video.onerror = () => {
          console.warn('動画読み込みエラー:', {
            error: video.error,
            errorCode: video.error?.code,
            errorMessage: video.error?.message,
            src: video.src
          });
          clearTimeout(timeout);
          
          // リトライ可能なエラーかチェック
          if (video.error && attemptCount < retries) {
            const errorCode = video.error.code;
            // MEDIA_ERR_SRC_NOT_SUPPORTED (4) 以外はリトライ
            if (errorCode !== 4) {
              console.log(`エラーコード ${errorCode} - 再試行します...`);
              setTimeout(attemptExtraction, 500);
              return;
            }
          }
          
          reject(new Error('動画の読み込みに失敗しました'));
        };

        // Blob URLを作成
        const blobUrl = URL.createObjectURL(file);
        video.src = blobUrl;
        
        // メモリリークを防ぐため、一定時間後にBlobURLを解放
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      };
      
      // 最初の試行を開始
      attemptExtraction();
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const analyzeVideo = async () => {
    if (!videoFile) {
      setError('動画を選択してください');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setProgress('画像を抽出中...');

    try {
      let analysisData;
      
      if (!rangeMode) {
        // 単一時点モード
        const frameImage = await extractFrameAtSpecificTime(videoFile, selectedTime, 3);
        analysisData = {
          images: [frameImage],
          mode: 'single',
          timestamp: selectedTime,
        };
      } else {
        // 範囲モード：複数フレームを抽出
        setProgress('複数のフレームを抽出中...');
        const frames = [];
        const frameCount = 5; // 範囲内から5フレーム抽出
        
        for (let i = 0; i < frameCount; i++) {
          const time = Math.min(
            startTime + (endTime - startTime) * (i / (frameCount - 1)),
            videoDuration - 0.1
          );
          const frame = await extractFrameAtSpecificTime(videoFile, time, 3);
          frames.push(frame);
        }
        
        analysisData = {
          images: frames,
          mode: 'range',
          startTime,
          endTime,
        };
      }
      
      setProgress('AIが分析中...');
      
      // APIに送信
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析に失敗しました');
      }

      const data = await response.json();
      setProgress('');
      onVideoAnalyzed(data.advice);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setProgress('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // URLのクリーンアップ
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !videoFile && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        
        {!videoFile ? (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>📹</div>
            <p>動画をドラッグ＆ドロップ</p>
            <p className={styles.or}>または</p>
            <button className={styles.selectButton}>ファイルを選択</button>
            <div className={styles.supportedFormats}>
              <p>対応形式: MP4 (H.264/AVC), WebM, MOV</p>
              <p className={styles.formatHint}>※ MPEG-4 Visual等の古い形式は非対応</p>
            </div>
          </div>
        ) : (
          <div className={styles.preview}>
            <video
              ref={videoRef}
              src={videoUrl}
              className={styles.video}
              onLoadedMetadata={handleVideoLoadedMetadata}
              controls={true}
              controlsList="nodownload"
            />
            <p className={styles.fileName}>{videoFile.name}</p>
          </div>
        )}
      </div>

      {videoFile && videoDuration > 0 && (
        <div className={styles.timeSelector}>
          <h3 className={styles.timeSelectorTitle}>
            🎯 分析したい瞬間を選択してください
          </h3>
          
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${!rangeMode ? styles.active : ''}`}
              onClick={() => {
                setRangeMode(false);
                updatePreview(selectedTime);
              }}
            >
              単一時点モード
            </button>
            <button
              className={`${styles.modeButton} ${rangeMode ? styles.active : ''}`}
              onClick={() => {
                setRangeMode(true);
                updateRangePreview();
              }}
            >
              範囲指定モード
            </button>
          </div>
          
          {!rangeMode ? (
            // 単一時点モード
            <>
              <div className={styles.timeControls}>
                <label className={styles.timeLabel}>
                  時間: {formatTime(selectedTime)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={videoDuration}
                  step="0.1"
                  value={selectedTime}
                  onChange={handleTimeChange}
                  className={styles.timeSlider}
                />
                <span className={styles.duration}>
                  動画の長さ: {formatTime(videoDuration)}
                </span>
              </div>

              {isGeneratingPreview && (
                <div className={styles.loadingPreview}>プレビューを生成中...</div>
              )}

              {previewImage && !isGeneratingPreview && (
                <div className={styles.previewContainer}>
                  <p className={styles.previewLabel}>選択した瞬間のプレビュー:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewImage} 
                  alt="選択したフレーム" 
                  className={styles.previewImage}
                />
                  <p className={styles.previewHint}>
                    ※ 泳いでいる瞬間が写っていることを確認してください
                  </p>
                </div>
              )}
            </>
          ) : (
            // 範囲指定モード
            <>
              <div className={styles.rangeControls}>
                <div className={styles.rangeInput}>
                  <label className={styles.timeLabel}>
                    開始時間: {formatTime(startTime)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration}
                    step="0.1"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    className={styles.timeSlider}
                  />
                </div>
                
                <div className={styles.rangeInput}>
                  <label className={styles.timeLabel}>
                    終了時間: {formatTime(endTime)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration}
                    step="0.1"
                    value={endTime}
                    onChange={handleEndTimeChange}
                    className={styles.timeSlider}
                  />
                </div>
                
                <p className={styles.rangeDuration}>
                  選択範囲: {formatTime(endTime - startTime)}
                </p>
              </div>

              {isGeneratingPreview && (
                <div className={styles.loadingPreview}>プレビューを生成中...</div>
              )}

              {rangePreview.length > 0 && !isGeneratingPreview && (
                <div className={styles.rangePreviewContainer}>
                  <p className={styles.previewLabel}>選択範囲のプレビュー:</p>
                  <div className={styles.rangePreviewGrid}>
                    {rangePreview.map((frame, index) => (
                      <div key={index} className={styles.previewFrame}>
                        {frame.error ? (
                          <div className={styles.errorFrame}>
                            <span>⚠️</span>
                            <p>フレーム抽出エラー</p>
                          </div>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={frame.image} 
                                alt={`${frame.label}フレーム`} 
                                className={styles.rangePreviewImage}
                              />
                            <p className={styles.frameLabel}>
                              {frame.label} ({formatTime(frame.time)})
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={styles.previewHint}>
                    ※ 開始・中間・終了の3つの時点から総合的に分析します
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
          {error.includes('形式') && (
            <button 
              className={styles.formatGuideButton}
              onClick={() => setShowFormatGuide(true)}
            >
              対応形式を確認
            </button>
          )}
        </div>
      )}

      {progress && (
        <div className={styles.progress}>{progress}</div>
      )}

      {videoFile && (
        <button
          className={`${styles.analyzeButton} ${isAnalyzing ? styles.analyzing : ''}`}
          onClick={analyzeVideo}
          disabled={isAnalyzing || (!rangeMode && !previewImage) || (rangeMode && rangePreview.length === 0)}
        >
          {isAnalyzing ? (
            <>
              <span className={styles.spinner}></span>
              分析中...
            </>
          ) : (
            rangeMode ? '選択範囲を分析する' : '選択した瞬間を分析する'
          )}
        </button>
      )}

{showFormatGuide && (
  <VideoFormatGuide onClose={() => setShowFormatGuide(false)} />
)}

    </div>
  );
}