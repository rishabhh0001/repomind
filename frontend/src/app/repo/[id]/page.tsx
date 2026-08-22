"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getRepo } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Loader2, MessageSquare, BarChart2 } from "lucide-react";
import CodeGraph from "@/components/graph/CodeGraph";
import NodeInspector from "@/components/inspector/NodeInspector";
import ChatPanel from "@/components/chat/ChatPanel";
import OverviewPanel from "@/components/inspector/OverviewPanel";

export default function RepoWorkspace() {
  const params = useParams();
  const repoId = parseInt(params.id as string);
  const setCurrentRepoId = useStore((s) => s.setCurrentRepoId);
  const isInspectorOpen = useStore((s) => s.isInspectorOpen);
  
  const [repo, setRepo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "overview">("chat");

  useEffect(() => {
    setCurrentRepoId(repoId);
    
    // Polling for repo status if it's indexing
    const pollInterval = setInterval(async () => {
      try {
        const data = await getRepo(repoId);
        setRepo(data);
        if (data.status === "ready" || data.status === "error") {
          clearInterval(pollInterval);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch repo status");
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [repoId, setCurrentRepoId]);

  if (loading || (repo && repo.status !== "ready" && repo.status !== "error")) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-[#0c0c0c] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
        <h2 className="text-xl font-semibold tracking-tight">Indexing Repository...</h2>
        <p className="text-zinc-500 capitalize text-sm">Status: {repo?.status || "Starting"}</p>
      </div>
    );
  }

  if (repo?.status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-[#0c0c0c] text-white">
        <div className="text-red-500 text-xl font-bold tracking-tight">Indexing Failed</div>
        <p className="text-zinc-500 max-w-md text-center text-sm">{repo.error_message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0c]">
      {/* Sub Navbar */}
      <div className="h-12 border-b border-white/5 bg-[#111111] shrink-0 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 text-sm truncate pr-4">
          <span className="text-zinc-500 font-mono hidden sm:inline">RepoMind</span>
          <span className="text-zinc-600 hidden sm:inline">/</span>
          <span className="text-white font-medium tracking-tight truncate">{repo.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-zinc-400 capitalize hidden sm:inline">{repo.status}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left sidebar: Tabbed (Full width on mobile, 400px on desktop) */}
        <div className="w-full md:w-[400px] h-[50vh] md:h-full shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-[#111111] flex flex-col z-10">
          <div className="flex items-center p-2 border-b border-white/5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "chat" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "overview" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {activeTab === "chat" ? <ChatPanel repoId={repoId} /> : <OverviewPanel repo={repo} />}
          </div>
        </div>
        
        {/* Middle: Graph Canvas */}
        <div className="flex-1 relative bg-[#0c0c0c] min-h-[50vh] md:min-h-0">
          <CodeGraph repoId={repoId} />
        </div>
        
        {/* Right sidebar: Inspector */}
        {isInspectorOpen && (
          <div className="w-full md:w-[500px] shrink-0 border-t md:border-t-0 md:border-l border-white/5 bg-[#111111]/95 backdrop-blur-xl shadow-2xl z-20 absolute md:right-0 bottom-0 md:top-0 h-[60vh] md:h-full">
            <NodeInspector />
          </div>
        )}
      </div>
    </div>
  );
}
