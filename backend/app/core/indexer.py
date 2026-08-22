"""Repository indexer — orchestrates the full indexing pipeline.

Clones a repository, parses it with Tree-sitter, builds the code graph,
mines git history, generates embeddings, and stores everything in PostgreSQL.
"""

import json
import logging
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.embeddings import EmbeddingService
from app.core.git_miner import GitMiner
from app.core.graph_builder import CodeGraph, GraphBuilder
from app.core.parser import CodeParser
from app.models.orm import (
    Commit,
    Edge,
    EdgeType,
    Embedding,
    RepoStatus,
    Repository,
    Symbol,
    SymbolCommit,
    SymbolType,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class IndexingProgress:
    """Tracks and reports indexing progress."""

    def __init__(self, repo_id: int, callback: Callable | None = None):
        self.repo_id = repo_id
        self.callback = callback
        self.current_step = ""
        self.progress = 0.0
        self.message = ""

    async def update(self, step: str, progress: float, message: str) -> None:
        """Update progress and notify callback."""
        self.current_step = step
        self.progress = progress
        self.message = message
        logger.info(f"[Repo {self.repo_id}] {step}: {message} ({progress:.0%})")
        if self.callback:
            await self.callback(
                {
                    "repo_id": self.repo_id,
                    "status": "indexing",
                    "step": step,
                    "progress": progress,
                    "message": message,
                }
            )


class Indexer:
    """Orchestrates the full repository indexing pipeline."""

    def __init__(self) -> None:
        self.parser = CodeParser()
        self.graph_builder = GraphBuilder()
        self.embedding_service = EmbeddingService()

    async def index_repository(
        self,
        db: AsyncSession,
        repo_id: int,
        progress_callback: Callable | None = None,
    ) -> None:
        """Run the complete indexing pipeline for a repository.

        Pipeline:
        1. Clone (if remote URL)
        2. Parse → symbol table
        3. Build code graph
        4. Mine git history
        5. Generate embeddings
        6. Store everything in DB
        """
        progress = IndexingProgress(repo_id, progress_callback)

        # Fetch repo record
        result = await db.execute(select(Repository).where(Repository.id == repo_id))
        repo = result.scalar_one_or_none()
        if not repo:
            raise ValueError(f"Repository {repo_id} not found")

        try:
            # Step 1: Clone if needed
            await progress.update("cloning", 0.05, "Preparing repository...")
            repo.status = RepoStatus.CLONING
            await db.commit()

            repo_path = await self._ensure_cloned(repo)

            # Step 2: Parse
            await progress.update("parsing", 0.15, "Parsing source code with Tree-sitter...")
            repo.status = RepoStatus.PARSING
            await db.commit()

            parsed_files = self.parser.parse_repository(repo_path)
            languages = list(set(pf.language for pf in parsed_files))

            await progress.update(
                "parsing", 0.30,
                f"Parsed {len(parsed_files)} files, "
                f"{sum(len(pf.symbols) for pf in parsed_files)} symbols"
            )

            # Step 3: Build graph
            await progress.update("building_graph", 0.35, "Building code graph...")
            repo.status = RepoStatus.BUILDING_GRAPH
            await db.commit()

            graph = self.graph_builder.build(parsed_files)

            await progress.update(
                "building_graph", 0.45,
                f"Graph: {len(graph.nodes)} nodes, {len(graph.edges)} edges"
            )

            # Step 4: Store symbols and edges in DB
            await progress.update("building_graph", 0.50, "Storing symbols in database...")
            await self._clear_old_data(db, repo_id)
            symbol_id_map = await self._store_symbols(db, repo_id, graph)
            await self._store_edges(db, repo_id, graph, symbol_id_map)

            # Step 5: Mine git history
            await progress.update("mining_git", 0.55, "Mining git history...")
            repo.status = RepoStatus.MINING_GIT
            await db.commit()

            git_miner = GitMiner(repo_path)
            commits = git_miner.mine_commits(max_commits=100)
            await self._store_commits(db, repo_id, commits)

            await progress.update(
                "mining_git", 0.70, f"Mined {len(commits)} commits"
            )

            # Step 6: Generate embeddings
            await progress.update("embedding", 0.75, "Generating embeddings...")
            repo.status = RepoStatus.EMBEDDING
            await db.commit()

            await self._generate_embeddings(db, repo_id, graph, symbol_id_map)

            await progress.update("embedding", 0.95, "Embeddings complete")

            # Step 7: Update repo stats
            repo.status = RepoStatus.READY
            repo.total_files = len(parsed_files)
            repo.total_symbols = len(graph.nodes)
            repo.total_edges = len(graph.edges)
            repo.total_commits = len(commits)
            repo.languages = json.dumps(languages)
            repo.indexed_at = datetime.now(timezone.utc)
            await db.commit()

            await progress.update("complete", 1.0, "Indexing complete!")

        except Exception as e:
            logger.error(f"Indexing failed for repo {repo_id}: {e}", exc_info=True)
            repo.status = RepoStatus.ERROR
            repo.error_message = str(e)[:2000]
            await db.commit()
            raise

    async def _ensure_cloned(self, repo: Repository) -> str:
        """Ensure the repository is cloned locally."""
        if repo.url and repo.url.startswith(("http://", "https://", "git@")):
            # Clone from remote
            repos_dir = Path(settings.repos_dir)
            repos_dir.mkdir(parents=True, exist_ok=True)

            local_path = str(repos_dir / f"repo_{repo.id}")

            if Path(local_path).exists():
                shutil.rmtree(local_path)

            logger.info(f"Cloning {repo.url} to {local_path}")
            subprocess.run(
                ["git", "clone", "--depth", "100", repo.url, local_path],
                check=True,
                capture_output=True,
                timeout=300,
            )

            repo.local_path = local_path
            return local_path
        else:
            # Local path
            if not Path(repo.local_path).exists():
                raise FileNotFoundError(f"Repository path not found: {repo.local_path}")
            return repo.local_path

    async def _clear_old_data(self, db: AsyncSession, repo_id: int) -> None:
        """Clear existing data for a repo before re-indexing."""
        await db.execute(delete(Edge).where(Edge.repo_id == repo_id))
        await db.execute(delete(Symbol).where(Symbol.repo_id == repo_id))
        await db.execute(delete(Commit).where(Commit.repo_id == repo_id))
        await db.flush()

    async def _store_symbols(
        self, db: AsyncSession, repo_id: int, graph: CodeGraph
    ) -> dict[str, int]:
        """Store all symbols from the graph in the database.

        Returns a mapping from qualified_name → database ID.
        """
        symbol_id_map: dict[str, int] = {}

        for node in graph.nodes.values():
            # Map symbol type
            try:
                sym_type = SymbolType(node.symbol_type)
            except ValueError:
                sym_type = SymbolType.FUNCTION  # fallback

            symbol = Symbol(
                repo_id=repo_id,
                name=node.label,
                qualified_name=node.id,
                symbol_type=sym_type,
                language=node.language,
                file_path=node.file_path,
                line_start=node.line_start,
                line_end=node.line_end,
                docstring=node.docstring,
                signature=node.signature if hasattr(node, "signature") else None,
            )
            db.add(symbol)
            await db.flush()
            symbol_id_map[node.id] = symbol.id

        # Set parent IDs
        for node in graph.nodes.values():
            if node.parent_id and node.parent_id in symbol_id_map:
                symbol_id = symbol_id_map[node.id]
                result = await db.execute(
                    select(Symbol).where(Symbol.id == symbol_id)
                )
                symbol = result.scalar_one()
                symbol.parent_id = symbol_id_map[node.parent_id]

        await db.flush()
        logger.info(f"Stored {len(symbol_id_map)} symbols")
        return symbol_id_map

    async def _store_edges(
        self,
        db: AsyncSession,
        repo_id: int,
        graph: CodeGraph,
        symbol_id_map: dict[str, int],
    ) -> None:
        """Store all edges from the graph in the database."""
        edge_count = 0
        for edge in graph.edges:
            source_id = symbol_id_map.get(edge.source)
            target_id = symbol_id_map.get(edge.target)
            if source_id and target_id:
                try:
                    edge_type = EdgeType(edge.edge_type)
                except ValueError:
                    edge_type = EdgeType.USES

                db_edge = Edge(
                    repo_id=repo_id,
                    source_id=source_id,
                    target_id=target_id,
                    edge_type=edge_type,
                    weight=edge.weight,
                )
                db.add(db_edge)
                edge_count += 1

        await db.flush()
        logger.info(f"Stored {edge_count} edges")

    async def _store_commits(
        self, db: AsyncSession, repo_id: int, commits: list
    ) -> None:
        """Store commit data in the database."""
        for commit_info in commits:
            commit = Commit(
                repo_id=repo_id,
                sha=commit_info.sha,
                author_name=commit_info.author_name,
                author_email=commit_info.author_email,
                message=commit_info.message,
                committed_at=commit_info.committed_at,
                files_changed=commit_info.files_changed,
                insertions=commit_info.insertions,
                deletions=commit_info.deletions,
                linked_issue=commit_info.linked_issue,
                linked_pr=commit_info.linked_pr,
            )
            db.add(commit)

        await db.flush()
        logger.info(f"Stored {len(commits)} commits")

    async def _generate_embeddings(
        self,
        db: AsyncSession,
        repo_id: int,
        graph: CodeGraph,
        symbol_id_map: dict[str, int],
    ) -> None:
        """Generate and store embeddings for all symbols.

        Only embeds symbols that are meaningful (functions, classes, methods)
        — skips modules and simple imports.
        """
        embeddable_types = {"class", "function", "method", "endpoint", "interface"}
        symbols_to_embed: list[tuple[str, int, str]] = []  # (qualified_name, db_id, text)

        for node in graph.nodes.values():
            if node.symbol_type not in embeddable_types:
                continue
            db_id = symbol_id_map.get(node.id)
            if not db_id:
                continue

            text = self.embedding_service.build_embedding_text(
                {
                    "name": node.label,
                    "qualified_name": node.id,
                    "symbol_type": node.symbol_type,
                    "signature": node.signature if hasattr(node, "signature") else None,
                    "docstring": node.docstring,
                    "file_path": node.file_path,
                }
            )
            symbols_to_embed.append((node.id, db_id, text))

        if not symbols_to_embed:
            logger.info("No symbols to embed")
            return

        # Generate embeddings in batches
        texts = [s[2] for s in symbols_to_embed]
        try:
            embeddings = await self.embedding_service.generate_batch(texts)
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Non-fatal — repo can still work without embeddings
            return

        # Store in DB
        for (qualified_name, db_id, text), embedding_vector in zip(
            symbols_to_embed, embeddings
        ):
            emb = Embedding(
                symbol_id=db_id,
                content=text[:5000],
                embedding=embedding_vector,
            )
            db.add(emb)

        await db.flush()
        logger.info(f"Stored {len(embeddings)} embeddings")
