import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Link, FolderOpen, X, SkipBack, SkipForward, Maximize, Minimize, Tv } from "lucide-react";
import type { SyncState } from "@/hooks/useSyncRoom";

interface VideoPlayerProps {
  onTimeUpdate?: (time: number) => void;
  /** Called immediately when the host presses play */
  onPlay?: (time: number) => void;
  /** Called immediately when the host presses pause */
  onPause?: (time: number) => void;
  /** Called immediately when the host seeks */
  onSeek?: (time: number) => void;
  /** Called when the host sets or clears a direct URL source */
  onSourceChange?: (src: string | null) => void;
  syncState?: SyncState | null;
  isHost?: boolean;
}

const VideoPlayer = ({
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  onSourceChange,
  syncState,
  isHost,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [driftMs, setDriftMs] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loaderTab, setLoaderTab] = useState<"direct" | "streaming">("direct");
  const hideTimeout = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Suppress sync echo: ignore next sync event right after host seeks
  const suppressNextSync = useRef(false);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Apply sync from host (viewers only) ────────────────────────────────────
  useEffect(() => {
    if (!syncState || !videoRef.current || isHost) return;
    const video = videoRef.current;

    if (suppressNextSync.current) {
      suppressNextSync.current = false;
      return;
    }

    if (syncState.type === "source") {
      const nextSrc = syncState.sourceUrl || "";
      setVideoSrc(nextSrc);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.pause();
        videoRef.current.load();
      }
      return;
    }

    // Play / Pause commands: apply immediately without drift check
    if (syncState.type === "play") {
      video.currentTime = syncState.currentTime;
      video.play().catch(() => { });
      setIsPlaying(true);
      return;
    }
    if (syncState.type === "pause") {
      video.currentTime = syncState.currentTime;
      video.pause();
      setIsPlaying(false);
      return;
    }
    if (syncState.type === "seek") {
      video.currentTime = syncState.currentTime;
      return;
    }

    // Periodic tick: drift correction only
    const drift = Math.abs(video.currentTime - syncState.currentTime);
    setDriftMs(Math.round(drift * 1000));

    if (drift > 2) {
      video.currentTime = syncState.currentTime;
    } else if (drift > 0.15) {
      video.playbackRate = video.currentTime < syncState.currentTime ? 1.08 : 0.93;
      setTimeout(() => { if (videoRef.current) videoRef.current.playbackRate = 1; }, 800);
    }

    if (syncState.isPlaying && video.paused) {
      video.play().catch(() => { });
      setIsPlaying(true);
    } else if (!syncState.isPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [syncState, isHost]);

  // ── Host controls ───────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
      // onPause called via native event below
    } else {
      video.play().catch(() => { });
      // onPlay called via native event below
    }
  }, [isPlaying]);

  const handleNativePlay = useCallback(() => {
    setIsPlaying(true);
    if (isHost && videoRef.current) {
      onPlay?.(videoRef.current.currentTime);
    }
  }, [isHost, onPlay]);

  const handleNativePause = useCallback(() => {
    setIsPlaying(false);
    if (isHost && videoRef.current) {
      onPause?.(videoRef.current.currentTime);
    }
  }, [isHost, onPause]);

  const handleNativeSeeked = useCallback(() => {
    if (isHost && videoRef.current) {
      suppressNextSync.current = true;
      onSeek?.(videoRef.current.currentTime);
    }
  }, [isHost, onSeek]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
    // seeked event will fire handleNativeSeeked
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

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Skip ────────────────────────────────────────────────────────────────────
  const skip = useCallback((delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    // seeked event will fire handleNativeSeeked
  }, [duration]);

  useEffect(() => {
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, []);

  // ── Video source handlers ───────────────────────────────────────────────────
  const applyUrl = () => {
    if (!urlInput.trim()) return;
    const nextUrl = urlInput.trim();
    setVideoSrc(nextUrl);
    onSourceChange?.(nextUrl);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous blob URL if any
    if (videoSrc.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };

  const clearSource = () => {
    if (videoSrc.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
    setVideoSrc("");
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    onSourceChange?.(null);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video rounded-xl overflow-hidden shadow-theater cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* ── Video Element ───────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        className="w-full h-full object-cover bg-background"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={handleNativePlay}
        onPause={handleNativePause}
        onSeeked={handleNativeSeeked}
        onClick={videoSrc ? togglePlay : undefined}
      />

      {/* ── Source Loader Overlay ──────────────────────────────────────── */}
      {!videoSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background px-6">
          {/* Icon + title */}
          <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
            <Play className="w-7 h-7 text-muted-foreground/40 ml-1" />
          </div>
          <p className="text-foreground text-sm font-semibold mb-1">Start your watch party</p>
          <p className="text-muted-foreground text-xs mb-5">Load a video or open a streaming service</p>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/60 rounded-lg mb-5">
            <button
              onClick={() => setLoaderTab("direct")}
              className={`flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium transition-all ${loaderTab === "direct"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Link className="w-3 h-3" />
              Direct Video
            </button>
            <button
              onClick={() => setLoaderTab("streaming")}
              className={`flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium transition-all ${loaderTab === "streaming"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Tv className="w-3 h-3" />
              Streaming Services
            </button>
          </div>

          {/* Tab: Direct Video */}
          {loaderTab === "direct" && (
            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              {showUrlInput ? (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyUrl()}
                    placeholder="https://example.com/movie.mp4"
                    className="flex-1 h-9 text-xs bg-secondary/60 border border-foreground/10 rounded-lg px-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                  />
                  <button onClick={applyUrl} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">Load</button>
                  <button onClick={() => setShowUrlInput(false)} className="h-9 px-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Link className="w-3.5 h-3.5" /> Paste URL
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-secondary border border-foreground/10 text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Open File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Streaming Services */}
          {loaderTab === "streaming" && (
            <div className="flex flex-col items-center gap-4 w-full max-w-sm">
              <div className="grid grid-cols-2 gap-3 w-full">
                {/* Netflix */}
                <button
                  onClick={() => window.open("https://www.netflix.com", "_blank")}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-[#141414] hover:border-[#e50914]/60 hover:bg-[#1a0000] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#e50914] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">N</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white">Netflix</p>
                    <p className="text-[10px] text-white/40">Open &amp; sync together</p>
                  </div>
                </button>

                {/* Disney+ */}
                <button
                  onClick={() => window.open("https://www.disneyplus.com", "_blank")}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-[#040D2F] hover:border-[#0063e5]/60 hover:bg-[#071445] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0063e5] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">D+</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white">Disney+</p>
                    <p className="text-[10px] text-white/40">Open &amp; sync together</p>
                  </div>
                </button>

                {/* Prime Video */}
                <button
                  onClick={() => window.open("https://www.primevideo.com", "_blank")}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-[#0F1111] hover:border-[#00a8e0]/60 hover:bg-[#001820] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#00a8e0] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs">▶</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white">Prime Video</p>
                    <p className="text-[10px] text-white/40">Open &amp; sync together</p>
                  </div>
                </button>

                {/* YouTube */}
                <button
                  onClick={() => window.open("https://www.youtube.com", "_blank")}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-[#0f0f0f] hover:border-[#ff0000]/60 hover:bg-[#1a0000] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ff0000] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs">▶</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white">YouTube</p>
                    <p className="text-[10px] text-white/40">Open &amp; sync together</p>
                  </div>
                </button>
              </div>

              {/* How it works note */}
              <div className="w-full px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
                <p className="text-[10px] text-primary/80 font-medium mb-1">How streaming party works</p>
                <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Click a service above — it opens in a new tab</li>
                  <li>Everyone navigates to the same title</li>
                  <li>Mark yourself <span className="text-success font-medium">Ready</span> when you're at the start</li>
                  <li>When all peers are ready, press play together via chat countdown</li>
                </ol>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* ── Drift Meter (viewers only) ─────────────────────────────────── */}
      {videoSrc && !isHost && (
        <div className="absolute top-4 right-4 px-2 py-1 rounded-md bg-background/60 backdrop-blur-sm">
          <span className={`font-mono-data text-[10px] ${driftMs < 30 ? "text-success" : driftMs < 200 ? "text-warning" : "text-muted-foreground"}`}>
            {driftMs}ms drift
          </span>
        </div>
      )}

      {/* ── Local file note (host only) ────────────────────────────────── */}
      {isHost && videoSrc.startsWith("blob:") && (
        <div className="absolute top-4 left-4 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm border border-foreground/10">
          <span className="text-[10px] text-muted-foreground">Local files do not sync. Use Paste URL.</span>
        </div>
      )}

      {/* ── Clear source button ──────────────────────────────────────── */}
      {videoSrc && isHost && (
        <button
          onClick={clearSource}
          className="absolute top-4 right-4 p-1.5 rounded-md bg-background/60 backdrop-blur-sm hover:bg-background/90 transition-colors opacity-0 group-hover:opacity-100"
          title="Change video"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* ── Floating Controls ─────────────────────────────────────────── */}
      {videoSrc && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/70 to-transparent flex flex-col gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress bar — full width */}
              <div
                className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer group/bar"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all duration-100 group-hover/bar:bg-primary/80"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                {/* Left: transport controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => skip(-10)}
                    className="text-white/80 hover:text-white transition-colors"
                    title="Back 10s"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    {isPlaying
                      ? <Pause className="w-5 h-5 fill-white text-white" />
                      : <Play className="w-5 h-5 fill-white text-white ml-0.5" />}
                  </button>

                  <button
                    onClick={() => skip(10)}
                    className="text-white/80 hover:text-white transition-colors"
                    title="Forward 10s"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  <span className="font-mono-data text-[11px] text-white/70 whitespace-nowrap select-none">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                  </span>
                </div>

                {/* Right: volume + fullscreen */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="text-white/80 hover:text-white transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="text-white/80 hover:text-white transition-colors"
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default VideoPlayer;
