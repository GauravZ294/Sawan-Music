import React, { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';

interface AppLoaderProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const petals = Array.from({ length: 20 }, (_, index) => ({
  left: `${(index * 47 + 7) % 100}%`,
  delay: `${(index % 7) * -0.8}s`,
  duration: `${9 + (index % 5) * 2}s`,
  size: `${5 + (index % 4) * 2}px`,
  hue: index % 3 === 0 ? '#ffce63' : index % 3 === 1 ? '#ff6580' : '#ff9e46',
}));

export const AppLoader: React.FC<AppLoaderProps> = ({ onFinish, minDurationMs = 1800 }) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const next = Math.min(100, Math.floor(((Date.now() - startedAt) / minDurationMs) * 100));
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          setIsFadingOut(true);
          window.setTimeout(() => onFinish?.(), 550);
        }, 120);
      }
    }, 32);
    return () => window.clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`navratri-splash ${isFadingOut ? 'navratri-splash--leaving' : ''}`}
      role="status"
      aria-label="Entering Sawan Music Navratri celebration"
    >
      <div className="navratri-splash__wash" aria-hidden="true" />
      <div className="navratri-splash__particles" aria-hidden="true">
        {petals.map((petal, index) => (
          <span key={index} style={{ left: petal.left, animationDelay: petal.delay, animationDuration: petal.duration, width: petal.size, height: petal.size, background: petal.hue }} />
        ))}
      </div>

      <div className="navratri-splash__content">
        <div className="navratri-splash__eyebrow"><span /> NAVRATRI • NINE NIGHTS OF MUSIC <span /></div>

        <div className="navratri-splash__rangoli" aria-hidden="true">
          <div className="navratri-splash__ring navratri-splash__ring--outer" />
          <div className="navratri-splash__ring navratri-splash__ring--middle" />
          <div className="navratri-splash__ring navratri-splash__ring--inner" />
          <div className="navratri-splash__petals">
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 30}deg) translateY(-72px)` }} />)}
          </div>
          <div className="navratri-splash__center-glow" />
          <div className="navratri-splash__diya">
            <span className="navratri-splash__flame" />
            <span className="navratri-splash__bowl" />
            <span className="navratri-splash__diya-light" />
          </div>
          <span className="navratri-splash__dot navratri-splash__dot--one" />
          <span className="navratri-splash__dot navratri-splash__dot--two" />
          <span className="navratri-splash__dot navratri-splash__dot--three" />
          <span className="navratri-splash__dot navratri-splash__dot--four" />
        </div>

        <div className="navratri-splash__brand-icon"><Music2 size={17} strokeWidth={2.4} /></div>
        <h1 className="navratri-splash__title">Sawan <span>Music</span></h1>
        <p className="navratri-splash__mantra">ગરબાની રાત, સંગીતની વાત</p>
        <p className="navratri-splash__caption">Feel the rhythm. Celebrate every step.</p>

        <div className="navratri-splash__loading">
          <div className="navratri-splash__track" role="progressbar" aria-label="Loading Sawan Music" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="navratri-splash__loading-copy"><span>SETTING THE BEAT</span><span>{progress}%</span></div>
        </div>
      </div>
      <div className="navratri-splash__footer"><span>✦</span> SHUBH NAVRATRI <span>✦</span></div>
    </div>
  );
};
