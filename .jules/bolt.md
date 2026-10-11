## 2024-05-24 - React Flow Performance
**Learning:** React Flow nodes default to frequent re-renders during zoom/pan events on the canvas, even if their data doesn't change.
**Action:** Always wrap custom node components in `React.memo` when using `@xyflow/react` to prevent significant performance degradation on large graphs.
