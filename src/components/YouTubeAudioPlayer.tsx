import React, { useEffect, useRef } from 'react';
import { Song } from '../types/music';

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
    youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('YouTube player timed out.')), 15000);
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previousCallback?.();
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube player API did not initialize.'));
      };
      let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('Could not load YouTube player API.'));
        };
        document.head.appendChild(script);
      }
    }).catch((error) => {
      youtubeApiPromise = null;
      document.querySelector('script[src="https://www.youtube.com/iframe_api"]')?.remove();
      throw error;
    });
  }
  return youtubeApiPromise;
}

interface YouTubeAudioPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  playRequest?: number;
  currentTime: number;
  seekVersion: number;
  volume: number;
  onTimeUpdate: (time: number, duration: number) => void;
  onPlaybackChange: (playing: boolean) => void;
  onEnded: () => void;
  isActive: boolean;
  onError?: (message: string | null) => void;
}

export const YouTubeAudioPlayer: React.FC<YouTubeAudioPlayerProps> = ({
  song,
  isPlaying,
  playRequest = 0,
  currentTime,
  seekVersion,
  volume,
  onTimeUpdate,
  onPlaybackChange,
  onEnded,
  isActive,
  onError,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const tickerRef = useRef<number | null>(null);
  const canPlay = isActive && Boolean(song?.youtubeId) && !song?.audioSrc;
  const propsRef = useRef({ isPlaying, currentTime, seekVersion, volume, onTimeUpdate, onPlaybackChange, onEnded, onError });
  propsRef.current = { isPlaying, currentTime, seekVersion, volume, onTimeUpdate, onPlaybackChange, onEnded, onError };

  useEffect(() => {
    if (!canPlay || !song?.youtubeId || !hostRef.current) return;
    let cancelled = false;
    readyRef.current = false;
    propsRef.current.onError?.(null);

    // Keep playback independent of visible page sections. The app's music bar
    // controls this iframe; no video panel, popup, or iframe focus is exposed.
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      autoplay: '0',
      controls: '0', enablejsapi: '1', playsinline: '1', rel: '0', fs: '0', disablekb: '1',
      origin: window.location.origin,
    });
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(song.youtubeId)}?${params}`;
    iframe.title = `${song.title} — audio playback`;
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.allow = 'autoplay; encrypted-media';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    hostRef.current.replaceChildren(iframe);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      // Attach controls to the existing iframe instead of waiting to create it.
      playerRef.current = new YT.Player(iframe, {
        width: '100%',
        height: '100%',
        videoId: song.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            if (cancelled) return;
            readyRef.current = true;
            event.target.setVolume(Math.round(propsRef.current.volume * 100));
            if (propsRef.current.currentTime > 0) event.target.seekTo(propsRef.current.currentTime, true);
            if (propsRef.current.isPlaying) event.target.playVideo();
            else event.target.pauseVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (cancelled) return;
            if (event.data === YT.PlayerState.PLAYING) {
              // A late Playing event must not undo a pause from the music bar.
              if (!propsRef.current.isPlaying) {
                playerRef.current?.pauseVideo();
                if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
                tickerRef.current = null;
                return;
              }
              propsRef.current.onError?.(null);
              propsRef.current.onPlaybackChange(true);
              if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
              tickerRef.current = window.setInterval(() => {
                const player = playerRef.current;
                if (player) propsRef.current.onTimeUpdate(player.getCurrentTime(), player.getDuration());
              }, 500);
            } else {
              if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                if (event.data === YT.PlayerState.PAUSED && document.hidden && propsRef.current.isPlaying) {
                  propsRef.current.onError?.('YouTube paused this song in the background. Press Play to continue, or use an imported audio file for background listening.');
                }
                propsRef.current.onPlaybackChange(false);
              }
              if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
              tickerRef.current = null;
              if (event.data === YT.PlayerState.ENDED) propsRef.current.onEnded();
            }
          },
          onError: (event: { data: number }) => {
            if (cancelled) return;
            console.error('YouTube video playback error:', event.data, song.youtubeId);
            const message = event.data === 101 || event.data === 150
              ? 'The owner does not allow this song to play here. Open it on YouTube.'
              : event.data === 153
                ? 'YouTube could not verify this site. Open the app through its http://localhost address.'
                : event.data === 100
                  ? 'This video has been removed or made private. Choose another song.'
                  : 'YouTube could not play this song. Try again or open it on YouTube.';
            propsRef.current.onError?.(message);
            propsRef.current.onPlaybackChange(false);
          },
          onAutoplayBlocked: () => {
            if (cancelled) return;
            propsRef.current.onError?.('Playback was blocked. Press Play in the music bar to try again.');
            propsRef.current.onPlaybackChange(false);
          },
        },
      });
    }).catch((error) => {
      if (cancelled) return;
      console.error('YouTube player failed to initialize:', error);
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      iframe.remove();
      propsRef.current.onError?.('Could not start this song. Check your connection and press Play to try again.');
      propsRef.current.onPlaybackChange(false);
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
      tickerRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
      iframe.remove();
    };
  }, [song?.youtubeId, canPlay, playRequest]);

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
    <div
      ref={hostRef}
      aria-hidden="true"
      inert
      style={{ position: 'fixed', left: '-10000px', top: 0, width: 320, height: 200, opacity: 0, pointerEvents: 'none' }}
    />
  );
};
