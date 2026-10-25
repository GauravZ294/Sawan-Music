import React, { useEffect, useState } from 'react';
import { Music2, Disc, Headphones, Sparkles, Volume2, Mic2, Zap } from 'lucide-react';

interface AppLoaderProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const floatingNotes = [
  { note: '🎵', left: '12%', delay: '0s', duration: '7s', size: '22px' },
  { note: '🎶', left: '25%', delay: '1.5s', duration: '9s', size: '26px' },
  { note: '🎼', left: '42%', delay: '0.8s', duration: '8s', size: '24px' },
  { note: '♩',  left: '60%', delay: '2.2s', duration: '10s', size: '20px' },
  { note: '🎵', left: '78%', delay: '1.1s', duration: '7.5s', size: '28px' },
  { note: '🎶', left: '88%', delay: '2.8s', duration: '8.5s', size: '22px' },
];

const rhythmLyrics = [
  "♪ ♫  हर दिल की धड़कन में सगीत का जादू...  ♫ ♪",
  "♪ ♫  Feel the rhythm, live every melody  ♫ ♪",
  "♪ ♫  सुरों की मिठास, हर पल ख़ास...  ♫ ♪",
  "♪ ♫  Pure Sound, Unlimited Vibes  ♫ ♪",
];

export const AppLoader: React.FC<AppLoaderProps> = ({ onFinish, minDurationMs = 2000 }) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

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
        }, 150);
      }
    }, 30);
    return () => window.clearInterval(interval);
  }, [minDurationMs, onFinish]);

  useEffect(() => {
    const lyricInterval = window.setInterval(() => {
      setCurrentLyricIndex((prev) => (prev + 1) % rhythmLyrics.length);
    }, 1200);
    return () => window.clearInterval(lyricInterval);
  }, []);

  return (
    <div
      className={`music-splash ${isFadingOut ? 'music-splash--leaving' : ''}`}
      role="status"
      aria-label="Entering Sawan Music"
    >
      {/* Light & Dark Blue Ambient Wash */}
      <div className="music-splash__wash" aria-hidden="true" />
      <div className="music-splash__grid-bg" aria-hidden="true" />

      {/* Floating Vector Music Notes */}
      <div className="music-splash__particles" aria-hidden="true">
        {floatingNotes.map((item, idx) => (
          <span
            key={idx}
            className="music-splash__note"
            style={{
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
              fontSize: item.size,
            }}
          >
            {item.note}
          </span>
        ))}
      </div>

      <div className="music-splash__content">
        {/* Top Eyebrow */}
        <div className="music-splash__eyebrow">
          <span className="line" />
          <Headphones size={13} className="text-cyan-400 animate-pulse" />
          <span>SAWAN MUSIC • PURE AUDIO EXPERIENCE</span>
          <span className="line" />
        </div>

        {/* Central Vector Vinyl & Equalizer Animation */}
        <div className="music-splash__vector-container" aria-hidden="true">
          {/* Outer Pulsing Glow */}
          <div className="music-splash__glow-ring" />

          {/* Equalizer Spectrum Ring (Vector Bars around Vinyl) */}
          <svg className="music-splash__spectrum-vector" viewBox="0 0 240 240" focusable="false">
            <defs>
              <linearGradient id="spectrum-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Rotating Outer Vector Grooves */}
            <circle cx="120" cy="120" r="114" className="vector-circle vector-circle--outer" />
            <circle cx="120" cy="120" r="102" className="vector-circle vector-circle--dash" />

            {/* Bouncing Audio Spectrum Vector Pins */}
            <g className="vector-bars">
              {Array.from({ length: 24 }, (_, i) => {
                const angle = i * 15;
                const height = 8 + ((i % 5) * 4);
                return (
                  <rect
                    key={i}
                    x="118"
                    y={12 - (i % 3 * 2)}
                    width="4"
                    height={height}
                    rx="2"
                    fill="url(#spectrum-grad)"
                    transform={`rotate(${angle} 120 120)`}
                    className={`vector-bar vector-bar--${(i % 4) + 1}`}
                  />
                );
              })}
            </g>

            {/* Inner Ring Lines */}
            <circle cx="120" cy="120" r="76" className="vector-circle vector-circle--mid" />
            <circle cx="120" cy="120" r="54" className="vector-circle vector-circle--inner" />
          </svg>

          {/* Central Spinning Vinyl Record */}
          <div className="music-splash__vinyl-disc">
            <Disc size={56} className="text-cyan-300 animate-spin-slow" />
            <div className="music-splash__vinyl-center">
              <Music2 size={20} className="text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="music-splash__title">
          Sawan <span className="text-cyan-400">Music</span>
        </h1>

        {/* Animated Music Rhythm Lyrics Ticker */}
        <div className="music-splash__lyrics-ticker" aria-live="polite">
          <p key={currentLyricIndex} className="music-splash__lyric-line animate-fade-in-up">
            {rhythmLyrics[currentLyricIndex]}
          </p>
        </div>

        {/* Equalizer Bouncing Bars */}
        <div className="music-splash__equalizer-bars" aria-hidden="true">
          <span className="eq-bar eq-bar-1" />
          <span className="eq-bar eq-bar-2" />
          <span className="eq-bar eq-bar-3" />
          <span className="eq-bar eq-bar-4" />
          <span className="eq-bar eq-bar-5" />
        </div>

        {/* Progress Bar */}
        <div className="music-splash__loading">
          <div
            className="music-splash__track"
            role="progressbar"
            aria-label="Loading Sawan Music"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="music-splash__loading-copy">
            <span>SYNCHRONIZING AUDIO</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="music-splash__footer">
        <Sparkles size={12} className="text-cyan-400" />
        <span>HIGH-FIDELITY MUSIC STREAMING</span>
        <Sparkles size={12} className="text-cyan-400" />
      </div>
    </div>
  );
};
