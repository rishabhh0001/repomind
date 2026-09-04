"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { getGraph } from "@/lib/api";
import { useStore } from "@/lib/store";
import { MaterialIcon } from "@/components/ui/material-icon";

// ⚡ Bolt Optimization: Memoized CustomSymbolNode using React.memo.
// 🎯 Why: React Flow re-renders nodes frequently (e.g., during panning or other node updates).
// 📊 Impact: Prevents expensive re-renders of nodes whose props haven't changed,
// significantly improving graph interaction performance.
const CustomSymbolNode = React.memo(({ data, selected }: { data: any, selected?: boolean }) => {
  const iconName = data.symbol_type === "class" ? "inventory_2" :
                   data.symbol_type === "function" ? "code" :
                   data.symbol_type === "endpoint" ? "api" : "database";

  return (
    <div className={`px-4 py-3 shadow-xl rounded-xl bg-[#111111] border transition-all duration-300 min-w-[180px] relative group ${selected ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/30'}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-indigo-500 !border-2 !border-[#111111] transition-transform group-hover:scale-125" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
          <MaterialIcon name={iconName} size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs font-semibold text-white max-w-[180px] truncate" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">
            {data.symbol_type}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-indigo-500 !border-2 !border-[#111111] transition-transform group-hover:scale-125" />
    </div>
  );
});
CustomSymbolNode.displayName = "CustomSymbolNode";

const nodeTypes = {
  customSymbol: CustomSymbolNode,
};

// --- Auto Layout Engine ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // A standard node size for dagre
  const nodeWidth = 200;
  const nodeHeight = 60;

  dagreGraph.setGraph({ rankdir: direction });

  const nodeIds = new Set(nodes.map(n => n.id));
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  validEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  try {
    dagre.layout(dagreGraph);
  } catch (err) {
    console.error("Dagre layout error:", err);
  }

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - nodeWidth / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - nodeHeight / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges: validEdges };
};

export default function CodeGraph({ repoId }: { repoId: number }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  useEffect(() => {
    async function loadGraph() {
      try {
        const data = await getGraph(repoId);
        
        // Map backend API data to React Flow format
        const initialNodes: Node[] = data.nodes.map((n: any) => ({
          id: n.id,
          type: "customSymbol",
          data: { label: n.label, symbol_type: n.symbol_type, file_path: n.file_path },
          position: { x: 0, y: 0 },
        }));

        const initialEdges: Edge[] = data.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.edge_type === "calls",
          style: { strokeWidth: Math.max(1, (e.weight || 1) * 2) },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          initialNodes,
          initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (err) {
        console.error("Failed to load graph", err);
      }
    }
    loadGraph();
  }, [repoId, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="w-full h-full absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        minZoom={0.1}
      >
        <Background gap={24} size={2} color="rgba(255, 255, 255, 0.05)" />
        <Controls className="overflow-hidden rounded-lg border border-white/10 shadow-xl [&_button]:!bg-[#181818] [&_button]:!border-b-white/5 [&_button]:!fill-zinc-400 hover:[&_button]:!bg-white/5 hover:[&_button]:!fill-white transition-colors" />
        <MiniMap 
          nodeStrokeColor="rgba(255,255,255,0.1)"
          nodeColor="#111111"
          maskColor="rgba(17, 17, 17, 0.8)"
          className="!bg-[#181818] border border-white/10 rounded-lg shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}
