import { Loader2, Folder, FileCode2, GitCommit, GitBranch, TerminalSquare, AlertTriangle, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPanel({ repo }: { repo: any }) {
  if (!repo) {
    return <div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>;
  }

  const statItems = [
    { label: "Files Indexed", value: repo.total_files, icon: <FileCode2 className="w-4 h-4" /> },
    { label: "Symbols Extracted", value: repo.total_symbols, icon: <Layers className="w-4 h-4" /> },
    { label: "Relationships", value: repo.total_edges, icon: <GitBranch className="w-4 h-4" /> },
    { label: "Commits Mined", value: repo.total_commits, icon: <GitCommit className="w-4 h-4" /> },
  ];

  const safeLanguages = repo.languages || [];

  return (
    <div className="flex flex-col h-full bg-[#111111] text-zinc-300 overflow-y-auto custom-scrollbar p-6 space-y-8">
      {/* Header Info */}
      <div className="space-y-2 pb-6 border-b border-white/5">
        <h2 className="text-xl font-medium text-white tracking-tight break-all">{repo.name}</h2>
        <a href={repo.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors">
          {repo.url}
        </a>
        <div className="flex items-center gap-2 mt-4 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="capitalize">{repo.status}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">Architecture Metrics</h3>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((stat, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-white/5 bg-[#181818] flex flex-col gap-3 group hover:border-zinc-700 transition-colors">
              <div className="text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.icon}</div>
              <div>
                <div className="text-2xl font-semibold text-white tracking-tight">{stat.value?.toLocaleString() || 0}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language Composition */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Language Composition</h3>
        {safeLanguages.length > 0 ? (
          <div className="space-y-3">
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-black ring-1 ring-white/10">
              {safeLanguages.map((lang: string, i: number) => (
                <div 
                  key={lang}
                  className="h-full"
                  style={{ 
                    width: `${Math.max(100 / safeLanguages.length, 5)}%`, 
                    backgroundColor: `hsl(${i * 45}, 70%, 60%)` 
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {safeLanguages.map((lang: string, i: number) => (
                <div key={lang} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${i * 45}, 70%, 60%)` }} />
                  {lang}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No language data detected
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Repository Metadata</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Internal ID</span>
            <span className="font-mono text-zinc-400">{repo.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Branch Mined</span>
            <span className="font-mono text-zinc-400">{repo.default_branch || "main"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Imported At</span>
            <span className="text-zinc-400">{formatDistanceToNow(new Date(repo.created_at))} ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
