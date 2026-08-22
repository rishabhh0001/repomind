"use client";

import { useState, useRef, useEffect } from "react";
import { queryRepo } from "@/lib/api";
import { Send, Bot, User, Loader2, Play, CornerDownLeft, Sparkles } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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
        content: "Sorry, I encountered an error while analyzing the codebase. Please check if your API keys are configured correctly."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] text-zinc-300 font-sans relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar pb-32">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col max-w-[90%]", msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
            <div className={cn(
              "px-4 py-3 rounded-2xl text-[15px] leading-relaxed",
              msg.role === "user" 
                ? "bg-zinc-800 text-white rounded-br-sm" 
                : "bg-transparent text-zinc-300"
            )}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> RepoMind AI
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            
            {msg.flow && (
              <div className="mt-3 ml-2 border border-white/10 bg-[#181818] rounded-xl p-3 cursor-pointer hover:border-zinc-600 transition-colors group flex items-center gap-4 w-64 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <Play size={14} className="ml-0.5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-0.5">Visualize Flow</div>
                  <div className="text-xs text-zinc-500">
                    {msg.flow.nodes.length} nodes, {msg.flow.edges.length} edges
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex flex-col max-w-[90%] mr-auto items-start">
             <div className="px-4 py-3 rounded-2xl text-[15px] bg-transparent text-zinc-300">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> RepoMind AI
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  <span className="text-zinc-500 animate-pulse">Analyzing codebase...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#111111] via-[#111111] to-transparent pt-12">
        <div className="relative max-w-full bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden focus-within:ring-1 focus-within:ring-zinc-600 focus-within:border-zinc-600 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the architecture..."
            className="w-full bg-transparent border-0 pl-4 pr-12 py-4 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0 resize-none min-h-[56px] max-h-[200px]"
            disabled={loading}
            rows={1}
            spellCheck="false"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="absolute right-2 bottom-2 p-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-zinc-600 font-medium">RepoMind can make mistakes. Verify critical code paths.</span>
        </div>
      </div>
    </div>
  );
}
