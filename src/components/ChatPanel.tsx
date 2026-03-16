import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendMessage } from "@/lib/room";

interface ChatMessage {
  id: string;
  user_name: string;
  text: string;
  created_at: string;
}

interface ChatPanelProps {
  roomId: string | null;
  userName: string;
}

const ChatPanel = ({ roomId, userName }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    if (!roomId) return;
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });
  }, [roomId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !roomId) return;
    const text = input.trim();
    setInput("");
    try {
      await sendMessage(roomId, userName, text);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Chat</h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto text-sm space-y-3 pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center py-8">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-baseline gap-2">
              <span className={`text-xs font-semibold ${msg.user_name === userName ? "text-primary" : "text-foreground"}`}>
                {msg.user_name}
              </span>
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(msg.created_at)}
              </span>
            </div>
            <p className="text-muted-foreground text-[13px] leading-relaxed">{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Send a message..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2"
        />
        <button
          onClick={handleSend}
          className="p-2 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default ChatPanel;
