import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Event types ────────────────────────────────────────────────────────────────
export type SyncEventType = "play" | "pause" | "seek" | "tick" | "source";

export interface SyncEvent {
  type: SyncEventType;
  currentTime: number;
  isPlaying: boolean;
  /** Wall-clock ms when the host sent this packet – used for latency compensation */
  sentAt: number;
  /** Optional video source URL for direct playback */
  sourceUrl?: string;
}

// Backwards-compatible alias used by VideoPlayer
export type SyncState = SyncEvent;

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

    // ── Presence (peer list) ──────────────────────────────────────────────────
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

    // ── Sync events from host ─────────────────────────────────────────────────
    channel.on("broadcast", { event: "sync" }, ({ payload }) => {
      if (!isHost) {
        const ev = payload as SyncEvent;
        // NTP-style compensation: advance currentTime by half the round-trip
        // (we only have one-way time here, so use full elapsed as an upper bound
        //  and halve it for a reasonable estimate).
        const networkDelayMs = Math.max(0, Date.now() - ev.sentAt);
        const compensatedTime = ev.currentTime + networkDelayMs / 1000;
        setSyncState({ ...ev, currentTime: compensatedTime });
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

  /**
   * Broadcast a sync event to all viewers immediately.
   * `type` controls how strict the receiver's correction will be.
   */
  const broadcastSync = useCallback(
    (type: SyncEventType, currentTime: number, isPlaying: boolean, sourceUrl?: string) => {
      const ev: SyncEvent = { type, currentTime, isPlaying, sentAt: Date.now(), sourceUrl };
      channelRef.current?.send({
        type: "broadcast",
        event: "sync",
        payload: ev,
      });
    },
    []
  );

  const broadcastSource = useCallback(
    (sourceUrl: string) => {
      broadcastSync("source", 0, false, sourceUrl);
    },
    [broadcastSync]
  );

  const updatePresence = useCallback(
    (data: Partial<PeerPresence>) => {
      channelRef.current?.track({
        name: userName,
        ...data,
        lastSeen: Date.now(),
      });
    },
    [userName]
  );

  return { peers, syncState, broadcastSync, broadcastSource, updatePresence };
}
