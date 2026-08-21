"""API routers."""

from fastapi import APIRouter

from app.api import graph, query, repos

api_router = APIRouter()

api_router.include_router(repos.router, prefix="/repos", tags=["Repositories"])
api_router.include_router(query.router, prefix="/query", tags=["Query"])
api_router.include_router(graph.router, prefix="/graph", tags=["Graph"])
