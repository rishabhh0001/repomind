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

    from app.core.embeddings import EmbeddingService
    from app.models.orm import Embedding
    from sqlalchemy.orm import selectinload

    embedding_service = EmbeddingService()
    try:
        # 1. Embed the query
        question_embedding = await embedding_service.generate(request.question)
        
        # 2. Vector search the embeddings table for relevant symbols
        # Using cosine_distance (<=>) with pgvector to find top 10
        embeddings_result = await db.execute(
            select(Embedding)
            .join(Symbol)
            .where(Symbol.repo_id == request.repo_id)
            .order_by(Embedding.embedding.cosine_distance(question_embedding))
            .limit(10)
        )
        top_embeddings = embeddings_result.scalars().all()

        if not top_embeddings:
            context_str = "No relevant context found in the codebase."
        else:
            # 3. Retrieve graph neighborhood for those symbols
            symbol_ids = [emb.symbol_id for emb in top_embeddings]
            symbols_result = await db.execute(
                select(Symbol)
                .options(
                    selectinload(Symbol.outgoing_edges).selectinload(Edge.target),
                    selectinload(Symbol.incoming_edges).selectinload(Edge.source)
                )
                .where(Symbol.id.in_(symbol_ids))
            )
            symbols_unsorted = symbols_result.scalars().all()

            # Re-sort based on the original similarity order
            symbols_by_id = {s.id: s for s in symbols_unsorted}
            symbols = [symbols_by_id[sid] for sid in symbol_ids if sid in symbols_by_id]

            # 4. Construct context string
            context_parts = []
            for s in symbols:
                context_parts.append(f"Symbol: {s.qualified_name} ({s.symbol_type})")
                if s.signature:
                    context_parts.append(f"Signature: {s.signature}")
                if s.docstring:
                    context_parts.append(f"Docstring: {s.docstring}")

                dependencies = [e.target.qualified_name for e in s.outgoing_edges if e.target]
                if dependencies:
                    context_parts.append(f"Dependencies (Calls/Uses): {', '.join(dependencies)}")

                dependents = [e.source.qualified_name for e in s.incoming_edges if e.source]
                if dependents:
                    context_parts.append(f"Dependents (Called by): {', '.join(dependents)}")

                if s.source_code:
                    code = s.source_code
                    if len(code) > 1000:
                        code = code[:1000] + "... (truncated)"
                    context_parts.append(f"Code snippet:\n{code}")

                context_parts.append("---")

            context_str = "\n".join(context_parts)
    finally:
        await embedding_service.close()

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
        import traceback
        import logging
        logging.getLogger(__name__).error(f"Error querying LLM:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")
