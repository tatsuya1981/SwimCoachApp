import React, { useState, useRef, DragEvent } from 'react';
import styles from './VideoUploader.module.css';

interface VideoUploaderProps {
  onVideoAnalyzed: (advice: string[]) => void;
}

export default function VideoUploader({ onVideoAnalyzed }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleVideoFile = (file: File) => {
    setVideoFile(file);
    setError('');
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const analyzeVideo = async () => {
    if (!videoFile) {
      setError('動画を選択してください');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setProgress('動画を処理中...');

    try {
      // 動画から複数の静止画を抽出
      setProgress('フレームを抽出中...');
      const frames = await extractMultipleFrames(videoFile, 3);
      
      // 最も重要なフレーム（中間）を選択
      const mainFrame = frames[Math.floor(frames.length / 2)];
      
      setProgress('AIが分析中...');
      // APIに送信
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: mainFrame,
          filename: videoFile.name,
        }),
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

  // 動画から複数のフレームを抽出する関数
  const extractMultipleFrames = async (
    file: File,
    frameCount: number = 3
  ): Promise<string[]> => {
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
        
        if (frames.length === 0) {
          reject(new Error('フレームの抽出に失敗しました'));
        } else {
          resolve(frames);
        }
      };

      video.onerror = () => {
        reject(new Error('動画の読み込みに失敗しました'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // 指定したタイムスタンプでフレームを抽出する補助関数
  const extractFrameAtTime = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    timestamp: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      video.currentTime = timestamp;
      
      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const base64Image = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64Image);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('フレームの抽出に失敗しました'));
      };
    });
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
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
          </div>
        ) : (
          <div className={styles.preview}>
            <video
              src={videoUrl}
              controls
              className={styles.video}
            />
            <p className={styles.fileName}>{videoFile.name}</p>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {progress && (
        <div className={styles.progress}>{progress}</div>
      )}

      {videoFile && (
        <button
          className={`${styles.analyzeButton} ${isAnalyzing ? styles.analyzing : ''}`}
          onClick={analyzeVideo}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className={styles.spinner}></span>
              分析中...
            </>
          ) : (
            '泳ぎを分析する'
          )}
        </button>
      )}
    </div>
  );
}