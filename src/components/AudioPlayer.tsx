import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  tagline: string;
  coverArtUrl: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl, title, tagline, coverArtUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x
  const [buffered, setBuffered] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onProgress = () => {
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('progress', onProgress);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('progress', onProgress);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }, []);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  }, [speedIndex]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="bg-base rounded-xl border border-border p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Row 1: Thumbnail + Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          {!imgError ? (
            <img
              src={coverArtUrl}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-base to-surface flex items-center justify-center">
              <span className="text-gold text-lg">{'\uD83C\uDF99\uFE0F'}</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
          <p className="text-xs text-gold italic truncate">{tagline}</p>
        </div>
      </div>

      {/* Row 2: Progress bar */}
      <div className="mb-3">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="relative h-2 bg-border rounded-full cursor-pointer group"
        >
          {/* Buffered */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gray-600"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Progress */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gold transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-text-muted">{formatTime(currentTime)}</span>
          <span className="text-[10px] text-text-muted">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Row 3: Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip back */}
          <button
            onClick={() => skip(-10)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            title="Back 10s"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-gold text-black hover:bg-gold-hover transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            title="Forward 10s"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed */}
          <button
            onClick={cycleSpeed}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary bg-surface hover:bg-border transition-colors"
          >
            {SPEEDS[speedIndex]}x
          </button>

          {/* Download */}
          <a
            href={audioUrl}
            download
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            title="Download"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
