'use client';

import { useState } from 'react';
import VideoUploader from '@/components/VideoUploader/VideoUploader';
import AdviceDisplay from '@/components/AdviceDisplay/AdviceDisplay';

export default function Home() {
  const [advice, setAdvice] = useState<string[]>([]);

  const handleVideoAnalyzed = (newAdvice: string[]) => {
    setAdvice(newAdvice);
  };

  return (
    <div className="home-container">
      <div className="intro-section fade-in">
        <h2>AI があなたの泳ぎを分析します！</h2>
        <p>
          水中で撮影した動画をアップロードすると、AIコーチが
          フォームを分析して改善点をアドバイスします。
        </p>
      </div>

      <VideoUploader onVideoAnalyzed={handleVideoAnalyzed} />
      
      <AdviceDisplay advice={advice} />
      
      <style jsx>{`
        .home-container {
          padding: 2rem 0;
        }

        .intro-section {
          text-align: center;
          margin-bottom: 3rem;
          background: rgba(255, 255, 255, 0.9);
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
        }

        .intro-section h2 {
          color: #667eea;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .intro-section p {
          color: #666;
          font-size: 1.1rem;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}