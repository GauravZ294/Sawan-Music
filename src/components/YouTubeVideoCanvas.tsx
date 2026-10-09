import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types/music';
import { X, ExternalLink, Youtube } from 'lucide-react';

interface YouTubePlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube player API did not initialize.'));
      };
      let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => reject(new Error('Could not load YouTube player API.'));
        document.head.appendChild(script);
      }
    });
  }
  return youtubeApiPromise;
}

interface YouTubeVideoCanvasProps {
  song: Song | null;
  isPlaying: boolean;
  isOpen: boolean;
  currentTime: number;
  seekVersion: number;
  volume: number;
  onTimeUpdate: (time: number, duration: number) => void;
  onPlaybackChange: (playing: boolean) => void;
  onEnded: () => void;
  isActive: boolean;
  onClose: () => void;
}

export const YouTubeVideoCanvas: React.FC<YouTubeVideoCanvasProps> = ({
  song,
  isPlaying,
  isOpen,
  currentTime,
  seekVersion,
  volume,
  onTimeUpdate,
  onPlaybackChange,
  onEnded,
  isActive,
  onClose,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const tickerRef = useRef<number | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const propsRef = useRef({ isPlaying, currentTime, seekVersion, volume, onTimeUpdate, onPlaybackChange, onEnded });
  propsRef.current = { isPlaying, currentTime, seekVersion, volume, onTimeUpdate, onPlaybackChange, onEnded };

  useEffect(() => {
    if (!song?.youtubeId || !hostRef.current) return;
    let cancelled = false;
    readyRef.current = false;
    setPlayerError(null);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      hostRef.current.replaceChildren();
      playerRef.current = new YT.Player(hostRef.current, {
        width: '100%',
        height: '100%',
        videoId: song.youtubeId,
        playerVars: {
          autoplay: propsRef.current.isPlaying ? 1 : 0,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            readyRef.current = true;
            event.target.setVolume(Math.round(propsRef.current.volume * 100));
            if (propsRef.current.currentTime > 0) event.target.seekTo(propsRef.current.currentTime, true);
            if (propsRef.current.isPlaying) event.target.playVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              propsRef.current.onPlaybackChange(true);
              if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
              tickerRef.current = window.setInterval(() => {
                const player = playerRef.current;
                if (player) propsRef.current.onTimeUpdate(player.getCurrentTime(), player.getDuration());
              }, 500);
            } else {
              if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                propsRef.current.onPlaybackChange(false);
              }
              if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
              tickerRef.current = null;
              if (event.data === YT.PlayerState.ENDED) propsRef.current.onEnded();
            }
          },
          onError: (event: { data: number }) => {
            console.error('YouTube video playback error:', event.data, song.youtubeId);
            setPlayerError('This YouTube video is unavailable for playback.');
            propsRef.current.onPlaybackChange(false);
          },
          onAutoplayBlocked: () => {
            setPlayerError('Press play in the video to start its original audio.');
            propsRef.current.onPlaybackChange(false);
          },
        },
      });
    }).catch((error) => {
      console.error('YouTube player failed to initialize:', error);
      setPlayerError('Could not load the YouTube player. Check your connection and try again.');
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
      tickerRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [song?.youtubeId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!readyRef.current || !player) return;
    if (isPlaying) player.playVideo();
    else player.pauseVideo();
  }, [isPlaying, song?.youtubeId]);

  useEffect(() => {
    if (readyRef.current) playerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  useEffect(() => {
    if (readyRef.current && seekVersion > 0) playerRef.current?.seekTo(currentTime, true);
  }, [seekVersion]);

  if (!isActive || !song?.youtubeId || song.audioSrc) return null;

  return (
    <div className={`fixed bottom-24 right-6 z-40 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${isOpen ? 'w-96 max-w-[calc(100vw-2rem)]' : 'w-[200px]'}`}>
      {isOpen && (
        <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white shrink-0"><Youtube size={12} /></div>
            <span className="text-xs font-bold text-zinc-200 truncate">{song.title}</span>
            {song.category && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{song.category}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={song.youtubeUrl || `https://www.youtube.com/watch?v=${song.youtubeId}`} target="_blank" rel="noopener noreferrer" title="Open in YouTube" className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ExternalLink size={13} /></a>
            <button onClick={onClose} title="Minimize YouTube player" className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><X size={14} /></button>
          </div>
        </div>
      )}
      <div className={`w-full bg-black relative ${isOpen ? 'h-[216px]' : 'h-[200px]'}`}>
        <div ref={hostRef} className="w-full h-full" />
        {playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-4 text-center text-xs text-amber-200">
            <span>{playerError}</span>
            <a href={song.youtubeUrl || `https://www.youtube.com/watch?v=${song.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-white underline">Open on YouTube</a>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="p-3 bg-zinc-950/90 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-900">
          <div className="truncate mr-2"><span className="text-white font-medium">{song.artist}</span>{song.channelTitle && <span className="text-zinc-500 ml-1.5">via {song.channelTitle}</span>}</div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">Original audio</span>
        </div>
      )}
    </div>
  );
};
