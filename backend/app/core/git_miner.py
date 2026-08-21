"""Git history miner — temporal code intelligence.

Uses PyDriller and GitPython to extract commit history, blame information,
and link commits to code symbols for temporal analysis.
"""

import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from pydriller import Repository as PyDrillerRepo
from git import Repo as GitRepo

logger = logging.getLogger(__name__)


# Patterns to extract issue/PR references from commit messages
ISSUE_PATTERNS = [
    re.compile(r"#(\d+)"),
    re.compile(r"(?:fix|fixes|close|closes|resolve|resolves)\s+#(\d+)", re.IGNORECASE),
    re.compile(r"(?:issue|bug|ticket)\s+#?(\d+)", re.IGNORECASE),
]

PR_PATTERNS = [
    re.compile(r"Merge pull request #(\d+)"),
    re.compile(r"\(#(\d+)\)$"),
]


class CommitInfo:
    """Structured commit information."""

    def __init__(
        self,
        sha: str,
        author_name: str | None,
        author_email: str | None,
        message: str | None,
        committed_at: datetime | None,
        files_changed: int = 0,
        insertions: int = 0,
        deletions: int = 0,
        linked_issue: str | None = None,
        linked_pr: str | None = None,
    ):
        self.sha = sha
        self.author_name = author_name
        self.author_email = author_email
        self.message = message
        self.committed_at = committed_at
        self.files_changed = files_changed
        self.insertions = insertions
        self.deletions = deletions
        self.linked_issue = linked_issue
        self.linked_pr = linked_pr


class FileBlame:
    """Blame information for a file region."""

    def __init__(
        self,
        file_path: str,
        line_start: int,
        line_end: int,
        commits: list[CommitInfo],
        introduction_commit: CommitInfo | None = None,
    ):
        self.file_path = file_path
        self.line_start = line_start
        self.line_end = line_end
        self.commits = commits
        self.introduction_commit = introduction_commit


