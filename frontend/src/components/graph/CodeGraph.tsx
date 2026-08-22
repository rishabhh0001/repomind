"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Box, Code2, Database, Layout } from "lucide-react";

const CustomSymbolNode = ({ data, selected }: { data: any, selected?: boolean }) => {
  const Icon = data.symbol_type === "class" ? Box :
               data.symbol_type === "function" ? Code2 :
               data.symbol_type === "endpoint" ? Layout : Database;

  return (
    <div className={`px-4 py-3 shadow-xl rounded-xl bg-[#111111] border transition-all duration-300 min-w-[180px] relative group ${selected ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/30'}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-indigo-500 !border-2 !border-[#111111] transition-transform group-hover:scale-125" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
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
};

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

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
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
        <Background gap={24} size={2} color="hsl(var(--muted-foreground) / 0.2)" />
        <Controls className="bg-card border-border fill-foreground text-foreground" />
        <MiniMap 
          nodeStrokeColor="hsl(var(--border))"
          nodeColor="hsl(var(--card))"
          maskColor="hsl(var(--background) / 0.7)"
          className="bg-background border border-border rounded-lg shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}
