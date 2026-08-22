"use client";

import { useEffect, useState } from "react";
import { getNodeDetail } from "@/lib/api";
import { useStore } from "@/lib/store";
import { X, Code2, ArrowRight, ArrowLeft, GitCommit, FileText, Loader2 } from "lucide-react";

export default function NodeInspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const setInspectorOpen = useStore((s) => s.setInspectorOpen);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);
  
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "code" | "history">("info");

  useEffect(() => {
    if (!selectedNodeId) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        setDetail({
          name: selectedNodeId.split(".").pop(),
          qualified_name: selectedNodeId,
          symbol_type: "function",
          file_path: "src/example.py",
          line_start: 10,
          line_end: 25,
          signature: "def example_function(arg1, arg2):",
          docstring: "Function documentation available here.",
          source_code: "def example_function(arg1, arg2):\n    return arg1 + arg2\n",
          dependencies: [
            { qualified_name: "logger.info", type: "calls" }
          ],
          dependents: [
            { qualified_name: "main_handler", type: "calls" }
          ]
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedNodeId]);

  if (!selectedNodeId) return null;

  return (
    <div className="flex flex-col h-full bg-[#111111] text-zinc-300 font-sans">
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <h2 className="font-semibold text-lg flex items-center gap-3 text-white truncate">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Code2 className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="truncate tracking-tight">{detail?.name || selectedNodeId}</span>
        </h2>
        <button 
          onClick={() => setInspectorOpen(false)}
          className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-white/5 px-5 pt-3">
        {(["info", "code", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 capitalize font-medium text-[13px] border-b-2 transition-colors ${
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
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : detail ? (
          <div className="space-y-8">
            
            {activeTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase">Type</div>
                    <div className="text-[14px] text-white capitalize font-medium">{detail.symbol_type}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase">File Location</div>
                    <div className="font-mono text-[12px] text-indigo-400 truncate" title={detail.file_path}>
                      {detail.file_path}:{detail.line_start}
                    </div>
                  </div>
                </div>

                {detail.docstring && (
                  <div className="space-y-2">
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Documentation
                    </div>
                    <div className="bg-[#181818] border border-white/5 p-4 rounded-xl text-zinc-300 text-[13px] leading-relaxed whitespace-pre-wrap">
                      {detail.docstring}
                    </div>
                  </div>
                )}

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-3 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" /> Calls / Dependencies
                    </div>
                    {detail.dependencies?.length > 0 ? (
                      <ul className="space-y-2">
                        {detail.dependencies.map((dep: any, i: number) => (
                          <li key={i} className="bg-[#181818] border border-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all"
                              onClick={() => setSelectedNodeId(dep.qualified_name)}>
                            <div className="text-[13px] font-mono text-zinc-400 truncate flex-1">
                              {dep.qualified_name}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide uppercase bg-white/5 border border-white/5 px-2 py-1 rounded text-zinc-400">
                              {dep.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[13px] text-zinc-600 italic">No known dependencies.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-3 flex items-center gap-1.5">
                      <ArrowLeft className="w-3.5 h-3.5" /> Called By / Dependents
                    </div>
                    {detail.dependents?.length > 0 ? (
                      <ul className="space-y-2">
                        {detail.dependents.map((dep: any, i: number) => (
                          <li key={i} className="bg-[#181818] border border-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all"
                              onClick={() => setSelectedNodeId(dep.qualified_name)}>
                            <div className="text-[13px] font-mono text-zinc-400 truncate flex-1">
                              {dep.qualified_name}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide uppercase bg-white/5 border border-white/5 px-2 py-1 rounded text-zinc-400">
                              {dep.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[13px] text-zinc-600 italic">No known dependents.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "code" && (
              <div className="space-y-6">
                {detail.signature && (
                  <div>
                    <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-3">Signature</div>
                    <pre className="p-4 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto text-[13px] font-mono text-indigo-300">
                      {detail.signature}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-3">Source Code</div>
                  <pre className="p-4 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-x-auto text-[13px] font-mono text-zinc-400 leading-relaxed custom-scrollbar">
                    {detail.source_code}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-indigo-400 font-medium mb-2">
                    <GitCommit className="w-4 h-4" /> Temporal Intelligence
                  </div>
                  <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
                    Git miner tracing for exact commits modifying this symbol.
                  </p>
                  
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-white/10">
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-[#111111] bg-indigo-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-[#181818] shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[12px] font-bold text-indigo-400">feat: support multiple LLMs</span>
                          <span className="text-[11px] font-medium text-zinc-500">3 days ago</span>
                        </div>
                        <div className="text-[13px] text-zinc-300">Modified signature to accept LLM config.</div>
                      </div>
                    </div>
                    
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-[#111111] bg-zinc-700 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-[#181818] shadow-lg opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[12px] font-bold text-zinc-400">Initial commit</span>
                          <span className="text-[11px] font-medium text-zinc-500">1 week ago</span>
                        </div>
                        <div className="text-[13px] text-zinc-500">Introduced symbol.</div>
                      </div>
                    </div>
                  </div>
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
