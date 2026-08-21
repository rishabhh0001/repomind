"""Code graph builder — transforms parsed symbols into a queryable graph.

Takes the flat symbol table from the parser and builds a directed graph
where nodes are code symbols and edges represent relationships
(calls, imports, inheritance, etc.).
"""

import json
import logging
from dataclasses import dataclass, field

from app.core.parser import ParsedFile, ParsedSymbol

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    """A node in the code graph."""

    id: str  # qualified_name
    label: str
    symbol_type: str
    file_path: str
    line_start: int
    line_end: int
    language: str
    docstring: str | None = None
    signature: str | None = None
    parent_id: str | None = None


@dataclass
class GraphEdge:
    """An edge in the code graph."""

    source: str  # qualified_name of source
    target: str  # qualified_name of target
    edge_type: str  # calls, imports, inherits, contains, etc.
    weight: float = 1.0
    metadata: dict | None = None


@dataclass
class CodeGraph:
    """The complete code graph for a repository."""

    nodes: dict[str, GraphNode] = field(default_factory=dict)
    edges: list[GraphEdge] = field(default_factory=list)

    # Indexes for fast lookup
    _by_name: dict[str, list[str]] = field(default_factory=dict)
    _by_file: dict[str, list[str]] = field(default_factory=dict)

    def add_node(self, node: GraphNode) -> None:
        """Add a node to the graph."""
        self.nodes[node.id] = node

        # Index by simple name
        simple_name = node.label
        if simple_name not in self._by_name:
            self._by_name[simple_name] = []
        self._by_name[simple_name].append(node.id)

        # Index by file
        if node.file_path not in self._by_file:
            self._by_file[node.file_path] = []
        self._by_file[node.file_path].append(node.id)

    def add_edge(self, edge: GraphEdge) -> None:
        """Add an edge to the graph, deduplicating."""
        # Avoid self-loops
        if edge.source == edge.target:
            return
        # Only add if both nodes exist
        if edge.source not in self.nodes or edge.target not in self.nodes:
            return
        # Dedup
        for existing in self.edges:
            if (
                existing.source == edge.source
                and existing.target == edge.target
                and existing.edge_type == edge.edge_type
            ):
                return
        self.edges.append(edge)

    def resolve_name(self, name: str, context_module: str | None = None) -> str | None:
        """Resolve a simple name to a qualified name.

        Tries: exact match → same module → by simple name.
        """
        # Exact match
        if name in self.nodes:
            return name

        # Dotted name — try to resolve progressively
        if "." in name:
            parts = name.split(".")
            # Try last part as simple name
            simple = parts[-1]
            if simple in self._by_name:
                candidates = self._by_name[simple]
                # Prefer candidates in same module
                if context_module:
                    for c in candidates:
                        if c.startswith(context_module):
                            return c
                if candidates:
                    return candidates[0]

        # Simple name lookup
        if name in self._by_name:
            candidates = self._by_name[name]
            if context_module:
                for c in candidates:
                    if c.startswith(context_module):
                        return c
            if candidates:
                return candidates[0]

        return None

    def get_callers(self, node_id: str) -> list[GraphEdge]:
        """Get all edges pointing TO this node."""
        return [e for e in self.edges if e.target == node_id]

    def get_callees(self, node_id: str) -> list[GraphEdge]:
        """Get all edges pointing FROM this node."""
        return [e for e in self.edges if e.source == node_id]

    def to_dict(self) -> dict:
        """Serialize the graph to a dictionary for API responses."""
        return {
            "nodes": [
                {
                    "id": n.id,
                    "label": n.label,
                    "symbol_type": n.symbol_type,
                    "file_path": n.file_path,
                    "line_start": n.line_start,
                    "line_end": n.line_end,
                    "language": n.language,
                    "docstring": n.docstring,
                    "parent_id": n.parent_id,
                }
                for n in self.nodes.values()
            ],
            "edges": [
                {
                    "source": e.source,
                    "target": e.target,
                    "edge_type": e.edge_type,
                    "weight": e.weight,
                }
                for e in self.edges
            ],
        }


