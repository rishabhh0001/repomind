"""Embedding pipeline — generates and stores vector embeddings for code.

Supports multiple embedding providers (Gemini, OpenAI, Ollama) and
stores vectors in PostgreSQL via pgvector with HNSW indexing.
"""

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Generate embeddings for code symbols."""

    def __init__(self) -> None:
        self.provider = settings.embedding_provider
        self.model = settings.embedding_model
        self.dimension = settings.embedding_dimension
        self._client = httpx.AsyncClient(timeout=60.0)

    async def generate(self, text: str) -> list[float]:
        """Generate an embedding for a single text."""
        if self.provider == "gemini":
            return await self._gemini_embed(text)
        elif self.provider == "openai":
            return await self._openai_embed(text)
        elif self.provider == "ollama":
            return await self._ollama_embed(text)
        else:
            raise ValueError(f"Unknown embedding provider: {self.provider}")

    async def generate_batch(self, texts: list[str], batch_size: int = 20) -> list[list[float]]:
        """Generate embeddings for multiple texts in batches."""
        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            if self.provider == "gemini":
                embeddings = await self._gemini_embed_batch(batch)
            elif self.provider == "openai":
                embeddings = await self._openai_embed_batch(batch)
            elif self.provider == "ollama":
                # Ollama doesn't support batch natively
                embeddings = []
                for text in batch:
                    emb = await self._ollama_embed(text)
                    embeddings.append(emb)
            else:
                raise ValueError(f"Unknown embedding provider: {self.provider}")

            all_embeddings.extend(embeddings)
            logger.info(f"Embedded batch {i // batch_size + 1}/{(len(texts) + batch_size - 1) // batch_size}")

        return all_embeddings

    def build_embedding_text(self, symbol: dict[str, Any]) -> str:
        """Build a rich text representation of a symbol for embedding.

        Includes: name, type, signature, docstring, and file context.
        This produces better embeddings than just embedding raw source code.
        """
        parts = []

        # Symbol identity
        parts.append(f"{symbol.get('symbol_type', 'symbol')}: {symbol.get('qualified_name', symbol.get('name', ''))}")

        # Signature
        if symbol.get("signature"):
            parts.append(f"Signature: {symbol['signature']}")

        # Docstring
        if symbol.get("docstring"):
            parts.append(f"Documentation: {symbol['docstring']}")

        # File context
        if symbol.get("file_path"):
            parts.append(f"File: {symbol['file_path']}")

        # Source code (truncated for embedding)
        if symbol.get("source_code"):
            source = symbol["source_code"]
            if len(source) > 2000:
                source = source[:2000] + "..."
            parts.append(f"Code:\n{source}")

        return "\n".join(parts)

    # ─── Provider Implementations ────────────────────────────────────────

    async def _gemini_embed(self, text: str) -> list[float]:
        """Generate embedding via Google Gemini API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent"
        response = await self._client.post(
            url,
            params={"key": settings.gemini_api_key},
            json={
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": text[:8000]}]},
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["embedding"]["values"]

    async def _gemini_embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embed via Gemini."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:batchEmbedContents"
        requests = [
            {
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": text[:8000]}]},
            }
            for text in texts
        ]
        response = await self._client.post(
            url,
            params={"key": settings.gemini_api_key},
            json={"requests": requests},
        )
        response.raise_for_status()
        data = response.json()
        return [emb["values"] for emb in data["embeddings"]]

    async def _openai_embed(self, text: str) -> list[float]:
        """Generate embedding via OpenAI API."""
        response = await self._client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": self.model,
                "input": text[:8000],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["embedding"]

    async def _openai_embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embed via OpenAI."""
        response = await self._client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": self.model,
                "input": [t[:8000] for t in texts],
            },
        )
        response.raise_for_status()
        data = response.json()
        return [d["embedding"] for d in data["data"]]

    async def _ollama_embed(self, text: str) -> list[float]:
        """Generate embedding via local Ollama."""
        response = await self._client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={
                "model": settings.ollama_model,
                "prompt": text[:8000],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["embedding"]

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
