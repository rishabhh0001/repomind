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

// --- Custom Node Component ---
const CustomSymbolNode = ({ data }: { data: any }) => {
  const Icon = data.symbol_type === "class" ? Box :
               data.symbol_type === "function" ? Code2 :
               data.symbol_type === "endpoint" ? Layout : Database;

  return (
    <div className="px-4 py-2 shadow-xl rounded-lg bg-card border-2 border-border min-w-[150px] relative transition-transform hover:scale-105 hover:border-primary">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <div>
          <div className="font-mono text-xs font-bold text-foreground max-w-[200px] truncate" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
            {data.symbol_type}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
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
