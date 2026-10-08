import React, { useEffect, useRef, useState } from 'react';
import { Song, TimedLyric } from '../types/music';
import { Mic2, Copy, Check, Type, Sparkles, ChevronDown } from 'lucide-react';

interface LyricsKaraokeProps {
  song: Song;
  currentTime: number;
  onSeek: (seconds: number) => void;
  accentColor?: string;
  isCompact?: boolean;
}

export const LyricsKaraoke: React.FC<LyricsKaraokeProps> = ({
  song,
  currentTime,
  onSeek,
  accentColor = '#f43f5e',
  isCompact = false,
}) => {
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'devanagari' | 'all'>('bilingual');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Find active line index based on currentTime
  const timed = song.timedLyrics || [];
  let activeIndex = -1;
  for (let i = 0; i < timed.length; i++) {
    if (currentTime >= timed[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth auto-scroll active lyric into view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleCopy = () => {
    navigator.clipboard.writeText(song.lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fontSizeClasses = {
    sm: { dev: 'text-lg', rom: 'text-xs', eng: 'text-xs' },
    md: { dev: 'text-2xl', rom: 'text-sm', eng: 'text-xs' },
    lg: { dev: 'text-3xl', rom: 'text-base', eng: 'text-sm' },
  }[fontSize];

  return (
    <div className="flex flex-col h-full bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative shadow-2xl">
      {/* Top Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
            <Mic2 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Synced Karaoke Lyrics
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                LIVE
              </span>
            </h3>
            <p className="text-xs text-zinc-400 truncate max-w-[200px]">
              {song.title} • {song.artist}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Script view mode toggle */}
          <div className="bg-zinc-800/90 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setDisplayMode('devanagari')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'devanagari' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Devanagari Only"
            >
              हिन्दी
            </button>
            <button
              onClick={() => setDisplayMode('bilingual')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'bilingual' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Devanagari + Hinglish"
            >
              Dual
            </button>
            <button
              onClick={() => setDisplayMode('all')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'all' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Devanagari + Romanized + Meaning"
            >
              Full
            </button>
          </div>

          {/* Font size toggle */}
          <button
            onClick={() => {
              setFontSize((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'));
            }}
            title="Adjust Font Size"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Type size={14} />
          </button>

          {/* Copy full lyrics */}
          <button
            onClick={handleCopy}
            title="Copy Lyrics"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Lyrics Scrollable Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-10 space-y-7 scroll-smooth relative"
      >
        {timed.length > 0 ? (
          timed.map((item, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;

            return (
              <div
                key={index}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(item.time)}
                className={`group cursor-pointer transition-all duration-300 rounded-xl p-3 -mx-3 select-none ${
                  isActive
                    ? 'scale-[1.02] bg-white/[0.04] border-l-4 border-rose-500 pl-4 shadow-lg shadow-rose-950/20'
                    : isPast
                    ? 'opacity-40 hover:opacity-80'
                    : 'opacity-45 hover:opacity-90'
                }`}
              >
                {/* Devanagari Hindi Text */}
                <div
                  className={`font-devanagari font-bold tracking-wide transition-colors leading-relaxed ${fontSizeClasses.dev} ${
                    isActive
                      ? 'text-white text-shadow-sm font-semibold'
                      : 'text-zinc-300 group-hover:text-zinc-100'
                  }`}
                  style={isActive ? { color: '#ffffff', textShadow: '0 0 20px rgba(244,63,94,0.4)' } : {}}
                >
                  {item.devanagari}
                </div>

                {/* Romanized Transliteration */}
                {(displayMode === 'bilingual' || displayMode === 'all') && item.romanized && (
                  <div
                    className={`mt-1 font-medium transition-colors ${fontSizeClasses.rom} ${
                      isActive ? 'text-rose-400 font-semibold' : 'text-zinc-400 group-hover:text-zinc-300'
                    }`}
                  >
                    {item.romanized}
                  </div>
                )}

                {/* English Meaning Translation */}
                {displayMode === 'all' && item.english && (
                  <div
                    className={`mt-1 italic transition-colors ${fontSizeClasses.eng} ${
                      isActive ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    &ldquo;{item.english}&rdquo;
                  </div>
                )}

                {/* Click to jump timestamp tooltip */}
                <span className="text-[10px] text-zinc-600 group-hover:text-rose-400/80 transition-opacity opacity-0 group-hover:opacity-100 mt-1 block">
                  Jump to {Math.floor(item.time / 60)}:{String(Math.floor(item.time % 60)).padStart(2, '0')}
                </span>
              </div>
            );
          })
        ) : (
          /* Fallback plain text lyrics */
          <div className="whitespace-pre-line font-devanagari text-lg leading-loose text-zinc-300">
            {song.lyrics}
          </div>
        )}
      </div>

      {/* Song theme footer note */}
      {song.themeNotes && !isCompact && (
        <div className="px-5 py-2.5 bg-zinc-900/50 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-center gap-2">
          <Sparkles size={13} className="text-amber-400 shrink-0" />
          <span className="truncate">{song.themeNotes}</span>
        </div>
      )}
    </div>
  );
};
