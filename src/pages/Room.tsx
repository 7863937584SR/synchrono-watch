import { useState } from "react";
import { motion } from "framer-motion";
import VideoPlayer from "@/components/VideoPlayer";
import PeerList from "@/components/PeerList";
import ChatPanel from "@/components/ChatPanel";
import ReadyToggle from "@/components/ReadyToggle";
import type { Peer } from "@/components/PeerList";

const mockPeers: Peer[] = [
  { name: "You", drift: 0, status: "synced", isReady: true, isHost: true },
  { name: "Alex", drift: 12, status: "synced", isReady: true, isHost: false },
  { name: "Sam", drift: 8, status: "synced", isReady: true, isHost: false },
  { name: "Jordan", drift: 34, status: "buffering", isReady: false, isHost: false },
];

const Room = () => {
  const [isReady, setIsReady] = useState(false);
  const [peers] = useState<Peer[]>(mockPeers);

  const readyCount = peers.filter((p) => p.isReady).length;
  const allReady = readyCount === peers.length;

  return (
    <div className="min-h-svh bg-background text-foreground grid grid-cols-1 lg:grid-cols-12 gap-0">
      {/* Main Theater */}
      <main className="lg:col-span-9 p-4 lg:p-6 flex flex-col justify-center relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Movie Night</h1>
            <p className="text-xs text-muted-foreground font-mono-data mt-0.5">
              Room <span className="text-primary">A7X-92K</span> · {peers.filter(p => p.status !== "disconnected").length} peers connected
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
              {readyCount}/{peers.length} ready
            </div>
          </div>
        </div>

        <VideoPlayer />

        {/* Ready Toggle below video on mobile */}
        <div className="mt-4 lg:hidden">
          <ReadyToggle isReady={isReady} onToggle={() => setIsReady(!isReady)} />
        </div>
      </main>

      {/* Sidebar */}
      <aside className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-foreground/5 bg-card/30 p-4 flex flex-col min-h-0 lg:min-h-svh">
        <PeerList peers={peers} />

        {/* Ready Toggle */}
        <div className="hidden lg:block mb-6">
          <ReadyToggle isReady={isReady} onToggle={() => setIsReady(!isReady)} />
        </div>

        <ChatPanel />
      </aside>
    </div>
  );
};

export default Room;
