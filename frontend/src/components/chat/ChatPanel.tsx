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
    <div className="flex flex-col h-full bg-black border-l border-zinc-900 font-mono text-sm">
      <div className="p-4 border-b border-zinc-900 bg-black flex items-center justify-between">
        <h2 className="text-zinc-300 font-medium tracking-tight">
          intelligence
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
          <span className="text-xs text-zinc-600">ready</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
              <span>{msg.role === "user" ? "user" : "system"}</span>
            </div>
            
            <div className={cn("text-sm leading-relaxed", 
              msg.role === "user" ? "text-zinc-300" : "text-white"
            )}>
              {msg.content}
            </div>
            
            {msg.flow && (
              <div className="mt-4 border-l border-zinc-800 pl-4 py-2 cursor-pointer hover:border-zinc-500 transition-colors group">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <Play size={10} className="group-hover:text-white transition-colors" />
                  FLOW DATA
                </div>
                <div className="text-xs text-zinc-600">
                  [{msg.flow.nodes.length} nodes, {msg.flow.edges.length} edges]
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Bot size={12} />
              <span>system</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={12} className="animate-spin" />
              <span>computing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-zinc-900 bg-black">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-0 text-zinc-700">
            &gt;
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query codebase..."
            className="w-full bg-transparent border-0 pl-6 pr-10 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-0"
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-0 p-1 text-zinc-600 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
