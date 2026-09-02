## 2024-05-14 - N+1 Issue in CodeGraph Component
**Learning:** The `get_graph` endpoint in `backend/app/api/graph.py` eager loads `Edge.source` and `Edge.target` symbols, which is causing slow performance because of N+1 issues when parsing edges for a large repository. This could be slow.
**Action:** The solution could be not to load `Edge.source` and `Edge.target` if we are already getting the symbols and can map them manually, or it could be optimized in the `CodeGraph` component using `React.memo` to avoid re-rendering.
