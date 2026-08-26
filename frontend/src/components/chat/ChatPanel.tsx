"use client";

import { useState, useRef, useEffect } from "react";
import { queryRepo } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  flow?: any;
}

export default function ChatPanel({ repoId }: { repoId: number }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm RepoMind AI. Ask me anything about the architecture, flows, or specific functions in this repository."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const result = await queryRepo(repoId, userText);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        flow: (result.flow_nodes && result.flow_nodes.length > 0) 
          ? { nodes: result.flow_nodes, edges: result.flow_edges } 
          : undefined
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg = err?.message || "Sorry, I encountered an error while analyzing the codebase.";
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        isError: true,
        content: errorMsg.includes("Server error") || errorMsg.includes("LLM Error") 
          ? `${errorMsg}. Please check that your LLM API keys (e.g. GEMINI_API_KEY) are configured correctly on your backend.`
          : errorMsg
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#111111] text-zinc-300 font-sans overflow-hidden">
      {/* Scrollable messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col max-w-[90%] break-words",
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start w-full"
            )}
          >
            <div className={cn(
              "px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed max-w-full overflow-hidden shadow-sm",
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-xs" 
                : msg.isError
                  ? "bg-red-950/30 border border-red-800/40 text-red-200 rounded-tl-xs w-full"
                  : "bg-[#181818] border border-white/5 text-zinc-200 rounded-tl-xs w-full"
            )}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  <MaterialIcon 
                    name={msg.isError ? "error" : "auto_awesome"} 
                    size={14} 
                    className={msg.isError ? "text-red-400" : "text-indigo-400"} 
                  />
                  <span>{msg.isError ? "Error" : "RepoMind AI"}</span>
                </div>
              )}
              <div className="text-[14px]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                    a: ({node, ...props}: any) => <a className="text-indigo-400 hover:underline font-medium" {...props} />,
                    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}: any) => <li className="" {...props} />,
                    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-2 mt-4 text-white" {...props} />,
                    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mb-2 mt-3 text-white" {...props} />,
                    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mb-2 mt-2 text-zinc-200" {...props} />,
                    code: ({node, className, children, ...props}: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match && !String(children).includes('\n');
                      return !isInline ? (
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg my-3 overflow-hidden shadow-sm">
                          {match && <div className="bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-white/5 uppercase tracking-wider">{match[1]}</div>}
                          <pre className="p-3 overflow-x-auto text-[12px] custom-scrollbar">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code className="bg-black/30 border border-white/5 px-1.5 py-0.5 rounded-md text-indigo-300 font-mono text-[12px]" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
            
            {msg.flow && (
              <div className="mt-2 border border-white/10 bg-[#181818] rounded-xl p-2.5 transition-colors group flex items-center gap-3 w-full max-w-xs shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <MaterialIcon name="play_arrow" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate">Architecture Flow</div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {msg.flow.nodes?.length || 0} nodes, {msg.flow.edges?.length || 0} edges
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex flex-col max-w-[90%] mr-auto items-start w-full">
             <div className="px-3.5 py-2.5 rounded-2xl text-[14px] bg-[#181818] border border-white/5 text-zinc-300 rounded-tl-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  <MaterialIcon name="auto_awesome" size={14} className="text-indigo-400" />
                  <span>RepoMind AI</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span className="text-xs animate-pulse">Analyzing codebase...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Non-overlapping fixed footer input */}
      <div className="shrink-0 p-3 bg-[#141414] border-t border-white/5 flex flex-col gap-2">
        <div className="relative flex items-center bg-[#1c1c1c] border border-white/10 rounded-xl shadow-inner focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about architecture, dependencies, flows..."
            className="w-full bg-transparent border-0 pl-3.5 pr-10 py-3 text-[14px] text-white placeholder:text-zinc-500 focus:outline-none resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
            disabled={loading}
            rows={1}
            spellCheck="false"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-colors shadow-sm flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MaterialIcon name="subdirectory_arrow_left" size={16} />}
          </button>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-zinc-500">RepoMind can make mistakes. Verify critical code paths.</span>
        </div>
      </div>
    </div>
  );
}
