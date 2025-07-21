import React from 'react';
import styles from './AdviceDisplay.module.css';

interface AdviceDisplayProps {
  advice: string[];
}

export default function AdviceDisplay({ advice }: AdviceDisplayProps) {
  if (advice.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <span className={styles.icon}>💡</span>
        AIコーチからのアドバイス
      </h2>
      <ul className={styles.adviceList}>
        {advice.map((item, index) => (
          <li key={index} className={styles.adviceItem}>
            <span className={styles.number}>{index + 1}</span>
            <p>{item}</p>
          </li>
        ))}
      </ul>
      <div className={styles.encouragement}>
        <p>🎯 これらのポイントを意識して練習すれば、必ず上達します！</p>
        <p>がんばって！💪</p>
      </div>
    </div>
  );
}