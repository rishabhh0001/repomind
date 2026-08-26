import { Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPanel({ repo }: { repo: any }) {
  if (!repo) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  const statItems = [
    { label: "Files Indexed", value: repo.total_files || 0, icon: <MaterialIcon name="folder" size={20} className="text-indigo-400" /> },
    { label: "Symbols Extracted", value: repo.total_symbols || 0, icon: <MaterialIcon name="layers" size={20} className="text-emerald-400" /> },
    { label: "Graph Relationships", value: repo.total_edges || 0, icon: <MaterialIcon name="hub" size={20} className="text-sky-400" /> },
    { label: "Commits Mined", value: repo.total_commits || 0, icon: <MaterialIcon name="commit" size={20} className="text-amber-400" /> },
  ];

  // Parse languages safely (handles JSON string or array)
  let safeLanguages: string[] = [];
  if (Array.isArray(repo.languages)) {
    safeLanguages = repo.languages;
  } else if (typeof repo.languages === "string" && repo.languages.trim()) {
    try {
      const parsed = JSON.parse(repo.languages);
      if (Array.isArray(parsed)) safeLanguages = parsed;
    } catch {
      safeLanguages = [repo.languages];
    }
  }

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

  // Calculate dependency density
  const edgeDensity = repo.total_symbols > 0 
    ? ((repo.total_edges || 0) / repo.total_symbols).toFixed(1) 
    : "0";

  return (
    <div className="flex flex-col h-full bg-[#111111] text-zinc-300 overflow-y-auto custom-scrollbar p-5 space-y-6">
      {/* Header Info */}
      <div className="space-y-2 pb-5 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white tracking-tight break-all">{repo.name}</h2>
        {repo.url ? (
          <a 
            href={repo.url} 
            target="_blank" 
            rel="noreferrer" 
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors break-all block"
          >
            {repo.url}
          </a>
        ) : (
          <div className="text-xs font-mono text-zinc-500">Local Repository</div>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span className="capitalize text-zinc-300 font-medium">{repo.status}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <MaterialIcon name="monitoring" size={16} className="text-indigo-400" /> Architecture Metrics
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {statItems.map((stat, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-[#181818] flex flex-col gap-2 group hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                {stat.icon}
                <span className="text-[10px] text-zinc-600 font-mono">#{idx + 1}</span>
              </div>
              <div>
                <div className="text-xl font-bold text-white tracking-tight">{stat.value?.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language Composition */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Language Composition</h3>
        {safeLanguages.length > 0 ? (
          <div className="space-y-2.5 p-3.5 rounded-xl bg-[#181818] border border-white/5">
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-black/50 ring-1 ring-white/10">
              {safeLanguages.map((lang: string, i: number) => (
                <div 
                  key={lang}
                  className="h-full transition-all"
                  style={{ 
                    width: `${Math.max(100 / safeLanguages.length, 10)}%`, 
                    backgroundColor: `hsl(${(i * 65 + 210) % 360}, 75%, 60%)` 
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {safeLanguages.map((lang: string, i: number) => (
                <div key={lang} className="flex items-center gap-1.5 text-xs text-zinc-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${(i * 65 + 210) % 360}, 75%, 60%)` }} />
                  <span>{lang}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 flex items-center gap-2 p-3 rounded-xl bg-[#181818] border border-white/5">
            <MaterialIcon name="warning" size={16} className="text-amber-500" /> No language data detected
          </div>
        )}
      </div>

      {/* Architectural Health & Metadata */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <MaterialIcon name="schedule" size={16} className="text-indigo-400" /> Indexing Details
        </h3>
        <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Coupling Density</span>
            <span className="font-mono text-indigo-300 font-semibold">{edgeDensity} edges / symbol</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Default Branch</span>
            <span className="font-mono text-zinc-300">{repo.default_branch || "main"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Indexed At</span>
            <span className="text-zinc-400">{formatDate(repo.indexed_at || repo.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
