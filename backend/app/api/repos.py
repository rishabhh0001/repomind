"""Repository management endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.indexer import Indexer
from app.models.database import get_db
from app.models.orm import RepoStatus, Repository
from app.models.schemas import RepoImportRequest, RepoListResponse, RepoResponse

router = APIRouter()
indexer = Indexer()


async def run_indexing_task(repo_id: int) -> None:
    """Background task to run indexing."""
    # We create a fresh session for the background task
    from app.models.database import async_session

    async with async_session() as db:
        try:
            await indexer.index_repository(db, repo_id)
        except Exception as e:
            # Error is already logged in the indexer
            pass


@router.post("/import", response_model=RepoResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_repository(
    request: RepoImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> RepoResponse:
    """Import and index a repository."""
    # Check if already exists
    result = await db.execute(
        select(Repository).where(Repository.url == request.url)
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.status in (RepoStatus.PENDING, RepoStatus.CLONING, RepoStatus.PARSING, RepoStatus.BUILDING_GRAPH, RepoStatus.MINING_GIT, RepoStatus.EMBEDDING):
            return existing
        # Re-index
        existing.status = RepoStatus.PENDING
        repo = existing
    else:
        # Create new
        name = request.url.split("/")[-1].replace(".git", "")
        repo = Repository(
            name=name,
            url=request.url,
            local_path="",  # Will be set by indexer
            default_branch=request.branch,
        )
        db.add(repo)

    await db.commit()
    await db.refresh(repo)

    background_tasks.add_task(run_indexing_task, repo.id)
    return repo


@router.get("", response_model=RepoListResponse)
async def list_repositories(db: AsyncSession = Depends(get_db)) -> RepoListResponse:
    """List all tracked repositories."""
    result = await db.execute(select(Repository).order_by(Repository.created_at.desc()))
    repos = result.scalars().all()
    return RepoListResponse(repositories=repos, total=len(repos))


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repository(repo_id: int, db: AsyncSession = Depends(get_db)) -> RepoResponse:
    """Get repository status and stats."""
    result = await db.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo
