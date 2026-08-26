"""Code graph and node detail endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import get_db
from app.models.orm import Commit, Edge, Repository, Symbol, SymbolCommit
from app.models.schemas import (
    CommitResponse,
    GraphEdge,
    GraphNode,
    GraphResponse,
    SymbolDetail,
    SymbolHistoryResponse,
)

router = APIRouter()


async def _fetch_symbol_detail(query: str, db: AsyncSession) -> SymbolDetail:
    """Fetch symbol detail with robust fallback strategies."""
    stmt = (
        select(Symbol)
        .options(
            selectinload(Symbol.outgoing_edges).selectinload(Edge.target),
            selectinload(Symbol.incoming_edges).selectinload(Edge.source),
            selectinload(Symbol.symbol_commits).selectinload(SymbolCommit.commit),
        )
    )

    clean_query = query.strip()
    symbol = None

    # 1. By integer primary key
    if clean_query.isdigit():
        result = await db.execute(stmt.where(Symbol.id == int(clean_query)))
        symbol = result.scalar_one_or_none()

    # 2. By exact qualified_name
    if not symbol:
        result = await db.execute(stmt.where(Symbol.qualified_name == clean_query))
        symbol = result.scalar_one_or_none()

    # 3. By cleaned qualified_name (strip whitespace and common trailing artifacts)
    if not symbol:
        sanitized = clean_query.split("(")[0].strip()
        result = await db.execute(stmt.where(Symbol.qualified_name == sanitized))
        symbol = result.scalar_one_or_none()

    # 4. By exact symbol name
    if not symbol:
        result = await db.execute(stmt.where(Symbol.name == clean_query))
        symbol = result.scalars().first()

    # 5. By suffix or partial match
    if not symbol and "." in clean_query:
        last_part = clean_query.split(".")[-1].split("(")[0].strip()
        if last_part:
            result = await db.execute(stmt.where(Symbol.name == last_part))
            symbol = result.scalars().first()

    if not symbol:
        raise HTTPException(status_code=404, detail=f"Symbol '{clean_query}' not found")

    dependencies = [
        {
            "id": edge.target.id,
            "qualified_name": edge.target.qualified_name,
            "type": edge.edge_type.value,
            "symbol_type": edge.target.symbol_type.value,
        }
        for edge in symbol.outgoing_edges
        if edge.target
    ]

    dependents = [
        {
            "id": edge.source.id,
            "qualified_name": edge.source.qualified_name,
            "type": edge.edge_type.value,
            "symbol_type": edge.source.symbol_type.value,
        }
        for edge in symbol.incoming_edges
        if edge.source
    ]

    commits = []
    if symbol.symbol_commits:
        for sc in symbol.symbol_commits:
            if sc.commit:
                commits.append({
                    "sha": sc.commit.sha,
                    "author_name": sc.commit.author_name or "Unknown",
                    "author_email": sc.commit.author_email or "",
                    "message": sc.commit.message or "",
                    "committed_at": sc.commit.committed_at.isoformat() if sc.commit.committed_at else None,
                    "is_introduction": bool(sc.is_introduction),
                    "files_changed": sc.commit.files_changed or 0,
                    "insertions": sc.commit.insertions or 0,
                    "deletions": sc.commit.deletions or 0,
                })

    return SymbolDetail(
        id=symbol.id,
        name=symbol.name,
        qualified_name=symbol.qualified_name,
        symbol_type=symbol.symbol_type.value,
        language=symbol.language,
        file_path=symbol.file_path,
        line_start=symbol.line_start,
        line_end=symbol.line_end,
        docstring=symbol.docstring,
        signature=symbol.signature,
        source_code=symbol.source_code,
        dependencies=dependencies,
        dependents=dependents,
        commits=commits,
    )


# NOTE: Specific routes MUST come before /{repo_id} to prevent FastAPI
# from matching "node-detail" or "nodes" as an integer repo_id (→ 422).

@router.get("/node-detail", response_model=SymbolDetail)
async def get_node_detail_by_query(
    id_or_name: str, db: AsyncSession = Depends(get_db)
) -> SymbolDetail:
    """Get detailed information about a single code symbol using query parameters."""
    return await _fetch_symbol_detail(id_or_name, db)


@router.get("/nodes/{symbol_id_or_name:path}", response_model=SymbolDetail)
async def get_node_detail(
    symbol_id_or_name: str, db: AsyncSession = Depends(get_db)
) -> SymbolDetail:
    """Get detailed information about a single code symbol by path parameter."""
    return await _fetch_symbol_detail(symbol_id_or_name, db)


@router.get("/{repo_id}", response_model=GraphResponse)
async def get_graph(repo_id: int, db: AsyncSession = Depends(get_db)) -> GraphResponse:
    """Get the full code graph for a repository."""
    # Verify repo
    repo_result = await db.execute(
        select(Repository).where(Repository.id == repo_id)
    )
    if not repo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Repository not found")

    # Fetch symbols
    symbols_result = await db.execute(
        select(Symbol).where(Symbol.repo_id == repo_id)
    )
    symbols = symbols_result.scalars().all()

    # Fetch edges
    edges_result = await db.execute(
        select(Edge).where(Edge.repo_id == repo_id).options(
            selectinload(Edge.source),
            selectinload(Edge.target)
        )
    )
    edges = edges_result.scalars().all()

    nodes = [
        GraphNode(
            id=s.qualified_name,
            label=s.name,
            symbol_type=s.symbol_type.value,
            file_path=s.file_path,
            line_start=s.line_start,
            line_end=s.line_end,
            language=s.language,
            docstring=s.docstring,
            parent_id=s.parent.qualified_name if s.parent else None,
        )
        for s in symbols
    ]

    graph_edges = [
        GraphEdge(
            id=str(e.id),
            source=e.source.qualified_name,
            target=e.target.qualified_name,
            edge_type=e.edge_type.value,
            weight=e.weight,
        )
        for e in edges
        if e.source and e.target
    ]

    return GraphResponse(
        repo_id=repo_id,
        nodes=nodes,
        edges=graph_edges,
        stats={
            "nodes": len(nodes),
            "edges": len(graph_edges),
        },
    )

