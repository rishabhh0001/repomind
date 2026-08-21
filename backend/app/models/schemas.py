"""Pydantic schemas for API request/response models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


# ─── Repository ──────────────────────────────────────────────────────────

class RepoImportRequest(BaseModel):
    """Request to import a repository."""

    url: str = Field(..., description="GitHub URL or local path", max_length=1024)
    branch: str = Field(default="main", max_length=255)


class RepoResponse(BaseModel):
    """Repository information response."""

    id: int
    name: str
    url: str | None
    status: str
    error_message: str | None = None
    total_files: int
    total_symbols: int
    total_edges: int
    total_commits: int
    languages: list[str]
    created_at: datetime
    indexed_at: datetime | None

    model_config = {"from_attributes": True}


class RepoListResponse(BaseModel):
    """List of repositories."""

    repositories: list[RepoResponse]
    total: int


# ─── Query ───────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    """Natural language query about a repository."""

    repo_id: int
    question: str = Field(..., min_length=1, max_length=2000)


class FlowNode(BaseModel):
    """A node in a generated flow diagram."""

    id: str
    label: str
    type: str  # class, function, endpoint, database, etc.
    file_path: str | None = None
    line_start: int | None = None
    symbol_id: int | None = None
    description: str | None = None


class FlowEdge(BaseModel):
    """An edge in a generated flow diagram."""

    source: str
    target: str
    label: str | None = None
    edge_type: str = "calls"


class QueryResponse(BaseModel):
    """Response to a natural language query."""

    answer: str
    flow_nodes: list[FlowNode] = []
    flow_edges: list[FlowEdge] = []
    sources: list[dict[str, Any]] = []  # Referenced files/symbols
    confidence: float = 0.0


# ─── Graph ───────────────────────────────────────────────────────────────

class GraphNode(BaseModel):
    """A node in the code graph."""

    id: str
    label: str
    symbol_type: str
    file_path: str
    line_start: int
    line_end: int
    language: str
    docstring: str | None = None
    parent_id: str | None = None


class GraphEdge(BaseModel):
    """An edge in the code graph."""

    id: str
    source: str
    target: str
    edge_type: str
    weight: float = 1.0


class GraphResponse(BaseModel):
    """Full code graph for a repository."""

    repo_id: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    stats: dict[str, int]


# ─── Node Detail ─────────────────────────────────────────────────────────

class SymbolDetail(BaseModel):
    """Detailed information about a code symbol."""

    id: int
    name: str
    qualified_name: str
    symbol_type: str
    language: str
    file_path: str
    line_start: int
    line_end: int
    docstring: str | None = None
    signature: str | None = None
    source_code: str | None = None

    # Relationships
    callers: list[dict[str, Any]] = []
    callees: list[dict[str, Any]] = []
    dependencies: list[dict[str, Any]] = []
    dependents: list[dict[str, Any]] = []

    # Git history
    commits: list[dict[str, Any]] = []
    introduced_by: dict[str, Any] | None = None
    modification_count: int = 0
    last_modified: datetime | None = None


# ─── Git History ─────────────────────────────────────────────────────────

class CommitResponse(BaseModel):
    """Git commit information."""

    sha: str
    author_name: str | None
    author_email: str | None
    message: str | None
    committed_at: datetime | None
    files_changed: int
    insertions: int
    deletions: int
    linked_issue: str | None = None
    linked_pr: str | None = None
    is_introduction: bool = False

    model_config = {"from_attributes": True}


class SymbolHistoryResponse(BaseModel):
    """Temporal code intelligence for a symbol."""

    symbol_id: int
    symbol_name: str
    introduced_in: CommitResponse | None = None
    total_modifications: int
    commits: list[CommitResponse]
    risk_score: float = 0.0  # Higher = more churn = more risk


# ─── Progress ────────────────────────────────────────────────────────────

class IndexingProgress(BaseModel):
    """Real-time indexing progress update."""

    repo_id: int
    status: str
    step: str
    progress: float  # 0.0 to 1.0
    message: str
    details: dict[str, Any] = {}
