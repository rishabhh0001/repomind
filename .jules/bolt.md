## 2024-05-24 - Optimizing Graph Serialization
**Learning:** Using `selectinload` for relationship properties (e.g. `Edge.source`, `Edge.target`) inside synchronous contexts can be redundant and inefficient if the related records (like `Symbol`s) are already being fetched. This adds unnecessary N+1 query overhead or MissingGreenlet errors in async SQLAlchemy.
**Action:** Instead of lazy-loading, pre-fetch all required records and use explicit O(1) dictionary mappings (e.g., `symbol_map = {s.id: s for s in symbols}`) in Python memory to resolve relationships.
