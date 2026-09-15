## 2025-02-27 - Fast Graph Serialization
**Learning:** Using `selectinload` on SQLAlchemy relationships like `Edge.source` and `Edge.target` for large graph serialization is inefficient due to lazy-loading or overhead, even when batched. A much faster approach is to pre-fetch all symbols and map them in Python memory using O(1) dictionary lookups for their IDs.
**Action:** Avoid `selectinload` for massive graph traversal endpoints. Pre-fetch required nodes into an ID map and reconstruct edges in Python for up to 50%+ performance improvement.
