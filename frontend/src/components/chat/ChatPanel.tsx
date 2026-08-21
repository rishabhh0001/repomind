"use client";

import { useState, useRef, useEffect } from "react";
import { queryRepo } from "@/lib/api";
import { Send, Bot, User, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  flow?: any;
}

export default function ChatPanel({ repoId }: { repoId: number }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm RepoMind. Ask me anything about the architecture, flows, or specific functions in this repository."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await queryRepo(repoId, userMsg.content);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        flow: (result.flow_nodes && result.flow_nodes.length > 0) ? { nodes: result.flow_nodes, edges: result.flow_edges } : undefined
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error while analyzing the codebase."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-md">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Intelligence Agent
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm", 
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-secondary-foreground rounded-tl-sm"
              )}>
                {msg.content}
              </div>
              
              {msg.flow && (
                <div className="mt-2 bg-background border border-border rounded-lg p-3 w-full cursor-pointer hover:border-primary transition-colors group">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                    <Play size={12} className="group-hover:translate-x-1 transition-transform" />
                    Generated Flow Diagram
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {msg.flow.nodes.length} nodes, {msg.flow.edges.length} edges
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    (Click to overlay flow on main graph - MVP feature placeholder)
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about architecture, bugs, or flows..."
            className="w-full bg-input border border-border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-1.5 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
