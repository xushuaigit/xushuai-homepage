'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import styles from './back-to-top.module.css';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 240);

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={styles.backToTop}
      aria-label="回到第一屏"
      title="回到第一屏"
      onClick={() => {
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }}
    >
      <ArrowUp size={22} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
