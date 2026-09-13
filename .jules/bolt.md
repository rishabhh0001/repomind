## 2024-09-13 - [Optimize Large Graph Serialization with In-Memory Mappings]
**Learning:** `selectinload` can be inefficient for large graph serializations involving thousands of edges because of object tracking and overhead in creating the relationships dynamically.
**Action:** When serializing thousands of objects with parent/source/target connections from the same dataset (where all rows have already been loaded into memory), use an explicit O(1) dictionary mapping rather than relying on SQLAlchemy relationship loading.
