import React from 'react';
import styles from './VideoFormatGuide.module.css';

interface VideoFormatGuideProps {
  onClose: () => void;
}

export default function VideoFormatGuide({ onClose }: VideoFormatGuideProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
        
        <h2 className={styles.title}>📹 動画形式について</h2>
        
        <div className={styles.section}>
          <h3>✅ 対応している形式</h3>
          <ul>
            <li><strong>MP4 (H.264/AVC)</strong> - 最も推奨</li>
            <li><strong>WebM (VP8/VP9)</strong></li>
            <li><strong>MOV (H.264)</strong></li>
          </ul>
        </div>
        
        <div className={styles.section}>
          <h3>❌ 対応していない形式</h3>
          <ul>
            <li>MPEG-4 Visual (古いMP4形式)</li>
            <li>DivX/Xvid</li>
            <li>WMV</li>
            <li>AVI (一部のコーデック)</li>
          </ul>
        </div>
        
        <div className={styles.section}>
          <h3>🔄 動画の変換方法</h3>
          
          <div className={styles.method}>
            <h4>1. オンラインツール（無料）</h4>
            <ul>
              <li><strong>CloudConvert</strong> - cloudconvert.com</li>
              <li><strong>Convertio</strong> - convertio.co/ja/</li>
              <li><strong>Online-Convert</strong> - online-convert.com</li>
            </ul>
            <p className={styles.note}>※ ファイルサイズ制限あり（通常100MB程度）</p>
          </div>
          
          <div className={styles.method}>
            <h4>2. デスクトップソフト（無料）</h4>
            <ul>
              <li><strong>HandBrake</strong> - 高機能で使いやすい</li>
              <li><strong>VLC Media Player</strong> - 再生だけでなく変換も可能</li>
              <li><strong>FFmpeg</strong> - コマンドライン（上級者向け）</li>
            </ul>
          </div>
          
          <div className={styles.method}>
            <h4>3. スマートフォンアプリ</h4>
            <ul>
              <li><strong>Video Converter (Android)</strong></li>
              <li><strong>Video Compress (iOS)</strong></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.recommendation}>
          <h4>💡 推奨設定</h4>
          <ul>
            <li>形式: MP4</li>
            <li>動画コーデック: H.264/AVC</li>
            <li>音声コーデック: AAC</li>
            <li>解像度: 1920x1080以下</li>
            <li>ビットレート: 5-10 Mbps</li>
            <li>フレームレート: 30fps</li>
          </ul>
        </div>
        
        <div className={styles.tips}>
          <p>💡 <strong>ヒント</strong>: 最近のスマートフォンで撮影した動画は、通常そのまま使用できます。古いデジカメや特殊な編集ソフトで作成した動画は変換が必要な場合があります。</p>
        </div>
      </div>
    </div>
  );
}