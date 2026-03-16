import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { SyncState } from "@/hooks/useSyncRoom";

interface VideoPlayerProps {
  onTimeUpdate?: (time: number) => void;
  syncState?: SyncState | null;
}

const VideoPlayer = ({ onTimeUpdate, syncState }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [driftMs, setDriftMs] = useState(0);
  const hideTimeout = useRef<NodeJS.Timeout>();

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Apply sync from host
  useEffect(() => {
    if (!syncState || !videoRef.current) return;
    const video = videoRef.current;
    const drift = Math.abs(video.currentTime - syncState.currentTime);
    setDriftMs(Math.round(drift * 1000));

    if (drift > 2) {
      // Big drift: jump
      video.currentTime = syncState.currentTime;
    } else if (drift > 0.1) {
      // Small drift: adjust playback rate
      video.playbackRate = video.currentTime < syncState.currentTime ? 1.05 : 0.95;
      setTimeout(() => { if (videoRef.current) videoRef.current.playbackRate = 1; }, 1000);
    }

    if (syncState.isPlaying && video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else if (!syncState.isPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [syncState]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    onTimeUpdate?.(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative aspect-video rounded-xl overflow-hidden shadow-theater cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-background"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onClick={togglePlay}
      />

      {!duration && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
          <div className="w-20 h-20 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-muted-foreground/50 ml-1" />
          </div>
          <p className="text-muted-foreground text-sm">Waiting for media...</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Share a video URL or file to start</p>
        </div>
      )}

      {/* Drift Meter */}
      <div className="absolute top-4 right-4 px-2 py-1 rounded-md bg-background/60 backdrop-blur-sm">
        <span className={`font-mono-data text-[10px] ${driftMs < 30 ? "text-success" : driftMs < 200 ? "text-warning" : "text-muted-foreground"}`}>
          {driftMs}ms drift
        </span>
      </div>

      {/* Floating Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 h-14 px-6 bg-card/90 backdrop-blur-md rounded-full flex items-center gap-4 border border-foreground/10"
          >
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-primary transition-colors duration-150">
              {isPlaying ? <Pause className="w-5 h-5 fill-foreground text-foreground" /> : <Play className="w-5 h-5 fill-foreground text-foreground ml-0.5" />}
            </button>
            <div className="h-1 w-48 md:w-64 bg-foreground/20 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSeek(e); }}>
              <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono-data text-xs text-muted-foreground whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>
            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-primary transition-colors duration-150">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;
