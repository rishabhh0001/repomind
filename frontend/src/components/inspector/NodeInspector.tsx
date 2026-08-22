"use client";

import { useEffect, useState } from "react";
import { getNodeDetail } from "@/lib/api";
import { useStore } from "@/lib/store";
import { X, Code2, Database, Layout, Box, ArrowRight, ArrowLeft, GitCommit, FileText, Loader2 } from "lucide-react";

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
    <div className="flex flex-col h-full text-sm">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="font-semibold text-lg flex items-center gap-2 truncate">
          <Code2 className="w-5 h-5 text-primary" />
          <span className="truncate">{detail?.name || selectedNodeId}</span>
        </h2>
        <button 
          onClick={() => setInspectorOpen(false)}
          className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-border bg-card px-4 pt-2">
        {(["info", "code", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            
            {activeTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Type</div>
                    <div className="font-medium capitalize">{detail.symbol_type}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">File</div>
                    <div className="font-mono text-xs text-primary truncate" title={detail.file_path}>
                      {detail.file_path}:{detail.line_start}
                    </div>
                  </div>
                </div>

                {detail.docstring && (
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Documentation
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg text-secondary-foreground text-xs whitespace-pre-wrap">
                      {detail.docstring}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase mb-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Calls / Dependencies
                    </div>
                    {detail.dependencies?.length > 0 ? (
                      <ul className="space-y-2">
                        {detail.dependencies.map((dep: any, i: number) => (
                          <li key={i} className="bg-card border border-border p-2 rounded flex items-center gap-2 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setSelectedNodeId(dep.qualified_name)}>
                            <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                              {dep.qualified_name}
                            </div>
                            <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                              {dep.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">No known dependencies.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs uppercase mb-2 flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Called By / Dependents
                    </div>
                    {detail.dependents?.length > 0 ? (
                      <ul className="space-y-2">
                        {detail.dependents.map((dep: any, i: number) => (
                          <li key={i} className="bg-card border border-border p-2 rounded flex items-center gap-2 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setSelectedNodeId(dep.qualified_name)}>
                            <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                              {dep.qualified_name}
                            </div>
                            <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                              {dep.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">No known dependents.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "code" && (
              <div className="space-y-4">
                {detail.signature && (
                  <div>
                    <div className="text-muted-foreground text-xs uppercase mb-2">Signature</div>
                    <pre className="p-3 bg-card border border-border rounded-lg overflow-x-auto text-xs font-mono text-foreground">
                      {detail.signature}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground text-xs uppercase mb-2">Source Code</div>
                  <pre className="p-4 bg-zinc-950 border border-border rounded-lg overflow-x-auto text-xs font-mono text-zinc-300">
                    {detail.source_code}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-primary font-medium mb-2">
                    <GitCommit className="w-4 h-4" /> Temporal Intelligence
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Git miner tracing for exact commits modifying this symbol.
                  </p>
                  
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {/* Mock history entries */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-primary text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border bg-card shadow">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-primary">feat: support multiple LLMs</span>
                          <span className="text-[10px] text-muted-foreground">3 days ago</span>
                        </div>
                        <div className="text-xs text-foreground">Modified signature to accept LLM config.</div>
                      </div>
                    </div>
                    
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-secondary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border bg-card shadow opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-foreground">Initial commit</span>
                          <span className="text-[10px] text-muted-foreground">1 week ago</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Introduced symbol.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            Select a node in the graph to view details.
          </div>
        )}
      </div>
    </div>
  );
}
