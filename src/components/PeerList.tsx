import { motion } from "framer-motion";

interface Peer {
  name: string;
  drift: number;
  status: "synced" | "buffering" | "disconnected";
  isReady: boolean;
  isHost: boolean;
}

interface PeerListProps {
  peers: Peer[];
}

const statusConfig = {
  synced: { color: "bg-success", label: "Synced" },
  buffering: { color: "bg-warning", label: "Buffering" },
  disconnected: { color: "bg-destructive", label: "Offline" },
};

const PeerList = ({ peers }: PeerListProps) => {
  return (
    <section className="mb-6">
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
        Peers · {peers.filter(p => p.status !== "disconnected").length} connected
      </h3>
      <div className="space-y-3">
        {peers.map((peer) => {
          const config = statusConfig[peer.status];
          return (
            <motion.div
              key={peer.name}
              className={`flex items-center justify-between p-2.5 rounded-lg transition-colors duration-150 ${
                peer.isReady ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
              }`}
              layout
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                  {peer.name[0]}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{peer.name}</span>
                  {peer.isHost && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary font-semibold">Host</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {peer.status === "synced" && (
                  <span className="font-mono-data text-[10px] text-success">{peer.drift}ms</span>
                )}
                {peer.status === "buffering" && (
                  <span className="font-mono-data text-[10px] text-warning">buffering</span>
                )}
                <div
                  className={`w-2 h-2 rounded-full ${config.color} ${
                    peer.status === "synced" ? "glow-sync" : ""
                  } ${peer.status === "buffering" ? "animate-pulse-sync" : ""}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default PeerList;
export type { Peer };
