## 2024-05-14 - Optimize Graph Serialization in FastAPI
**Learning:** During graph serialization for RepoMind, lazy-loading relationship properties (like `selectinload` for `Edge.source` or `Symbol.parent`) inside synchronous list comprehensions causes N+1 query overhead and `MissingGreenlet` errors in SQLAlchemy's async setup.
**Action:** Always avoid `selectinload` for serializing large graphs. Instead, pre-fetch records and use explicit O(1) in-memory dictionaries mapping IDs to attributes (e.g. `symbol_id -> qualified_name`) to reconstruct node hierarchies and edges efficiently.
