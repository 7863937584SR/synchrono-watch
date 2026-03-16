import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface SyncState {
  currentTime: number;
  isPlaying: boolean;
  timestamp: number; // Date.now() when event was sent
}

export interface PeerPresence {
  name: string;
  isReady: boolean;
  currentTime: number;
  isPlaying: boolean;
  lastSeen: number;
}

interface UseSyncRoomOptions {
  roomCode: string;
  userName: string;
  isHost: boolean;
}

export function useSyncRoom({ roomCode, userName, isHost }: UseSyncRoomOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerPresence>>({});
  const [syncState, setSyncState] = useState<SyncState | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userName } },
    });

    // Track presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PeerPresence>();
      const peerMap: Record<string, PeerPresence> = {};
      for (const [key, presences] of Object.entries(state)) {
        if (presences.length > 0) {
          peerMap[key] = presences[0] as unknown as PeerPresence;
        }
      }
      setPeers(peerMap);
    });

    // Listen for sync commands from host
    channel.on("broadcast", { event: "sync" }, ({ payload }) => {
      if (!isHost) {
        setSyncState(payload as SyncState);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          name: userName,
          isReady: false,
          currentTime: 0,
          isPlaying: false,
          lastSeen: Date.now(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, userName, isHost]);

  const broadcastSync = useCallback((state: SyncState) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "sync",
      payload: state,
    });
  }, []);

  const updatePresence = useCallback((data: Partial<PeerPresence>) => {
    channelRef.current?.track({
      name: userName,
      ...data,
      lastSeen: Date.now(),
    });
  }, [userName]);

  return { peers, syncState, broadcastSync, updatePresence };
}
