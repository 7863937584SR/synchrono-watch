import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Users, Zap, ArrowRight, Loader2 } from "lucide-react";
import { createRoom, findRoom } from "@/lib/room";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Enter your name first", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const room = await createRoom(name.trim());
      navigate(`/room/${room.code}`, { state: { userName: name.trim(), isHost: true } });
    } catch {
      toast({ title: "Failed to create room", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      toast({ title: "Enter your name first", description: "You need a name before joining a room.", variant: "destructive" });
      return;
    }
    if (!roomCode.trim()) {
      toast({ title: "Enter a room code", description: "Ask the host for their room code.", variant: "destructive" });
      return;
    }
    setJoining(true);
    try {
      const room = await findRoom(roomCode.trim());
      navigate(`/room/${room.code}`, { state: { userName: name.trim(), isHost: false } });
    } catch {
      toast({
        title: "Room not found",
        description: `No room with code "${roomCode.trim()}" exists. Check the code and try again.`,
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md space-y-10"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-medium text-primary tracking-wide">Zero-drift playback</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SyncStream</h1>
          <p className="text-sm text-muted-foreground">Watch in perfect lockstep.</p>
        </div>

        {/* Name — shared for both create and join */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Enter your name"
            className="w-full h-11 bg-secondary/50 border border-foreground/10 rounded-lg px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-150"
          />
          <button
            onClick={handleCreate}
            disabled={creating || joining}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150 glow-primary disabled:opacity-50"
          >
            {creating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Play className="w-4 h-4" /> Create Room</>}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-foreground/10" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or join existing</span>
          <div className="flex-1 h-px bg-foreground/10" />
        </div>

        {/* Join section */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Room code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="A7X-92K"
              maxLength={7}
              className="flex-1 h-11 bg-secondary/50 border border-foreground/10 rounded-lg px-4 text-sm font-mono-data text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-150 tracking-widest text-center"
            />
            <button
              onClick={handleJoin}
              disabled={creating || joining}
              className="h-11 px-5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium flex items-center gap-2 transition-colors duration-150 disabled:opacity-50"
            >
              {joining
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>Join <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 pl-1">
            Ask the host for their room code, enter it above and click Join.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success glow-sync" />
            <span className="text-[10px] text-muted-foreground">Systems online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Real-time sync</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
