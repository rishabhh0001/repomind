"""Natural language query endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm_service import LLMService
from app.models.database import get_db
from app.models.orm import Edge, Repository, Symbol
from app.models.schemas import QueryRequest, QueryResponse

router = APIRouter()
llm_service = LLMService()


@router.post("", response_model=QueryResponse)
async def query_repository(
    request: QueryRequest, db: AsyncSession = Depends(get_db)
) -> QueryResponse:
    """Ask a natural language question about the repository."""
    # Verify repo exists
    repo_result = await db.execute(
        select(Repository).where(Repository.id == request.repo_id)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # In a full implementation, this would:
    # 1. Embed the query
    # 2. Vector search the embeddings table for relevant symbols
    # 3. Retrieve graph neighborhood for those symbols
    # 4. Construct context string
    
    # For MVP, we'll construct a simplified context with top symbols
    # (Just fetching some random symbols for now to simulate RAG context)
    symbols_result = await db.execute(
        select(Symbol).where(Symbol.repo_id == request.repo_id).limit(50)
    )
    symbols = symbols_result.scalars().all()
    
    context_parts = []
    for s in symbols:
        context_parts.append(f"Symbol: {s.qualified_name} ({s.symbol_type})")
        if s.docstring:
            context_parts.append(f"Doc: {s.docstring}")
        if s.signature:
            context_parts.append(f"Sig: {s.signature}")
        context_parts.append("")
        
    context_str = "\n".join(context_parts)

    try:
        result = await llm_service.query(request.question, context_str)
        
        # Build response
        flow_nodes = []
        flow_edges = []
        
        if result.get("flow"):
            flow = result["flow"]
            flow_nodes = flow.get("nodes", [])
            flow_edges = flow.get("edges", [])
            
        return QueryResponse(
            answer=result["answer"],
            flow_nodes=flow_nodes,
            flow_edges=flow_edges,
            confidence=0.85,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
