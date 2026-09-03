## 2024-05-24 - ReactMarkdown Re-render Optimization
**Learning:** Passing inline arrays and objects to ReactMarkdown causes expensive re-renders on every parent state change (like a chat input keystroke).
**Action:** Always extract configuration objects (plugins, components) outside the component or wrap them in useMemo.

## 2024-05-24 - React Flow Custom Node Memoization
**Learning:** Custom nodes in React Flow re-render during panning and zooming if not memoized, causing significant performance issues on large graphs.
**Action:** Always wrap custom nodes with React.memo() as recommended by React Flow best practices.
