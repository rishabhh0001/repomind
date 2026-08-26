"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { importRepo, getRepos } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const data = await getRepos();
        setRepos(data.repositories);
      } catch (err) {
        console.error("Failed to fetch repos", err);
      } finally {
        setLoadingRepos(false);
      }
    }
    fetchRepos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const repo = await importRepo(url);
      router.push(`/repo/${repo.id}`);
    } catch (err) {
      setError("Import failed. Verify URL access.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-emerald-500";
      case "error": return "bg-red-500";
      default: return "bg-amber-500 animate-pulse";
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "recently";
      return `${formatDistanceToNow(d)} ago`;
    } catch {
      return "recently";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-white">
      <div className="max-w-6xl mx-auto w-full px-6 py-12 space-y-12">
        
        {/* Import Section */}
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Deploy new repository</h1>
          <form onSubmit={handleSubmit} className="relative flex items-center group max-w-2xl">
            <div className="absolute left-4 text-zinc-500 flex items-center">
              <MaterialIcon name="fork_right" size={20} />
            </div>
            <Input 
              id="url"
              type="text"
              placeholder="Paste a GitHub repository URL (e.g., https://github.com/facebook/react)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-[#111111] border border-white/10 rounded-xl h-14 pl-12 pr-14 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:border-zinc-500 transition-all text-sm shadow-xl"
              autoComplete="off"
              spellCheck="false"
            />
            <button 
              type="submit" 
              disabled={loading || !url.trim()}
              className="absolute right-2 h-10 px-4 flex items-center justify-center bg-white text-black hover:bg-zinc-200 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm gap-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Import</span>
                  <MaterialIcon name="arrow_forward" size={16} />
                </>
              )}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </section>

        {/* Projects Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-medium tracking-tight">Your Projects</h2>
            <div className="relative flex items-center">
              <MaterialIcon name="search" size={18} className="absolute left-3 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-[#111111] border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 w-64 transition-all"
              />
            </div>
          </div>

          {loadingRepos ? (
            <div className="flex items-center justify-center py-20 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl bg-[#111111]/50">
              <MaterialIcon name="dns" size={32} className="mb-4 opacity-50 text-indigo-400" />
              <p className="text-sm">No repositories imported yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <div 
                  key={repo.id}
                  onClick={() => router.push(`/repo/${repo.id}`)}
                  className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-zinc-600 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between h-48 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(repo.status)}`} />
                        <span className="text-xs text-zinc-400 capitalize">{repo.status}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600">ID: {repo.id}</span>
                    </div>
                    
                    <h3 className="text-lg font-medium tracking-tight mb-1 truncate">{repo.name}</h3>
                    <p className="text-xs text-zinc-500 truncate">{repo.url ? repo.url.replace("https://github.com/", "") : "Local Repo"}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500 mt-6 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-1.5" title="Commits indexed">
                      <MaterialIcon name="commit" size={16} className="text-indigo-400" />
                      <span>{repo.total_commits || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Time elapsed since import">
                      <MaterialIcon name="schedule" size={16} className="text-zinc-500" />
                      <span>{formatDate(repo.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
