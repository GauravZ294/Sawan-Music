import React, { useState, useEffect } from 'react';
import { Sparkles, Zap } from 'lucide-react';

interface AppLoaderProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  onFinish,
  minDurationMs = 1600,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      setProgress(rawProgress);

      if (rawProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 450);
        }, 150);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d0f] transition-all duration-500 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
    >
      {/* Background radial atmosphere & neon glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#1db954]/20 via-[#10b981]/15 to-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#1db954]/10 rounded-full blur-2xl" />
      </div>

      {/* Main Loader Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {/* Animated Brand Logo Icon with Pulsing Halo */}
        <div className="relative mb-6">
          {/* Outer Pulsing Rotating Glow Ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#1db954]/30 via-emerald-400/20 to-teal-500/30 blur-lg animate-spin" style={{ animationDuration: '6s' }} />

          {/* Logo container */}
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#181818] via-[#121212] to-black border border-emerald-500/40 shadow-2xl shadow-[#1db954]/30 flex items-center justify-center overflow-hidden">
            {/* Animated Soundwave EQ Bars */}
            <div className="flex items-end justify-center gap-1.5 h-12 w-14">
              {[60, 95, 45, 100, 75, 40].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-[#1db954] to-[#22c55e] rounded-full animate-pulse shadow-sm"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: '800ms',
                  }}
                />
              ))}
            </div>

            {/* Glowing Corner Accents */}
            <div className="absolute top-1.5 right-1.5 text-emerald-400 animate-ping">
              <Zap size={10} />
            </div>
            <div className="absolute bottom-1.5 left-1.5 text-teal-400">
              <Sparkles size={10} />
            </div>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="mb-8 text-3xl font-black tracking-wider text-white font-['Plus_Jakarta_Sans',sans-serif]">
          Sawan <span className="text-[#1db954]">- music</span>
        </h1>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label="Loading Sawan music"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="w-64 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden border border-zinc-700/50"
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-[#1db954] to-teal-400 rounded-full transition-all duration-100 ease-out shadow-sm shadow-[#1db954]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="mt-3 text-xs font-mono font-bold text-emerald-400">
          {progress}%
        </span>

      </div>
    </div>
  );
};