class GitMiner:
    """Mines git history for temporal code intelligence."""

    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self._git_repo = GitRepo(repo_path)

    def mine_commits(self, max_commits: int = 5000) -> list[CommitInfo]:
        """Extract all commits from the repository.

        Uses PyDriller for rich commit metadata extraction.
        """
        commits: list[CommitInfo] = []

        try:
            for i, commit in enumerate(
                PyDrillerRepo(self.repo_path, order="reverse").traverse_commits()
            ):
                if i >= max_commits:
                    break

                message = commit.msg or ""

                # Extract linked issues/PRs
                linked_issue = self._extract_issue(message)
                linked_pr = self._extract_pr(message)

                commits.append(
                    CommitInfo(
                        sha=commit.hash,
                        author_name=commit.author.name if commit.author else None,
                        author_email=commit.author.email if commit.author else None,
                        message=message[:2000],  # Truncate very long messages
                        committed_at=commit.committer_date,
                        files_changed=commit.files,
                        insertions=commit.insertions,
                        deletions=commit.deletions,
                        linked_issue=linked_issue,
                        linked_pr=linked_pr,
                    )
                )
        except Exception as e:
            logger.error(f"Error mining commits: {e}")

        logger.info(f"Mined {len(commits)} commits")
        return commits

    def get_file_commits(self, file_path: str) -> list[CommitInfo]:
        """Get all commits that modified a specific file."""
        commits: list[CommitInfo] = []

        try:
            for commit in PyDrillerRepo(
                self.repo_path,
                filepath=file_path,
                order="reverse",
            ).traverse_commits():
                message = commit.msg or ""
                commits.append(
                    CommitInfo(
                        sha=commit.hash,
                        author_name=commit.author.name if commit.author else None,
                        author_email=commit.author.email if commit.author else None,
                        message=message[:2000],
                        committed_at=commit.committer_date,
                        files_changed=commit.files,
                        insertions=commit.insertions,
                        deletions=commit.deletions,
                        linked_issue=self._extract_issue(message),
                        linked_pr=self._extract_pr(message),
                    )
                )
        except Exception as e:
            logger.warning(f"Error getting commits for {file_path}: {e}")

        return commits

    def blame_lines(self, file_path: str, line_start: int, line_end: int) -> FileBlame:
        """Get blame information for a range of lines in a file.

        Returns the commits responsible for each line in the range.
        """
        commits_seen: dict[str, CommitInfo] = {}
        introduction_sha: str | None = None

        try:
            blame = self._git_repo.blame("HEAD", file_path)
            current_line = 1

            for commit, lines in blame:
                line_count = len(lines)
                blame_end = current_line + line_count - 1

                # Check if this blame entry overlaps with our range
                if current_line <= line_end and blame_end >= line_start:
                    sha = commit.hexsha
                    if sha not in commits_seen:
                        committed_at = commit.committed_datetime
                        if committed_at.tzinfo is None:
                            committed_at = committed_at.replace(tzinfo=timezone.utc)

                        message = commit.message or ""
                        commits_seen[sha] = CommitInfo(
                            sha=sha,
                            author_name=commit.author.name if commit.author else None,
                            author_email=commit.author.email if commit.author else None,
                            message=message[:2000],
                            committed_at=committed_at,
                            linked_issue=self._extract_issue(message),
                            linked_pr=self._extract_pr(message),
                        )

                    # The oldest commit is the introduction
                    if introduction_sha is None:
                        introduction_sha = sha
                    else:
                        existing = commits_seen[introduction_sha]
                        current = commits_seen[sha]
                        if (
                            current.committed_at
                            and existing.committed_at
                            and current.committed_at < existing.committed_at
                        ):
                            introduction_sha = sha

                current_line = blame_end + 1

        except Exception as e:
            logger.warning(f"Error blaming {file_path}:{line_start}-{line_end}: {e}")

        sorted_commits = sorted(
            commits_seen.values(),
            key=lambda c: c.committed_at or datetime.min.replace(tzinfo=timezone.utc),
        )

        return FileBlame(
            file_path=file_path,
            line_start=line_start,
            line_end=line_end,
            commits=sorted_commits,
            introduction_commit=commits_seen.get(introduction_sha) if introduction_sha else None,
        )

    def get_symbol_history(
        self, file_path: str, symbol_name: str, line_start: int, line_end: int
    ) -> dict:
        """Get the complete temporal history of a code symbol.

        Combines blame + file commits + modification analysis.
        Returns structured data for the "Why does this function exist?" feature.
        """
        # Get blame for the symbol's line range
        blame = self.blame_lines(file_path, line_start, line_end)

        # Get all commits that touched this file
        file_commits = self.get_file_commits(file_path)

        # Calculate risk score based on churn
        modification_count = len(blame.commits)
        unique_authors = len(set(c.author_email for c in blame.commits if c.author_email))
        recency_days = 0
        if blame.commits:
            latest = max(
                (c.committed_at for c in blame.commits if c.committed_at),
                default=None,
            )
            if latest:
                recency_days = (datetime.now(timezone.utc) - latest).days

        # Risk score: high churn + many authors + recent changes = higher risk
        risk_score = min(1.0, (modification_count * 0.1) + (unique_authors * 0.15))
        if recency_days < 30:
            risk_score = min(1.0, risk_score + 0.2)

        return {
            "symbol_name": symbol_name,
            "file_path": file_path,
            "introduction": (
                {
                    "sha": blame.introduction_commit.sha,
                    "author": blame.introduction_commit.author_name,
                    "message": blame.introduction_commit.message,
                    "date": (
                        blame.introduction_commit.committed_at.isoformat()
                        if blame.introduction_commit.committed_at
                        else None
                    ),
                    "linked_issue": blame.introduction_commit.linked_issue,
                }
                if blame.introduction_commit
                else None
            ),
            "modification_count": modification_count,
            "unique_authors": unique_authors,
            "commits": [
                {
                    "sha": c.sha,
                    "author": c.author_name,
                    "message": c.message,
                    "date": c.committed_at.isoformat() if c.committed_at else None,
                    "linked_issue": c.linked_issue,
                    "linked_pr": c.linked_pr,
                }
                for c in blame.commits
            ],
            "risk_score": round(risk_score, 2),
        }

    def _extract_issue(self, message: str) -> str | None:
        """Extract issue reference from a commit message."""
        for pattern in ISSUE_PATTERNS:
            match = pattern.search(message)
            if match:
                return f"#{match.group(1)}"
        return None

    def _extract_pr(self, message: str) -> str | None:
        """Extract PR reference from a commit message."""
        for pattern in PR_PATTERNS:
            match = pattern.search(message)
            if match:
                return f"#{match.group(1)}"
        return None
