"""ORM models for RepoMind."""

import enum
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.config import get_settings
from app.models.database import Base

settings = get_settings()


class RepoStatus(str, enum.Enum):
    """Repository indexing status."""

    PENDING = "pending"
    CLONING = "cloning"
    PARSING = "parsing"
    BUILDING_GRAPH = "building_graph"
    MINING_GIT = "mining_git"
    EMBEDDING = "embedding"
    READY = "ready"
    ERROR = "error"


class SymbolType(str, enum.Enum):
    """Type of code symbol."""

    MODULE = "module"
    CLASS = "class"
    FUNCTION = "function"
    METHOD = "method"
    VARIABLE = "variable"
    IMPORT = "import"
    ENDPOINT = "endpoint"
    DATABASE_TABLE = "database_table"
    INTERFACE = "interface"
    TYPE_ALIAS = "type_alias"


class EdgeType(str, enum.Enum):
    """Type of relationship between symbols."""

    CALLS = "calls"
    IMPORTS = "imports"
    INHERITS = "inherits"
    IMPLEMENTS = "implements"
    USES = "uses"
    CONTAINS = "contains"
    DEPENDS_ON = "depends_on"
    EXPOSES_ENDPOINT = "exposes_endpoint"
    QUERIES_TABLE = "queries_table"


class Repository(Base):
    """A tracked repository."""

    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=True)
    local_path = Column(String(1024), nullable=False)
    default_branch = Column(String(255), default="main")
    status = Column(Enum(RepoStatus), default=RepoStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)

    # Stats
    total_files = Column(Integer, default=0)
    total_symbols = Column(Integer, default=0)
    total_edges = Column(Integer, default=0)
    total_commits = Column(Integer, default=0)
    languages = Column(Text, default="")  # JSON array of languages

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    indexed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    symbols = relationship("Symbol", back_populates="repository", cascade="all, delete")
    commits = relationship("Commit", back_populates="repository", cascade="all, delete")


class Symbol(Base):
    """A code symbol (class, function, method, etc.)."""

    __tablename__ = "symbols"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(512), nullable=False)
    qualified_name = Column(String(1024), nullable=False)  # e.g., "module.ClassName.method"
    symbol_type = Column(Enum(SymbolType), nullable=False)
    language = Column(String(50), nullable=False)

    # Location
    file_path = Column(String(1024), nullable=False)
    line_start = Column(Integer, nullable=False)
    line_end = Column(Integer, nullable=False)

    # Metadata
    docstring = Column(Text, nullable=True)
    signature = Column(Text, nullable=True)
    source_code = Column(Text, nullable=True)

    # Hierarchy
    parent_id = Column(Integer, ForeignKey("symbols.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    repository = relationship("Repository", back_populates="symbols")
    parent = relationship("Symbol", remote_side="Symbol.id", backref="children")
    outgoing_edges = relationship(
        "Edge", foreign_keys="Edge.source_id", back_populates="source", cascade="all, delete"
    )
    incoming_edges = relationship(
        "Edge", foreign_keys="Edge.target_id", back_populates="target", cascade="all, delete"
    )
    symbol_commits = relationship(
        "SymbolCommit", back_populates="symbol", cascade="all, delete"
    )

    __table_args__ = (
        Index("idx_symbols_repo_id", "repo_id"),
        Index("idx_symbols_qualified_name", "qualified_name"),
        Index("idx_symbols_file_path", "file_path"),
    )


class Edge(Base):
    """A relationship between two symbols."""

    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    edge_type = Column(Enum(EdgeType), nullable=False)
    weight = Column(Float, default=1.0)
    metadata_json = Column(Text, nullable=True)  # Additional context as JSON

    # Relationships
    source = relationship("Symbol", foreign_keys=[source_id], back_populates="outgoing_edges")
    target = relationship("Symbol", foreign_keys=[target_id], back_populates="incoming_edges")

    __table_args__ = (
        Index("idx_edges_source", "source_id"),
        Index("idx_edges_target", "target_id"),
        Index("idx_edges_repo", "repo_id"),
        UniqueConstraint("source_id", "target_id", "edge_type", name="uq_edge"),
    )


class Embedding(Base):
    """Vector embedding for a code symbol."""

    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol_id = Column(
        Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    content = Column(Text, nullable=False)  # The text that was embedded
    embedding = Column(Vector(settings.embedding_dimension), nullable=False)

    # Relationships
    symbol = relationship("Symbol")


class Commit(Base):
    """A git commit in a repository."""

    __tablename__ = "commits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)

    sha = Column(String(40), nullable=False)
    author_name = Column(String(255), nullable=True)
    author_email = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    committed_at = Column(DateTime(timezone=True), nullable=True)

    # Stats
    files_changed = Column(Integer, default=0)
    insertions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)

    # Linked issue/PR (extracted from commit message)
    linked_issue = Column(String(255), nullable=True)
    linked_pr = Column(String(255), nullable=True)

    # Relationships
    repository = relationship("Repository", back_populates="commits")

    __table_args__ = (
        Index("idx_commits_repo", "repo_id"),
        UniqueConstraint("repo_id", "sha", name="uq_commit_sha"),
    )


class SymbolCommit(Base):
    """Junction: which commits touched which symbols."""

    __tablename__ = "symbol_commits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    commit_id = Column(Integer, ForeignKey("commits.id", ondelete="CASCADE"), nullable=False)
    is_introduction = Column(Boolean, default=False)  # Was this the commit that introduced the symbol?
    lines_changed = Column(Integer, default=0)

    # Relationships
    symbol = relationship("Symbol", back_populates="symbol_commits")
    commit = relationship("Commit")

    __table_args__ = (
        UniqueConstraint("symbol_id", "commit_id", name="uq_symbol_commit"),
        Index("idx_symbol_commits_symbol", "symbol_id"),
    )
