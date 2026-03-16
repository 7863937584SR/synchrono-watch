import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import VideoPlayer from "@/components/VideoPlayer";
import PeerList from "@/components/PeerList";
import ChatPanel from "@/components/ChatPanel";
import ReadyToggle from "@/components/ReadyToggle";
import { useSyncRoom } from "@/hooks/useSyncRoom";
import { findRoom } from "@/lib/room";
import type { Peer } from "@/components/PeerList";
import { motion } from "framer-motion";

const Room = () => {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { userName, isHost } = (location.state as { userName: string; isHost: boolean }) || {};
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userName || !code) {
      navigate("/");
      return;
    }
    findRoom(code).then((room) => setRoomId(room.id)).catch(() => navigate("/"));
  }, [code, userName, navigate]);

  const { peers, syncState, broadcastSync, updatePresence } = useSyncRoom({
    roomCode: code || "",
    userName: userName || "",
    isHost: isHost || false,
  });

  const handleReadyToggle = () => {
    const next = !isReady;
    setIsReady(next);
    updatePresence({ isReady: next });
  };

  const peerList: Peer[] = useMemo(() => {
    return Object.entries(peers).map(([key, p]) => {
      const drift = Math.abs(Date.now() - p.lastSeen);
      const isDisconnected = drift > 10000;
      return {
        name: p.name || key,
        drift: isDisconnected ? 0 : Math.min(drift, 999),
        status: isDisconnected ? "disconnected" as const : p.isReady ? "synced" as const : "buffering" as const,
        isReady: p.isReady,
        isHost: key === (Object.keys(peers)[0] || ""),
      };
    });
  }, [peers]);

  const connectedCount = peerList.filter((p) => p.status !== "disconnected").length;
  const readyCount = peerList.filter((p) => p.isReady).length;
  const allReady = peerList.length > 0 && readyCount === peerList.length;

  const handleTimeUpdate = (time: number) => {
    updatePresence({ currentTime: time });
    if (isHost) {
      broadcastSync({ currentTime: time, isPlaying: true, timestamp: Date.now() });
    }
  };

  if (!userName || !code) return null;

  return (
    <div className="min-h-svh bg-background text-foreground grid grid-cols-1 lg:grid-cols-12 gap-0">
      <main className="lg:col-span-9 p-4 lg:p-6 flex flex-col justify-center relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">SyncStream</h1>
            <p className="text-xs text-muted-foreground font-mono-data mt-0.5">
              Room <span className="text-primary">{code}</span> · {connectedCount} peers connected
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allReady && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-success glow-sync" />
                <span className="text-[11px] font-medium text-success">All synced</span>
              </motion.div>
            )}
            <div className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
              {readyCount}/{peerList.length} ready
            </div>
          </div>
        </div>

        <VideoPlayer
          onTimeUpdate={handleTimeUpdate}
          syncState={!isHost ? syncState : null}
        />

        <div className="mt-4 lg:hidden">
          <ReadyToggle isReady={isReady} onToggle={handleReadyToggle} />
        </div>
      </main>

      <aside className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-foreground/5 bg-card/30 p-4 flex flex-col min-h-0 lg:min-h-svh">
        <PeerList peers={peerList} />
        <div className="hidden lg:block mb-6">
          <ReadyToggle isReady={isReady} onToggle={handleReadyToggle} />
        </div>
        <ChatPanel roomId={roomId} userName={userName} />
      </aside>
    </div>
  );
};

export default Room;