class GraphBuilder:
    """Builds a code graph from parsed files."""

    def build(self, parsed_files: list[ParsedFile]) -> CodeGraph:
        """Build the complete code graph.

        Steps:
        1. Create nodes for all symbols
        2. Resolve containment edges (class contains method)
        3. Resolve call edges (function calls function)
        4. Resolve inheritance edges (class extends class)
        5. Resolve import edges
        """
        graph = CodeGraph()

        # Step 1: Create all nodes
        all_symbols: list[ParsedSymbol] = []
        for pf in parsed_files:
            for symbol in pf.symbols:
                self._add_symbol_nodes(graph, symbol)
                all_symbols.append(symbol)
                for child in symbol.children:
                    all_symbols.append(child)

        logger.info(f"Graph: {len(graph.nodes)} nodes")

        # Step 2: Containment edges
        for symbol in all_symbols:
            if symbol.parent_qualified_name and symbol.parent_qualified_name in graph.nodes:
                graph.add_edge(
                    GraphEdge(
                        source=symbol.parent_qualified_name,
                        target=symbol.qualified_name,
                        edge_type="contains",
                    )
                )

        # Step 3: Call edges
        for symbol in all_symbols:
            module_name = symbol.qualified_name.rsplit(".", 1)[0] if "." in symbol.qualified_name else ""
            for call in symbol.calls:
                target = graph.resolve_name(call, context_module=module_name)
                if target:
                    graph.add_edge(
                        GraphEdge(
                            source=symbol.qualified_name,
                            target=target,
                            edge_type="calls",
                        )
                    )

        # Step 4: Inheritance edges
        for symbol in all_symbols:
            if symbol.bases:
                module_name = symbol.qualified_name.rsplit(".", 1)[0] if "." in symbol.qualified_name else ""
                for base in symbol.bases:
                    target = graph.resolve_name(base, context_module=module_name)
                    if target:
                        graph.add_edge(
                            GraphEdge(
                                source=symbol.qualified_name,
                                target=target,
                                edge_type="inherits",
                            )
                        )

        # Step 5: Import edges (module-level)
        for pf in parsed_files:
            module_name = pf.file_path.replace("/", ".").rsplit(".", 1)[0]
            for imp in pf.imports:
                # Extract module name from import statement
                imported_module = self._parse_import(imp, pf.language)
                if imported_module:
                    target = graph.resolve_name(imported_module)
                    if target:
                        graph.add_edge(
                            GraphEdge(
                                source=module_name,
                                target=target,
                                edge_type="imports",
                            )
                        )

        logger.info(f"Graph: {len(graph.edges)} edges")
        return graph

    def _add_symbol_nodes(self, graph: CodeGraph, symbol: ParsedSymbol) -> None:
        """Recursively add a symbol and its children as graph nodes."""
        graph.add_node(
            GraphNode(
                id=symbol.qualified_name,
                label=symbol.name,
                symbol_type=symbol.symbol_type,
                file_path=symbol.file_path,
                line_start=symbol.line_start,
                line_end=symbol.line_end,
                language=symbol.language,
                docstring=symbol.docstring,
                signature=symbol.signature,
                parent_id=symbol.parent_qualified_name,
            )
        )
        for child in symbol.children:
            self._add_symbol_nodes(graph, child)

    def _parse_import(self, import_str: str, language: str) -> str | None:
        """Extract the imported module name from an import statement."""
        import_str = import_str.strip()

        if language == "python":
            # "from foo.bar import baz" → "foo.bar"
            if import_str.startswith("from "):
                parts = import_str.split()
                if len(parts) >= 2:
                    return parts[1]
            # "import foo.bar" → "foo.bar"
            elif import_str.startswith("import "):
                parts = import_str.split()
                if len(parts) >= 2:
                    return parts[1].split(",")[0].strip()

        elif language in ("javascript", "typescript"):
            # "import { x } from './foo'" → extract path
            if "from" in import_str:
                parts = import_str.split("from")
                if len(parts) >= 2:
                    path = parts[-1].strip().strip("'\"`;")
                    return path

        return None
