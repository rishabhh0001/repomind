"use client";

import { useEffect, useState } from "react";
import { getNodeDetail } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDistanceToNow } from "date-fns";

export default function NodeInspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const setInspectorOpen = useStore((s) => s.setInspectorOpen);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);
  
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "code" | "history">("info");

  useEffect(() => {
    if (!selectedNodeId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getNodeDetail(selectedNodeId);
        setDetail(data);
      } catch (err: any) {
        console.error("Failed to fetch node detail:", err);
        setError("Could not load details for this symbol.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedNodeId]);

  if (!selectedNodeId) return null;

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
    <div className="flex flex-col h-full bg-[#111111] text-zinc-300 font-sans">
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <h2 className="font-semibold text-base flex items-center gap-3 text-white truncate max-w-[80%]">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <MaterialIcon name="code" size={18} className="text-indigo-400" />
          </div>
          <span className="truncate tracking-tight" title={detail?.qualified_name || selectedNodeId}>
            {detail?.name || selectedNodeId.split(".").pop() || selectedNodeId}
          </span>
        </h2>
        <button 
          onClick={() => setInspectorOpen(false)}
          className="p-1.5 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
        >
          <MaterialIcon name="close" size={18} />
        </button>
      </div>

      <div className="flex border-b border-white/5 px-5 pt-2">
        {(["info", "code", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize font-medium text-[13px] border-b-2 transition-colors ${
              activeTab === tab 
                ? "border-indigo-500 text-indigo-400" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-950/20 border border-red-800/30 text-red-300 text-xs">
            <MaterialIcon name="error" size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            
            {activeTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase">Type</div>
                    <div className="text-[13px] text-white capitalize font-medium">{detail.symbol_type || "symbol"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase">File Location</div>
                    <div className="font-mono text-[12px] text-indigo-400 truncate" title={detail.file_path}>
                      {detail.file_path}{detail.line_start ? `:${detail.line_start}` : ""}
                    </div>
                  </div>
                </div>

                {detail.docstring && (
                  <div className="space-y-2">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
                      <MaterialIcon name="description" size={14} /> Documentation
                    </div>
                    <div className="bg-[#181818] border border-white/5 p-3.5 rounded-xl text-zinc-300 text-[13px] leading-relaxed whitespace-pre-wrap">
                      {detail.docstring}
                    </div>
                  </div>
                )}

                <div className="space-y-5 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2.5 flex items-center gap-1.5">
                      <MaterialIcon name="arrow_forward" size={14} className="text-indigo-400" /> Calls / Dependencies ({detail.dependencies?.length || 0})
                    </div>
                    {detail.dependencies?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {detail.dependencies.map((dep: any, i: number) => (
                          <li 
                            key={i} 
                            className="bg-[#181818] border border-white/5 p-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-indigo-500/50 hover:bg-[#1c1c1c] transition-all"
                            onClick={() => setSelectedNodeId(dep.qualified_name || dep.id)}
                          >
                            <div className="text-[12px] font-mono text-zinc-300 truncate flex-1" title={dep.qualified_name}>
                              {dep.qualified_name}
                            </div>
                            <span className="text-[9px] font-medium tracking-wide uppercase bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                              {dep.type || "calls"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[12px] text-zinc-600 italic">No outgoing dependencies.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2.5 flex items-center gap-1.5">
                      <MaterialIcon name="arrow_back" size={14} className="text-indigo-400" /> Called By / Dependents ({detail.dependents?.length || 0})
                    </div>
                    {detail.dependents?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {detail.dependents.map((dep: any, i: number) => (
                          <li 
                            key={i} 
                            className="bg-[#181818] border border-white/5 p-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-indigo-500/50 hover:bg-[#1c1c1c] transition-all"
                            onClick={() => setSelectedNodeId(dep.qualified_name || dep.id)}
                          >
                            <div className="text-[12px] font-mono text-zinc-300 truncate flex-1" title={dep.qualified_name}>
                              {dep.qualified_name}
                            </div>
                            <span className="text-[9px] font-medium tracking-wide uppercase bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                              {dep.type || "calls"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[12px] text-zinc-600 italic">No incoming dependents.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "code" && (
              <div className="space-y-4">
                {detail.signature && (
                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">Signature</div>
                    <pre className="p-3.5 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto text-[12px] font-mono text-indigo-300 custom-scrollbar">
                      {detail.signature}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">Source Code</div>
                  {detail.source_code ? (
                    <pre className="p-3.5 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto text-[12px] font-mono text-zinc-300 leading-relaxed custom-scrollbar max-h-[400px]">
                      {detail.source_code}
                    </pre>
                  ) : (
                    <div className="text-zinc-600 text-xs italic">No source code captured for this symbol.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-medium text-xs mb-1">
                    <MaterialIcon name="commit" size={16} /> Temporal Code Intelligence
                  </div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                    Commits that created or modified this symbol.
                  </p>
                  
                  {detail.commits && detail.commits.length > 0 ? (
                    <div className="space-y-3">
                      {detail.commits.map((commit: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl border border-white/5 bg-[#181818] shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-400 truncate max-w-[65%]">
                              {commit.sha?.slice(0, 7) || "commit"}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {formatDate(commit.committed_at)}
                            </span>
                          </div>
                          <div className="text-[12px] text-zinc-200 font-medium line-clamp-2">
                            {commit.message}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Author: {commit.author_name}</span>
                            {commit.is_introduction && (
                              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                                Introduced
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-zinc-500 italic">
                      No commit history mapped for this symbol yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-zinc-600 py-12 text-[13px]">
            Select a node in the graph to view details.
          </div>
        )}
      </div>
    </div>
  );
}
