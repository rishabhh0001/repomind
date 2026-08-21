"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getRepo } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Loader2 } from "lucide-react";
import CodeGraph from "@/components/graph/CodeGraph";
import NodeInspector from "@/components/inspector/NodeInspector";
import ChatPanel from "@/components/chat/ChatPanel";

export default function RepoWorkspace() {
  const params = useParams();
  const repoId = parseInt(params.id as string);
  const setCurrentRepoId = useStore((s) => s.setCurrentRepoId);
  const isInspectorOpen = useStore((s) => s.isInspectorOpen);
  
  const [repo, setRepo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Indexing Repository...</h2>
        <p className="text-muted-foreground capitalize">Status: {repo?.status || "Starting"}</p>
      </div>
    );
  }

  if (repo?.status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4">
        <div className="text-destructive text-xl font-bold">Indexing Failed</div>
        <p className="text-muted-foreground max-w-md text-center">{repo.error_message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar: Chat */}
      <div className="w-[400px] shrink-0 border-r border-border bg-card/30 flex flex-col z-10 shadow-2xl">
        <ChatPanel repoId={repoId} />
      </div>
      
      {/* Middle: Graph Canvas */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background to-background/50">
        <CodeGraph repoId={repoId} />
      </div>
      
      {/* Right sidebar: Inspector */}
      {isInspectorOpen && (
        <div className="w-[500px] shrink-0 border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl z-20 absolute right-0 top-0 h-full">
          <NodeInspector />
        </div>
      )}
    </div>
  );
}
