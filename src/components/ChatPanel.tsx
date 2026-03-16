import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

const mockMessages: ChatMessage[] = [
  { id: "1", user: "Alex", text: "Ready when you are!", timestamp: "8:42 PM" },
  { id: "2", user: "Sam", text: "Let's gooo 🎬", timestamp: "8:42 PM" },
  { id: "3", user: "Jordan", text: "Starting in 10 seconds", timestamp: "8:43 PM" },
  { id: "4", user: "You", text: "Perfect, all synced up", timestamp: "8:43 PM" },
];

const ChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      user: "You",
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Chat</h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto text-sm space-y-3 pr-1 mb-3 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-baseline gap-2">
              <span className={`text-xs font-semibold ${msg.user === "You" ? "text-primary" : "text-foreground"}`}>
                {msg.user}
              </span>
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {msg.timestamp}
              </span>
            </div>
            <p className="text-muted-foreground text-[13px] leading-relaxed" style={{ textWrap: "pretty" as any }}>
              {msg.text}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Send a message..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2"
        />
        <button
          onClick={sendMessage}
          className="p-2 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default ChatPanel;
